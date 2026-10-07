// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Setting a new password from the link in a reset email.
///
/// **Nothing in the app can reach this yet.** The `token` arrives only in that
/// email, and those links open the web app until App Links / Universal Links
/// are registered (PRD R8). It is built and kept so that wiring the deep link
/// later is a routing change and nothing more.
///
/// The backend answers a reset with a **token pair and the user record**, the
/// same body login returns — so it is offering to sign the learner straight
/// in. **This app declines it and asks them to sign in.** Setting a password
/// and then immediately using it is the only proof that the right password was
/// set and remembered, it matches what a change-password does, and it means a
/// reset opened on a borrowed device cannot leave a session behind on it. The
/// issued tokens are never persisted; they expire unused.
class ResetPasswordViewModel extends BaseProvider {
  ResetPasswordViewModel({required this.token, AuthRepository? auth})
    : _auth = auth ?? const AuthRepository();

  /// The signed token from the email. Empty means the link was malformed —
  /// the screen says so instead of letting the learner type a password that
  /// cannot possibly be accepted.
  final String token;

  final AuthRepository _auth;

  /// The backend's own minimum, stated before a round trip rather than after.
  static const int minLength = 8;

  String password = '';
  String confirm = '';

  String? passwordError;
  String? confirmError;
  String? formMessage;

  bool _passwordTouched = false;
  bool _confirmTouched = false;

  int shakeToken = 0;

  bool get hasToken => token.trim().isNotEmpty;

  String? get visiblePasswordError => _passwordTouched ? passwordError : null;
  String? get visibleConfirmError => _confirmTouched ? confirmError : null;

  bool get canSubmit =>
      !isBusy &&
      hasToken &&
      password.isNotEmpty &&
      confirm.isNotEmpty &&
      passwordError == null &&
      confirmError == null;

  void onPasswordChanged(AppLocalizations l10n, String value) {
    password = value;
    _validate(l10n);
    notifyListeners();
  }

  void onConfirmChanged(AppLocalizations l10n, String value) {
    confirm = value;
    _validate(l10n);
    notifyListeners();
  }

  void touchPassword(AppLocalizations l10n) {
    _passwordTouched = true;
    _validate(l10n);
    notifyListeners();
  }

  void touchConfirm(AppLocalizations l10n) {
    _confirmTouched = true;
    _validate(l10n);
    notifyListeners();
  }

  void _validate(AppLocalizations l10n) {
    formMessage = null;

    if (password.isEmpty) {
      passwordError = l10n.passwordRequired;
    } else if (password.length < minLength) {
      passwordError = l10n.passwordTooShort(minLength);
    } else {
      passwordError = null;
    }

    if (confirm.isEmpty) {
      confirmError = l10n.passwordRequired;
    } else if (confirm != password) {
      confirmError = l10n.passwordsDoNotMatch;
    } else {
      confirmError = null;
    }
  }

  /// True once the password has been set. The screen sends the learner to
  /// sign in — see the note on this class about the tokens it ignores.
  bool succeeded = false;

  /// Returns whether the password was set.
  Future<bool> submit(AppLocalizations l10n) async {
    _passwordTouched = true;
    _confirmTouched = true;
    _validate(l10n);

    if (passwordError != null || confirmError != null) {
      shakeToken++;
      notifyListeners();
      return false;
    }

    setState(ViewState.busy);
    final LoginOutcome outcome = await _auth.resetPassword(
      token: token,
      password: password,
    );

    switch (outcome) {
      case LoginSuccess():
        // The tokens in `outcome` are deliberately dropped on the floor.
        succeeded = true;
        setState(ViewState.success);
        return true;
      case LoginFailure(message: final String message):
        // A 400 here means one thing — the link is spent — and the server's
        // own wording for it is not written for a learner.
        formMessage = outcome.statusCode == 400
            ? l10n.resetTokenInvalid
            : (message.trim().isEmpty ? l10n.signInFailed : message.trim());
        shakeToken++;
        setState(ViewState.error, error: formMessage!);
        return false;
    }
  }
}
