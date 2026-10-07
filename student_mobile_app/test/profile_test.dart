// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// Profile editing and password change.
//
// The password change is the interesting one: a success blacklists every
// refresh token for the user, so the app's own session is dead the moment it
// returns. The screen has to sign out rather than carry on with tokens that
// will fail on the next request.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  late Directory tempDir;

  // Loaded through the delegate rather than naming the generated class, which
  // the barrel does not export.
  late AppLocalizations strings;
  final FakeApi api = FakeApi();

  const AppUser user = AppUser(
    id: 'b1f3f937-9999-4430-8ee7-6c7208897165',
    email: 'learner@example.com',
    firstName: 'Diya',
    lastName: 'Rao',
    phoneNumber: '',
  );

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
    tempDir = await Directory.systemTemp.createTemp('lms_profile_');
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

  setUp(() => api.reset());

  group('edit profile', () {
    test('is not saveable until something actually changed', () {
      final EditProfileViewModel vm = EditProfileViewModel(user: user);
      expect(vm.isDirty, isFalse);
      expect(vm.canSave, isFalse);

      vm.onPhoneChanged(strings, '9876543210');
      expect(vm.isDirty, isTrue);
      expect(vm.canSave, isTrue);
    });

    test('requires a first name', () {
      final EditProfileViewModel vm = EditProfileViewModel(user: user);
      vm.onFirstNameChanged(strings, '');
      vm.onFirstNameBlur(strings);

      expect(vm.visibleFirstNameError, isNotNull);
      expect(vm.canSave, isFalse);
    });

    test('accepts an empty phone but rejects a malformed one', () {
      final EditProfileViewModel vm = EditProfileViewModel(user: user);

      vm.onPhoneChanged(strings, 'not-a-number');
      vm.onPhoneBlur(strings);
      expect(vm.visiblePhoneError, isNotNull);

      vm.onPhoneChanged(strings, '');
      expect(vm.phoneError, isNull, reason: 'phone is optional');
    });

    test('sends only the fields that changed', () async {
      api.on(
        ApiEndPoints.user(user.id),
        status: 200,
        body: <String, dynamic>{
          'first_name': 'Diya',
          'last_name': 'Rao',
          'phone_number': '9876543210',
        },
      );

      final EditProfileViewModel vm = EditProfileViewModel(user: user);
      vm.onPhoneChanged(strings, '9876543210');
      final AppUser? updated = await vm.save(strings);

      expect(updated?.phoneNumber, '9876543210');
      final RequestOptions sent = api.requestFor(ApiEndPoints.user(user.id))!;
      expect(sent.method, 'PATCH');
      expect((sent.data as Map<String, dynamic>)['phone_number'], '9876543210');
    });

    test('surfaces a server rejection instead of claiming success', () async {
      api.on(
        ApiEndPoints.user(user.id),
        status: 400,
        body: <String, dynamic>{
          'phone_number': <String>['Enter a valid phone number.'],
        },
      );

      final EditProfileViewModel vm = EditProfileViewModel(user: user);
      vm.onPhoneChanged(strings, '9876543210');

      expect(await vm.save(strings), isNull);
      expect(vm.state, ViewState.error);
    });
  });

  group('change password', () {
    test('refuses a mismatched confirmation', () {
      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'old-password');
      vm.onNextChanged(strings, 'new-password-1');
      vm.onConfirmChanged(strings, 'new-password-2');

      expect(vm.confirmError, isNotNull);
      expect(vm.canSubmit, isFalse);
    });

    test('refuses a new password that is too short', () {
      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'old-password');
      vm.onNextChanged(strings, 'short');
      vm.onConfirmChanged(strings, 'short');

      expect(vm.nextError, isNotNull);
      expect(vm.canSubmit, isFalse);
    });

    test('refuses reusing the current password', () {
      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'same-password');
      vm.onNextChanged(strings, 'same-password');
      vm.onConfirmChanged(strings, 'same-password');

      expect(vm.nextError, isNotNull);
    });

    test('sends the field names the backend expects', () async {
      api.on(
        ApiEndPoints.changePassword,
        status: 200,
        body: <String, dynamic>{'detail': 'Password updated.'},
      );

      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'old-password');
      vm.onNextChanged(strings, 'new-password');
      vm.onConfirmChanged(strings, 'new-password');

      expect(await vm.submit(strings), isTrue);
      expect(
        vm.succeeded,
        isTrue,
        reason: 'the screen reads this to know it must sign out',
      );

      final Map<String, dynamic> body =
          api.requestFor(ApiEndPoints.changePassword)!.data
              as Map<String, dynamic>;
      expect(
        body.keys,
        containsAll(<String>[
          'current_password',
          'new_password',
          'confirm_password',
        ]),
      );
    });

    test('surfaces a wrong current password for the snackbar', () async {
      api.on(
        ApiEndPoints.changePassword,
        status: 400,
        body: <String, dynamic>{
          'current_password': <String>['Incorrect password.'],
        },
      );

      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'wrong');
      vm.onNextChanged(strings, 'new-password');
      vm.onConfirmChanged(strings, 'new-password');

      expect(await vm.submit(strings), isFalse);
      expect(vm.succeeded, isFalse);
      // The screen reads this and shows it verbatim — the shake alone left the
      // learner with no idea which credential the server rejected.
      expect(vm.errorMessage, 'Incorrect password.');
      expect(vm.state, ViewState.error);
    });

    test('a detail-only rejection still reaches the snackbar', () async {
      api.on(
        ApiEndPoints.changePassword,
        status: 400,
        body: <String, dynamic>{'detail': 'Current password is incorrect.'},
      );

      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'wrong');
      vm.onNextChanged(strings, 'new-password');
      vm.onConfirmChanged(strings, 'new-password');

      expect(await vm.submit(strings), isFalse);
      expect(vm.errorMessage, 'Current password is incorrect.');
    });

    test('a local rule carries no server message into the snackbar', () async {
      api.on(
        ApiEndPoints.changePassword,
        status: 400,
        body: <String, dynamic>{'detail': 'Current password is incorrect.'},
      );

      final ChangePasswordViewModel vm = ChangePasswordViewModel();
      vm.onCurrentChanged(strings, 'wrong');
      vm.onNextChanged(strings, 'new-password');
      vm.onConfirmChanged(strings, 'new-password');
      expect(await vm.submit(strings), isFalse);
      expect(vm.errorMessage, isNotEmpty);

      // Now break a local rule. The rejection above must not be shown again as
      // though the server had just answered.
      vm.onConfirmChanged(strings, 'does-not-match');

      expect(await vm.submit(strings), isFalse);
      expect(vm.confirmError, isNotNull);
      expect(vm.errorMessage, isEmpty);
    });
  });

  group('learning material', () {
    test('recognises YouTube from both url shapes', () {
      LearningMaterial of(String url) => LearningMaterial.fromJson(
        <String, dynamic>{'id': 1, 'content_type': 'Video', 'content_url': url},
      );

      expect(
        of('https://www.youtube.com/watch?v=kqtD5dpn9C8').isYouTube,
        isTrue,
      );
      expect(of('https://youtu.be/kqtD5dpn9C8').isYouTube, isTrue);
      expect(of('https://example.com/video.mp4').isYouTube, isFalse);
      expect(of('https://example.com/video.mp4').isVideo, isTrue);
    });
  });
}
