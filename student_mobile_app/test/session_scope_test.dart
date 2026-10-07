// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// What an organization switch has to throw away.
//
// Every student endpoint is scoped by `org_id`, so switching org while the
// dashboard, course list and progress are already loaded means all of it
// belongs to the wrong tenant. `MyApp` keys the session provider tier on
// `SessionProvider.sessionKey`, so the contract these tests pin is simple: the
// key must change when the org does, or the old org's data survives the
// switch.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  late Directory tempDir;

  const AppUser user = AppUser(id: 'u-1', email: 'learner@example.com');
  const List<OrgMembership> memberships = <OrgMembership>[
    OrgMembership(orgId: 2, orgName: 'Demo Academy', role: 'student'),
    OrgMembership(orgId: 7, orgName: 'Other Corp', role: 'teacher'),
  ];

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    tempDir = await Directory.systemTemp.createTemp('lms_scope_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() => HiveStorage.clearAllBoxes());

  Future<SessionProvider> signedIn() async {
    final SessionProvider session = SessionProvider();
    await session.startSession(
      const LoginSuccess(
        user: user,
        accessToken: 'a',
        refreshToken: 'r',
        organizations: memberships,
      ),
    );
    return session;
  }

  test('the session key changes when the organization does', () async {
    final SessionProvider session = await signedIn();

    await session.selectOrg(2);
    final String first = session.sessionKey;

    await session.selectOrg(7);
    expect(
      session.sessionKey,
      isNot(first),
      reason: 'an unchanged key leaves the previous org data mounted',
    );
  });

  test('the same organization keeps the same key', () async {
    final SessionProvider session = await signedIn();

    await session.selectOrg(2);
    final String key = session.sessionKey;
    await session.selectOrg(2);

    expect(
      session.sessionKey,
      key,
      reason: 'reselecting must not tear the tabs down for nothing',
    );
  });

  test('the key still changes between accounts', () async {
    final SessionProvider session = await signedIn();
    await session.selectOrg(2);
    final String signedInKey = session.sessionKey;

    await session.clearSession();
    expect(session.sessionKey, isNot(signedInKey));
  });

  test('a refused organization leaves the key alone', () async {
    final SessionProvider session = await signedIn();
    await session.selectOrg(2);
    final String key = session.sessionKey;

    expect(await session.selectOrg(999), isFalse);
    expect(session.sessionKey, key);
  });

  group('role labels', () {
    test('Profile prints the account roles, glossary-named and sorted', () {
      expect(RoleLabels.forAll(<String>['teacher', 'student']), <String>[
        'Student',
        'Trainer',
      ], reason: 'the glossary is binding on UI copy — never "Teacher"');
    });

    test('are de-duplicated and tolerant of casing and padding', () {
      expect(
        RoleLabels.forAll(<String>[' Student ', 'STUDENT', 'trainer', '']),
        <String>['Student', 'Trainer'],
      );
    });

    test('an unknown role is humanised rather than dropped', () {
      expect(RoleLabels.of('org_admin'), 'Admin');
      expect(RoleLabels.of('content_author'), 'Content author');
    });

    test('a membership labels the roles held in that org', () {
      const OrgMembership both = OrgMembership(
        orgId: 1,
        orgName: 'Acme',
        role: 'teacher',
        roles: <String>['student', 'teacher'],
      );

      expect(both.roleLabels, <String>['Student', 'Trainer']);
      expect(both.roleLabel, 'Student · Trainer');
    });
  });

  group('organization names', () {
    test('are read under every spelling the API uses', () {
      for (final String key in <String>[
        'name',
        'org_name',
        'organization_name',
      ]) {
        expect(
          OrgMembership.fromJson(<String, dynamic>{
            'org_id': 2,
            key: 'Demo Academy',
            'role': 'student',
          }).orgName,
          'Demo Academy',
          reason: 'a blank name here empties the picker and Profile',
        );
      }
    });

    test('degrade to something identifiable when absent entirely', () {
      final OrgMembership nameless = OrgMembership.fromJson(<String, dynamic>{
        'org_id': 7,
        'role': 'student',
      });

      expect(nameless.orgName, isEmpty);
      expect(
        nameless.displayName,
        'Organization 7',
        reason: 'two nameless orgs in the picker must still be tellable apart',
      );
    });

    test('survive the round trip through storage', () async {
      final SessionProvider session = await signedIn();
      await session.selectOrg(2);

      final SessionProvider reloaded = SessionProvider();
      await reloaded.hydrate();

      expect(
        reloaded.organizations.map((OrgMembership o) => o.orgName),
        containsAll(<String>['Demo Academy', 'Other Corp']),
      );
    });
  });

  test('the version falls back rather than printing nothing', () {
    // The platform channel is unavailable in unit tests, so this is the real
    // path a failed lookup takes.
    expect(AppInfo.versionName, isNotEmpty);
  });
}
