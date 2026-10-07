// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Sign-in and organization scoping.
//
// **There is no role gate.** `POST /api/auth/login/` admits every role and so
// does this app: a trainer, a manager or an admin signs in and gets the learner
// UI, where the student-scoped endpoints return empty results for them. These
// tests pin that down, so nobody reintroduces a gate by accident — and pin the
// one rule that remains: the app can only ever scope itself to an organization
// the account actually belongs to.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  const AuthRepository repo = AuthRepository();

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_auth_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    api.reset();
    await AuthTokenStore.clear();
    AppInterceptor.resetRefreshLock();
  });

  group('admits every role', () {
    test('a learner', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: loginBody(
          organizations: <Map<String, dynamic>>[
            org(2, 'Demo Academy', 'student'),
          ],
        ),
      );

      final LoginSuccess s =
          await repo.login(email: 'l@x.com', password: 'pw') as LoginSuccess;
      expect(s.organizations.single.orgId, 2);
      expect(s.organizations.single.orgName, 'Demo Academy');
      expect(s.needsOrgChoice, isFalse);
    });

    test(
      'memberships come from user.organizations, never the top level',
      () async {
        api.on(
          ApiEndPoints.login,
          status: 200,
          body: loginBody(
            organizations: <Map<String, dynamic>>[
              org(2, 'Demo Academy', 'student'),
            ],
          ),
        );

        final LoginSuccess s =
            await repo.login(email: 'l@x.com', password: 'pw') as LoginSuccess;

        // loginBody() puts a different, decoy list at the top level. Reading it
        // would show up here as an org 999 that the account does not have.
        expect(s.organizations.map((OrgMembership o) => o.orgId), <int>[2]);
        expect(
          s.organizations.any((OrgMembership o) => o.orgId == 999),
          isFalse,
          reason: 'the top-level organizations[] must never be read',
        );
        expect(s.organizations.single.orgName, 'Demo Academy');
      },
    );

    test('a trainer, with no blacklist call and no rejection', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: loginBody(
          userRoles: <String>['teacher'],
          organizations: <Map<String, dynamic>>[
            org(2, 'Demo Academy', 'teacher'),
          ],
        ),
      );

      final LoginOutcome outcome = await repo.login(
        email: 't@x.com',
        password: 'pw',
      );

      expect(outcome, isA<LoginSuccess>());
      expect(
        api.hit(ApiEndPoints.logout),
        isFalse,
        reason: 'nothing is rejected, so no token is blacklisted on sign-in',
      );
    });

    test('a superuser', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: loginBody(
          isSuperuser: true,
          userRoles: <String>['admin'],
          organizations: <Map<String, dynamic>>[
            org(2, 'Demo Academy', 'admin'),
          ],
        ),
      );

      expect(
        await repo.login(email: 'root@x.com', password: 'pw'),
        isA<LoginSuccess>(),
      );
    });

    test('an account with no organizations at all', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: loginBody(organizations: <Map<String, dynamic>>[]),
      );

      final LoginSuccess s = await repo.login(
        email: 'nobody@x.com',
        password: 'pw',
      ) as LoginSuccess;
      expect(s.organizations, isEmpty);
      expect(s.needsOrgChoice, isFalse);
    });
  });

  group('organizations', () {
    test('keeps every membership, whatever the role', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: loginBody(
          userRoles: <String>['student', 'teacher'],
          organizations: <Map<String, dynamic>>[
            org(2, 'Demo Academy', 'student'),
            org(7, 'Other Corp', 'teacher'),
          ],
        ),
      );

      final LoginSuccess s =
          await repo.login(email: 'l@x.com', password: 'pw') as LoginSuccess;

      expect(s.organizations.map((OrgMembership o) => o.orgId), <int>[2, 7]);
      expect(s.needsOrgChoice, isTrue, reason: 'two orgs means a choice');
    });

    test('labels the roles held in each, using the glossary words', () {
      expect(
        OrgMembership.fromJson(org(2, 'A', 'student')).roleLabel,
        'Student',
      );
      // "Trainer", never "teacher" — the glossary is binding on UI copy.
      expect(
        OrgMembership.fromJson(org(7, 'B', 'teacher')).roleLabel,
        'Trainer',
      );
      expect(
        OrgMembership.fromJson(
          org(9, 'C', 'student', roles: <String>['student', 'teacher']),
        ).roleLabel,
        'Student · Trainer',
      );
    });

    test('merges role and roles[] rather than trusting either alone', () {
      final OrgMembership m = OrgMembership.fromJson(
        org(2, 'A', '', roles: <String>['student']),
      );
      expect(m.isStudent, isTrue);
      expect(m.roleLabel, 'Student');
    });
  });

  group('session scoping', () {
    test('orders learner organizations first', () async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: <OrgMembership>[
            OrgMembership.fromJson(org(7, 'Other Corp', 'teacher')),
            OrgMembership.fromJson(org(2, 'Demo Academy', 'student')),
          ],
        ),
      );

      expect(
        session.organizations.first.orgId,
        2,
        reason: 'the org the account learns in should be offered first',
      );
      expect(session.needsOrgChoice, isTrue);
      await session.clearSession();
    });

    test('a single organization is chosen without asking', () async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 't@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: <OrgMembership>[
            OrgMembership.fromJson(org(7, 'Other Corp', 'teacher')),
          ],
        ),
      );

      expect(
        session.orgId,
        7,
        reason: 'a trainer-only org is still selectable',
      );
      expect(session.needsOrgChoice, isFalse);
      await session.clearSession();
    });

    test('refuses an organization the account does not belong to', () async {
      final SessionProvider session = SessionProvider();
      await session.startSession(
        LoginSuccess(
          user: const AppUser(id: 'u1', email: 'l@x.com'),
          accessToken: 'a',
          refreshToken: 'r',
          organizations: <OrgMembership>[
            OrgMembership.fromJson(org(2, 'Demo Academy', 'student')),
            OrgMembership.fromJson(org(7, 'Other Corp', 'teacher')),
          ],
        ),
      );

      // A role the app does not use is still selectable…
      expect(await session.selectOrg(7), isTrue);
      // …but a tenant the account has nothing to do with is not.
      expect(await session.selectOrg(999), isFalse);
      expect(session.orgId, 7);
      await session.clearSession();
    });
  });

  group('surfaces failures', () {
    test('the server\'s own wording, whatever the status', () async {
      // Nothing branches on the status any more: the screen shows `message`
      // verbatim in a snackbar. The repository's job is to carry it through.
      for (final (int status, String detail) in <(int, String)>[
        (400, 'Invalid credentials.'),
        (403, 'Your account or organization is currently inactive.'),
        (500, 'Something exploded.'),
      ]) {
        api.on(
          ApiEndPoints.login,
          status: status,
          body: <String, dynamic>{'detail': detail},
        );

        final LoginFailure f =
            await repo.login(email: 'l@x.com', password: 'bad') as LoginFailure;
        expect(f.message, detail, reason: 'status $status');
        expect(f.statusCode, status);
      }
    });

    test('field errors from a DRF validation response', () async {
      api.on(
        ApiEndPoints.login,
        status: 400,
        body: <String, dynamic>{
          'email': <String>['Enter a valid email address.'],
        },
      );

      final LoginFailure f =
          await repo.login(email: 'nope', password: 'pw') as LoginFailure;
      expect(f.fieldErrors['email'], isNotEmpty);
    });

    test('a malformed 200 without pretending it succeeded', () async {
      api.on(
        ApiEndPoints.login,
        status: 200,
        body: <String, dynamic>{'access': ''},
      );
      expect(
        await repo.login(email: 'l@x.com', password: 'pw'),
        isA<LoginFailure>(),
      );
    });
  });
}
