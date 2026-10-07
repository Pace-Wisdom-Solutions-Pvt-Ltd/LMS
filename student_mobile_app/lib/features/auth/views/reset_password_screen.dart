// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Setting a new password from the link in a reset email.
///
/// **Unreachable from inside the app, on purpose.** The `token` only ever
/// arrives in that email, and those links open the web app until App Links /
/// Universal Links are registered (PRD R8). Everything below it is built and
/// tested, so turning it on later is a deep-link registration and a route —
/// not a feature.
///
/// A success **sends the learner straight to sign in** with a snackbar and no
/// dialog to dismiss, and does not keep the token pair the backend offers
/// along with it — see [ResetPasswordViewModel]. Signing in is the
/// confirmation: it is the only thing that proves the right password was both
/// set and remembered, and a reset opened on a borrowed device leaves nothing
/// behind on it.
class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key, required this.token});

  /// From `?token=` on the link. Empty when the link was truncated, which the
  /// screen says rather than letting a password be typed into nothing.
  final String token;

  @override
  Widget build(BuildContext context) =>
      ChangeNotifierProvider<ResetPasswordViewModel>(
        create: (_) => ResetPasswordViewModel(token: token),
        child: const _ResetPasswordView(),
      );
}

class _ResetPasswordView extends StatefulWidget {
  const _ResetPasswordView();

  @override
  State<_ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<_ResetPasswordView> {
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirm = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit(ResetPasswordViewModel vm) async {
    FocusScope.of(context).unfocus();
    final bool ok = await vm.submit(context.l10n);
    if (!mounted || !ok) return;

    // A reset also ends whatever session this device was holding: the backend
    // blacklists the user's refresh tokens when the password changes, so
    // anything still stored here is already dead.
    await context.read<SessionProvider>().clearSession();
    if (!mounted) return;
    await context.read<BrandingProvider>().reset();
    if (!mounted) return;

    // A snackbar and the form, with nothing to acknowledge in between: signing
    // in *is* the confirmation, and it is the only one that proves the right
    // password was both set and remembered.
    showAppSnackBar(
      context,
      context.l10n.resetPasswordDone,
      tone: ChipTone.success,
    );
    context.goNamed(AppRouteNames.signIn);
  }

  @override
  Widget build(BuildContext context) {
    final ResetPasswordViewModel vm = context.watch<ResetPasswordViewModel>();
    final AppLocalizations l10n = context.l10n;

    return Scaffold(
      appBar: AppTopBar(title: Text(l10n.resetPasswordTitle)),
      body: Stack(
        clipBehavior: Clip.hardEdge,
        children: <Widget>[
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
                  child: vm.hasToken
                      ? _Form(
                          vm: vm,
                          password: _password,
                          confirm: _confirm,
                          onSubmit: () => _submit(vm),
                        )
                      : const _BrokenLink(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Form extends StatelessWidget {
  const _Form({
    required this.vm,
    required this.password,
    required this.confirm,
    required this.onSubmit,
  });

  final ResetPasswordViewModel vm;
  final TextEditingController password;
  final TextEditingController confirm;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: staggered(<Widget>[
        Text(
          l10n.resetPasswordBody,
          style: context.text.bodyMedium?.copyWith(color: context.brand.muted),
        ),
        const SizedBox(height: AppSpace.xl),
        if (vm.formMessage != null) ...<Widget>[
          ErrorCard(message: vm.formMessage!),
          const SizedBox(height: AppSpace.lg),
        ],
        AppTextField(
          label: l10n.newPassword,
          hint: l10n.newPasswordHint,
          controller: password,
          errorText: vm.visiblePasswordError,
          obscure: true,
          enabled: !vm.isBusy,
          textInputAction: TextInputAction.next,
          autofillHints: const <String>[AutofillHints.newPassword],
          onChanged: (String v) => vm.onPasswordChanged(l10n, v),
          onBlur: () => vm.touchPassword(l10n),
        ),
        const SizedBox(height: AppSpace.lg),
        AppTextField(
          label: l10n.confirmPassword,
          hint: l10n.confirmPasswordHint,
          controller: confirm,
          errorText: vm.visibleConfirmError,
          obscure: true,
          enabled: !vm.isBusy,
          textInputAction: TextInputAction.done,
          onChanged: (String v) => vm.onConfirmChanged(l10n, v),
          onBlur: () => vm.touchConfirm(l10n),
          onSubmitted: (_) => onSubmit(),
        ),
        const SizedBox(height: AppSpace.xxl),
        AppButton(
          label: l10n.resetPasswordCta,
          busy: vm.isBusy,
          onPressed: vm.canSubmit ? onSubmit : null,
        ),
      ]),
    );
  }
}

/// `?token=` was missing. Nothing typed here could be accepted, so the form is
/// not offered at all.
class _BrokenLink extends StatelessWidget {
  const _BrokenLink();

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      const SizedBox(height: AppSpace.xl),
      EmptyState(
        icon: Icons.link_off_rounded,
        title: context.l10n.resetPasswordTitle,
        message: context.l10n.resetTokenMissing,
        action: AppButton(
          label: context.l10n.backToSignIn,
          tone: ChipTone.neutral,
          onPressed: () => context.goNamed(AppRouteNames.signIn),
        ),
      ),
    ],
  );
}
