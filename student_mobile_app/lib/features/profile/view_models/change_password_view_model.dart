// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Changing the password.
///
/// **A successful change ends every session**: the backend blacklists all of
/// the user's refresh tokens, so this device's tokens are dead the moment it
/// returns. [succeeded] tells the screen to sign out and send the learner back
/// to sign-in with the new password — anything else would leave the app
/// holding tokens that fail on the next request.
///
/// Local rules (empty, too short, mismatched) answer on the fields themselves.
/// A rejection from the server is one sentence in [errorMessage] for the screen
/// to put in a snackbar, verbatim — the same bargain the sign-in screen makes.
class ChangePasswordViewModel extends BaseProvider {
  ChangePasswordViewModel({AuthRepository? auth})
    : _auth = auth ?? const AuthRepository();

  final AuthRepository _auth;

  /// The backend's own minimum. Kept here so the learner is told before a
  /// round trip rather than after one.
  static const int minLength = 8;

  String current = '';
  String next = '';
  String confirm = '';

  String? currentError;
  String? nextError;
  String? confirmError;

  bool succeeded = false;
  int shakeToken = 0;

  bool _currentTouched = false;
  bool _nextTouched = false;
  bool _confirmTouched = false;

  String? get visibleCurrentError => _currentTouched ? currentError : null;
  String? get visibleNextError => _nextTouched ? nextError : null;
  String? get visibleConfirmError => _confirmTouched ? confirmError : null;

  bool get canSubmit =>
      !isBusy &&
      current.isNotEmpty &&
      next.isNotEmpty &&
      confirm.isNotEmpty &&
      currentError == null &&
      nextError == null &&
      confirmError == null;

  void onCurrentChanged(AppLocalizations l10n, String v) {
    current = v;
    _validate(l10n);
    notifyListeners();
  }

  void onNextChanged(AppLocalizations l10n, String v) {
    next = v;
    _validate(l10n);
    notifyListeners();
  }

  void onConfirmChanged(AppLocalizations l10n, String v) {
    confirm = v;
    _validate(l10n);
    notifyListeners();
  }

  void touchCurrent(AppLocalizations l10n) {
    _currentTouched = true;
    _validate(l10n);
    notifyListeners();
  }

  void touchNext(AppLocalizations l10n) {
    _nextTouched = true;
    _validate(l10n);
    notifyListeners();
  }

  void touchConfirm(AppLocalizations l10n) {
    _confirmTouched = true;
    _validate(l10n);
    notifyListeners();
  }

  void _validate(AppLocalizations l10n) {
    currentError = current.isEmpty ? l10n.passwordRequired : null;

    if (next.isEmpty) {
      nextError = l10n.passwordRequired;
    } else if (next.length < minLength) {
      nextError = l10n.passwordTooShort(minLength);
    } else if (next == current && current.isNotEmpty) {
      nextError = l10n.passwordSameAsCurrent;
    } else {
      nextError = null;
    }

    if (confirm.isEmpty) {
      confirmError = l10n.passwordRequired;
    } else if (confirm != next) {
      confirmError = l10n.passwordsDoNotMatch;
    } else {
      confirmError = null;
    }
  }

  Future<bool> submit(AppLocalizations l10n) async {
    _currentTouched = true;
    _nextTouched = true;
    _confirmTouched = true;
    _validate(l10n);

    if (currentError != null || nextError != null || confirmError != null) {
      shakeToken++;
      // Idle, not error: the fields are already saying what is wrong, and a
      // message left over from an earlier rejection must not reach the screen
      // as though the server had just sent it.
      setState(ViewState.idle);
      return false;
    }

    setState(ViewState.busy);
    final ApiResponse res = await _auth.changePassword(
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm,
    );

    if (!res.isSuccess) {
      // Whatever the server said, verbatim — a wrong current password included.
      // `fromErrorBody` has already reduced every DRF shape it answers with to
      // one sentence, so there is nothing left to classify into fields.
      shakeToken++;
      setState(ViewState.error, error: res.message);
      return false;
    }

    succeeded = true;
    setState(ViewState.success);
    return true;
  }
}
