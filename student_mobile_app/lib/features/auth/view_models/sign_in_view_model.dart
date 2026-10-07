// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Drives the sign-in form.
///
/// It owns validation and the error copy, and hands the outcome back to the
/// screen to navigate on — it never navigates itself, and it never persists a
/// session. Persisting is [SessionProvider]'s job.
///
/// **Validation is live but not nagging.** A field is "touched" once it has
/// lost focus or the form has been submitted; before that, typing never
/// produces an error. After that, every keystroke re-validates, so an error
/// clears the moment the learner fixes it instead of waiting for another
/// submit.
class SignInViewModel extends BaseProvider {
  SignInViewModel({AuthRepository? auth})
    : _auth = auth ?? const AuthRepository();

  final AuthRepository _auth;

  static final RegExp _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  String _email = '';
  String _password = '';

  bool _emailTouched = false;
  bool _passwordTouched = false;

  String? _emailError;
  String? _passwordError;

  /// Only surfaced once the field has been touched.
  String? get emailError => _emailTouched ? _emailError : null;
  String? get passwordError => _passwordTouched ? _passwordError : null;

  /// Bumped on a rejected submit to trigger the form shake.
  int shakeToken = 0;

  /// Whether the button is enabled. Both fields non-empty and currently valid —
  /// the learner should not be able to fire a doomed request.
  bool get canSubmit =>
      !isBusy &&
      _email.trim().isNotEmpty &&
      _password.isNotEmpty &&
      _emailError == null &&
      _passwordError == null;

  // ── Live input ──────────────────────────────────────────────────────────

  void onEmailChanged(AppLocalizations l10n, String value) {
    _email = value;
    _validateEmail(l10n);
    notifyListeners();
  }

  void onPasswordChanged(AppLocalizations l10n, String value) {
    _password = value;
    _validatePassword(l10n);
    notifyListeners();
  }

  /// Losing focus is the first fair moment to show an error for a field.
  void onEmailBlur(AppLocalizations l10n) {
    if (_email.isEmpty && !_emailTouched) return;
    _emailTouched = true;
    _validateEmail(l10n);
    notifyListeners();
  }

  void onPasswordBlur(AppLocalizations l10n) {
    if (_password.isEmpty && !_passwordTouched) return;
    _passwordTouched = true;
    _validatePassword(l10n);
    notifyListeners();
  }

  void _validateEmail(AppLocalizations l10n) {
    final String value = _email.trim();
    if (value.isEmpty) {
      _emailError = l10n.emailRequired;
    } else if (!_emailPattern.hasMatch(value)) {
      _emailError = l10n.emailInvalid;
    } else {
      _emailError = null;
    }
  }

  void _validatePassword(AppLocalizations l10n) =>
      _passwordError = _password.isEmpty ? l10n.passwordRequired : null;

  // ── Submit ──────────────────────────────────────────────────────────────

  /// Signs in.
  ///
  /// On failure the view model does **one** thing: it holds the server's own
  /// message in [errorMessage] and shakes the form. It does not classify the
  /// failure, route it to a field, or decide whether an admin is involved —
  /// the screen puts whatever came back in a snackbar. Only local validation
  /// writes field errors.
  Future<LoginOutcome?> signIn(AppLocalizations l10n) async {
    if (isBusy) return null;

    // Submitting touches everything, so any outstanding error becomes visible.
    _emailTouched = true;
    _passwordTouched = true;
    _validateEmail(l10n);
    _validatePassword(l10n);

    if (_emailError != null || _passwordError != null) {
      shakeToken++;
      notifyListeners();
      return null;
    }

    setState(ViewState.busy);
    final LoginOutcome outcome = await _auth.login(
      email: _email,
      password: _password,
    );

    switch (outcome) {
      case LoginSuccess():
        setState(ViewState.success);
      case LoginFailure(:final String message):
        shakeToken++;
        // An empty snackbar is the silent failure all over again, so our own
        // copy stands in when the server sent nothing readable.
        setState(
          ViewState.error,
          error: message.trim().isEmpty ? l10n.signInFailed : message.trim(),
        );
    }

    return outcome;
  }
}
