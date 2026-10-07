// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Asking for a reset link.
///
/// Its own screen and its own view model rather than a button on the sign-in
/// form: the learner who needs this has usually typed the wrong password, not
/// an email, and reusing the sign-in field meant the request went out with
/// whatever happened to be in it — including an empty string, which the old
/// inline flow answered with a field error rather than a page.
///
/// **The answer is always the same**, whatever the server says. The endpoint
/// is documented not to reveal whether an address is registered, so this
/// screen must not either: a failure and a success look identical, and a
/// transport error is the only thing that reports itself.
class ForgotPasswordViewModel extends BaseProvider {
  ForgotPasswordViewModel({AuthRepository? auth})
    : _auth = auth ?? const AuthRepository();

  final AuthRepository _auth;

  static final RegExp _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  String email = '';
  String? emailError;
  bool _touched = false;

  /// True once the request has gone out, which switches the screen to its
  /// "check your email" state.
  bool sent = false;

  int shakeToken = 0;

  String? get visibleEmailError => _touched ? emailError : null;

  bool get canSubmit =>
      !isBusy && email.trim().isNotEmpty && emailError == null;

  void onEmailChanged(AppLocalizations l10n, String value) {
    email = value;
    _validate(l10n);
    notifyListeners();
  }

  void onEmailBlur(AppLocalizations l10n) {
    if (email.isEmpty && !_touched) return;
    _touched = true;
    _validate(l10n);
    notifyListeners();
  }

  void _validate(AppLocalizations l10n) {
    final String value = email.trim();
    if (value.isEmpty) {
      emailError = l10n.emailRequired;
    } else if (!_emailPattern.hasMatch(value)) {
      emailError = l10n.emailInvalid;
    } else {
      emailError = null;
    }
  }

  Future<bool> submit(AppLocalizations l10n) async {
    _touched = true;
    _validate(l10n);
    if (emailError != null) {
      shakeToken++;
      notifyListeners();
      return false;
    }

    setState(ViewState.busy);
    await _auth.forgotPassword(email);

    // Deliberately not branching on the result. Reporting "no account with
    // that email" would turn this screen into a way to find out who has one.
    sent = true;
    setState(ViewState.success);
    return true;
  }
}
