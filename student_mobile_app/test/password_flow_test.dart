// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Forgot password, and the reset it leads to.
//
// Forgot password is its own screen now: whoever needs it mistyped a password,
// so the address on the sign-in form is as likely to be wrong as right, and the
// old inline button sent whatever happened to be in that field.
//
// Reset password is built but **unreachable from inside the app** — its token
// only arrives in an email, and those links open the web app until deep links
// are registered. These tests are what make turning it on later a routing
// change rather than a feature.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  late AppLocalizations strings;
  final FakeApi api = FakeApi();

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_password_');
    Hive.init(tempDir.path);
    for (final String box in HSBox.all) {
      await Hive.openBox<dynamic>(box);
    }
    api.install();
    strings = await AppLocalizations.delegate.load(const Locale('en'));
  });

  tearDownAll(() async {
    await Hive.close();
    await tempDir.delete(recursive: true);
  });

  setUp(() async {
    api.reset();
    await HiveStorage.clearAllBoxes();
  });

  group('forgot password', () {
    test('will not send until the address looks like one', () async {
      final ForgotPasswordViewModel vm = ForgotPasswordViewModel();
      addTearDown(vm.dispose);

      vm.onEmailChanged(strings, 'not-an-email');
      expect(vm.canSubmit, isFalse);
      expect(await vm.submit(strings), isFalse);
      expect(
        api.hit(ApiEndPoints.forgotPassword),
        isFalse,
        reason: 'a doomed request is not worth the round trip',
      );

      vm.onEmailChanged(strings, 'learner@example.com');
      expect(vm.canSubmit, isTrue);
    });

    test('an error is never shown before the field is touched', () async {
      final ForgotPasswordViewModel vm = ForgotPasswordViewModel();
      addTearDown(vm.dispose);

      vm.onEmailChanged(strings, 'x');
      expect(vm.visibleEmailError, isNull, reason: 'still mid-word');

      vm.onEmailBlur(strings);
      expect(vm.visibleEmailError, strings.emailInvalid);
    });

    test('says the same thing whether or not the account exists', () async {
      // The endpoint is documented not to reveal that, so this screen must
      // not either — otherwise it becomes a way to discover addresses.
      api.on(
        ApiEndPoints.forgotPassword,
        status: 400,
        body: <String, dynamic>{'detail': 'No user with that email.'},
      );

      final ForgotPasswordViewModel vm = ForgotPasswordViewModel();
      addTearDown(vm.dispose);
      vm.onEmailChanged(strings, 'nobody@example.com');

      expect(await vm.submit(strings), isTrue);
      expect(vm.sent, isTrue);
      expect(vm.state, ViewState.success);
    });
  });

  group('reset password', () {
    const String token = 'signed-token-from-the-email';

    Map<String, dynamic> sessionBody() => <String, dynamic>{
      'access': 'access-token',
      'refresh': 'refresh-token',
      'user': <String, dynamic>{
        'id': 'u1',
        'email': 'learner@example.com',
        'organizations': <dynamic>[
          <String, dynamic>{'org_id': 2, 'name': 'Demo', 'role': 'student'},
        ],
      },
    };

    test('a link with no token offers no form at all', () {
      final ResetPasswordViewModel vm = ResetPasswordViewModel(token: '');
      addTearDown(vm.dispose);

      expect(vm.hasToken, isFalse);
      expect(vm.canSubmit, isFalse, reason: 'nothing typed could be accepted');
    });

    test('the two passwords have to match, and clear the length bar', () async {
      final ResetPasswordViewModel vm = ResetPasswordViewModel(token: token);
      addTearDown(vm.dispose);

      vm.onPasswordChanged(strings, 'short');
      vm.onConfirmChanged(strings, 'short');
      vm.touchPassword(strings);
      expect(
        vm.visiblePasswordError,
        strings.passwordTooShort(ResetPasswordViewModel.minLength),
      );

      vm.onPasswordChanged(strings, 'long-enough-1');
      vm.onConfirmChanged(strings, 'long-enough-2');
      vm.touchConfirm(strings);
      expect(vm.visibleConfirmError, strings.passwordsDoNotMatch);

      vm.onConfirmChanged(strings, 'long-enough-1');
      expect(vm.canSubmit, isTrue);
    });

    test('sends the token and the new password, and nothing else', () async {
      api.on(ApiEndPoints.resetPassword, status: 200, body: sessionBody());

      final ResetPasswordViewModel vm = ResetPasswordViewModel(token: token);
      addTearDown(vm.dispose);
      vm.onPasswordChanged(strings, 'a-good-password');
      vm.onConfirmChanged(strings, 'a-good-password');

      expect(await vm.submit(strings), isTrue);
      expect(vm.succeeded, isTrue);

      final RequestOptions? sent = api.requestFor(ApiEndPoints.resetPassword);
      expect(sent?.data, <String, dynamic>{
        'token': token,
        'password': 'a-good-password',
      });
    });

    test('the session the backend offers is declined, not stored', () async {
      // The reply carries a working token pair. Taking it would sign the
      // learner in off a link; the flow ends at the sign-in form instead, so
      // the new password gets used once and a reset on a borrowed device
      // leaves nothing behind.
      api.on(ApiEndPoints.resetPassword, status: 200, body: sessionBody());

      final ResetPasswordViewModel vm = ResetPasswordViewModel(token: token);
      addTearDown(vm.dispose);
      vm.onPasswordChanged(strings, 'a-good-password');
      vm.onConfirmChanged(strings, 'a-good-password');
      await vm.submit(strings);

      expect(AuthTokenStore.accessToken, isNull);
      expect(HiveStorage.get<String>(HSKeys.accessToken), isNull);
      expect(HiveStorage.get<String>(HSKeys.user), isNull);
    });

    test('a spent link says so in words a learner can act on', () async {
      api.on(
        ApiEndPoints.resetPassword,
        status: 400,
        body: <String, dynamic>{'detail': 'Invalid token.'},
      );

      final ResetPasswordViewModel vm = ResetPasswordViewModel(token: token);
      addTearDown(vm.dispose);
      vm.onPasswordChanged(strings, 'a-good-password');
      vm.onConfirmChanged(strings, 'a-good-password');

      expect(await vm.submit(strings), isFalse);
      expect(vm.formMessage, strings.resetTokenInvalid);
    });
  });
}
