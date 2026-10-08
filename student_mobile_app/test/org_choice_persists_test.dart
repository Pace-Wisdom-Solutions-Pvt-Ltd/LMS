// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Choosing an organization has to survive the launch that asked.
//
// The splash asks when `needsOrgChoice` — several memberships and none in
// scope — and it used to answer by refreshing the brand and nothing else.
// Refreshing the brand only caches how the organization *looks*: `_orgId` was
// never set and never written, so the next launch asked again, wearing the
// logo of the organization it was refusing to remember. Profile hid its
// organization row at the same time, because that row renders on `currentOrg`.
//
// These tests drive `SessionProvider` directly: what has to persist is its
// state, not which screen collected the answer.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  late Directory tempDir;

  LoginSuccess loginWithThreeOrgs() => LoginSuccess(
    user: const AppUser(id: 'u1', email: 'sara@acme.edu'),
    accessToken: 'a',
    refreshToken: 'r',
    organizations: const <OrgMembership>[
      OrgMembership(orgId: 1, orgName: 'Acme Academy', role: 'student'),
      OrgMembership(orgId: 2, orgName: 'Globex Institute', role: 'student'),
      OrgMembership(orgId: 3, orgName: 'Initech Tech School', role: 'student'),
    ],
  );

  /// A fresh provider over the same Hive boxes — what the next launch builds.
  Future<SessionProvider> relaunch() async {
    AuthTokenStore.load();
    final SessionProvider next = SessionProvider();
    await next.hydrate();
    return next;
  }

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_org_choice_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    await HiveStorage.clearAllBoxes();
    AuthTokenStore.load();
  });

  test('a pick survives the relaunch that asked for it', () async {
    final SessionProvider session = SessionProvider();
    await session.startSession(loginWithThreeOrgs());

    expect(
      session.needsOrgChoice,
      isTrue,
      reason: 'three memberships, none chosen — this is what asks',
    );

    await session.selectOrg(2);

    final SessionProvider next = await relaunch();
    expect(next.orgId, 2);
    expect(next.needsOrgChoice, isFalse, reason: 'asking again is the bug');
    expect(next.currentOrg?.orgName, 'Globex Institute');
  });

  test('without the pick, the next launch has to ask', () async {
    final SessionProvider session = SessionProvider();
    await session.startSession(loginWithThreeOrgs());

    // Exactly what the splash used to do: brand only, no `selectOrg`.
    final SessionProvider next = await relaunch();

    expect(next.needsOrgChoice, isTrue);
    expect(next.orgId, isNull);
  });

  test('Profile can only offer the row once an org is in scope', () async {
    final SessionProvider session = SessionProvider();
    await session.startSession(loginWithThreeOrgs());

    // `ProfileScreen` renders its organization row `if (org != null)`, and
    // makes it tappable on `canSwitchOrg`. Both have to hold.
    expect(session.currentOrg, isNull, reason: 'nothing to name yet');

    await session.selectOrg(3);

    expect(session.currentOrg, isNotNull);
    expect(session.canSwitchOrg, isTrue);
  });

  test('the memberships survive the relaunch too', () async {
    final SessionProvider session = SessionProvider();
    await session.startSession(loginWithThreeOrgs());
    await session.selectOrg(1);

    final SessionProvider next = await relaunch();

    expect(next.organizations, hasLength(3));
    expect(
      next.canSwitchOrg,
      isTrue,
      reason: 'the switch option is offered on the restored list',
    );
  });
}
