// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// What a rejected sign-in tells the learner.
//
// One rule, and it replaced a pile of client-side classification: **the server's
// message is shown verbatim, in a snackbar.** The view model does not decide
// whether a failure belongs on the email field, the password field or in a card,
// and it does not guess from the status code or the wording whether an admin is
// involved. It used to, and the guess was wrong often enough that the form shook
// with nothing to read at all.
//
// Local validation still writes field errors — that part is the client's job.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/config/l10n/app_localizations/app_localizations_en.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;
  final FakeApi api = FakeApi();
  final AppLocalizations l10n = AppLocalizationsEn();

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_signin_err_');
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

  setUp(() => api.reset());

  /// Fills valid-looking credentials and submits against a canned rejection.
  Future<SignInViewModel> reject({
    required int status,
    required Object? body,
  }) async {
    api.on(ApiEndPoints.login, status: status, body: body);

    final SignInViewModel vm = SignInViewModel();
    vm.onEmailChanged(l10n, 'learner@example.com');
    vm.onPasswordChanged(l10n, 'wrong-password');
    await vm.signIn(l10n);
    return vm;
  }

  group('the server\'s message reaches the learner', () {
    test('DRF non_field_errors', () async {
      final SignInViewModel vm = await reject(
        status: 400,
        body: <String, dynamic>{
          'non_field_errors': <String>[
            'Unable to log in with the provided credentials.',
          ],
        },
      );

      expect(
        vm.errorMessage,
        'Unable to log in with the provided credentials.',
      );
    });

    test('a detail string', () async {
      final SignInViewModel vm = await reject(
        status: 400,
        body: <String, dynamic>{'detail': 'Email or password is incorrect.'},
      );

      expect(vm.errorMessage, 'Email or password is incorrect.');
    });

    test('a field-named serializer error', () async {
      final SignInViewModel vm = await reject(
        status: 400,
        body: <String, dynamic>{
          'email': <String>['Enter a valid email address.'],
        },
      );

      expect(vm.errorMessage, 'Enter a valid email address.');
      expect(
        vm.emailError,
        isNull,
        reason: 'server errors go to the snackbar, not onto a field',
      );
    });

    test('a 403 reads the same way as anything else', () async {
      final SignInViewModel vm = await reject(
        status: 403,
        body: <String, dynamic>{'detail': 'This account is inactive.'},
      );

      expect(vm.errorMessage, 'This account is inactive.');
    });

    test('a 500 still says something', () async {
      final SignInViewModel vm = await reject(status: 500, body: null);
      expect(vm.errorMessage.trim(), isNotEmpty);
    });

    test('every rejection ends in the error state, shaken', () async {
      for (final int status in <int>[400, 401, 403, 500]) {
        final SignInViewModel vm = await reject(
          status: status,
          body: <String, dynamic>{'detail': 'No.'},
        );
        expect(vm.state, ViewState.error, reason: 'status $status');
        expect(vm.shakeToken, 1, reason: 'status $status');
        expect(vm.errorMessage.trim(), isNotEmpty, reason: 'status $status');
      }
    });
  });

  group('local validation is still the client\'s job', () {
    test('a malformed email never reaches the network', () async {
      api.on(ApiEndPoints.login, status: 200, body: <String, dynamic>{});

      final SignInViewModel vm = SignInViewModel();
      vm.onEmailChanged(l10n, 'not-an-email');
      vm.onPasswordChanged(l10n, 'something');
      await vm.signIn(l10n);

      expect(vm.emailError, l10n.emailInvalid);
      expect(vm.shakeToken, 1);
      expect(api.hit(ApiEndPoints.login), isFalse);
    });

    test('a field error clears as soon as it is fixed', () async {
      final SignInViewModel vm = SignInViewModel();
      vm.onEmailChanged(l10n, 'not-an-email');
      await vm.signIn(l10n);
      expect(vm.emailError, isNotNull);

      vm.onEmailChanged(l10n, 'learner@example.com');
      expect(vm.emailError, isNull);
    });
  });
}
