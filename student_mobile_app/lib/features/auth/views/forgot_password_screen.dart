// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Asking for a reset link — its own screen, not a button on the sign-in form.
///
/// The learner who needs this has usually mistyped a *password*, so the email
/// in the sign-in field is as likely to be wrong as right. Sending whatever
/// happened to be in it, and reporting an empty one as a field error on a form
/// they were not filling in, is what this replaces.
///
/// It has **two states, not two screens**: the form, and the confirmation that
/// something was sent. The confirmation is the same whatever the server
/// answered — see [ForgotPasswordViewModel].
class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      ChangeNotifierProvider<ForgotPasswordViewModel>(
        create: (_) => ForgotPasswordViewModel(),
        child: const _ForgotPasswordView(),
      );
}

class _ForgotPasswordView extends StatefulWidget {
  const _ForgotPasswordView();

  @override
  State<_ForgotPasswordView> createState() => _ForgotPasswordViewState();
}

class _ForgotPasswordViewState extends State<_ForgotPasswordView> {
  final TextEditingController _email = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit(ForgotPasswordViewModel vm) async {
    FocusScope.of(context).unfocus();
    await vm.submit(context.l10n);
  }

  @override
  Widget build(BuildContext context) {
    final ForgotPasswordViewModel vm = context.watch<ForgotPasswordViewModel>();
    final AppLocalizations l10n = context.l10n;

    return Scaffold(
      appBar: AppTopBar(title: Text(l10n.forgotPasswordTitle)),
      body: Stack(
        clipBehavior: Clip.hardEdge,
        children: <Widget>[
          // The same watermark the sign-in screen wears: this is still a
          // pre-login screen, so the mark is the app's own.
          const Positioned.fill(
            child: Center(child: AuthBackdropMark(size: 280)),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                top: AppSpace.lg,
                bottom: AppSpace.xxl + context.viewPadding.bottom,
              ),
              child: ResponsiveBody(
                maxWidth: context.isTablet ? 460 : double.infinity,
                child: ShakeOnChange(
                  token: vm.shakeToken,
                  child: vm.sent
                      ? _SentState(email: vm.email.trim())
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: staggered(<Widget>[
                            Text(
                              l10n.forgotPasswordBody,
                              style: context.text.bodyMedium?.copyWith(
                                color: context.brand.muted,
                              ),
                            ),
                            const SizedBox(height: AppSpace.xl),
                            AppTextField(
                              label: l10n.emailLabel,
                              hint: l10n.emailHint,
                              controller: _email,
                              errorText: vm.visibleEmailError,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.done,
                              enabled: !vm.isBusy,
                              autofillHints: const <String>[
                                AutofillHints.username,
                              ],
                              onChanged: (String v) =>
                                  vm.onEmailChanged(l10n, v),
                              onBlur: () => vm.onEmailBlur(l10n),
                              onSubmitted: (_) => _submit(vm),
                            ),
                            const SizedBox(height: AppSpace.xxl),
                            AppButton(
                              label: l10n.forgotPasswordCta,
                              busy: vm.isBusy,
                              onPressed: vm.canSubmit
                                  ? () => _submit(vm)
                                  : null,
                            ),
                          ]),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// What the learner sees once the request has gone out.
///
/// It names the address so a typo is visible, and says the link opens on the
/// website — the one thing that would otherwise surprise someone who tapped it
/// expecting to land back here (PRD R8).
class _SentState extends StatelessWidget {
  const _SentState({required this.email});

  final String email;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: staggered(<Widget>[
      const SizedBox(height: AppSpace.xl),
      EmptyState(
        icon: Icons.mark_email_read_outlined,
        title: context.l10n.forgotPasswordSentTitle,
        message: context.l10n.forgotPasswordSentBody,
      ),
      const SizedBox(height: AppSpace.lg),
      Text(
        email,
        textAlign: TextAlign.center,
        style: context.text.titleMedium?.copyWith(
          color: context.brand.brandText,
        ),
      ),
      const SizedBox(height: AppSpace.xxl),
      AppButton(
        label: context.l10n.backToSignIn,
        tone: ChipTone.neutral,
        onPressed: () => context.goNamed(AppRouteNames.signIn),
      ),
    ]),
  );
}
