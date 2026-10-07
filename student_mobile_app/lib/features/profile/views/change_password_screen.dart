// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Changing the password.
///
/// A success **ends the session everywhere** — the backend blacklists every
/// refresh token for the user — so this screen signs the learner out and sends
/// them to sign in with the new password. Doing anything else would leave the
/// app holding tokens that fail on the very next request.
///
/// Both outcomes are a snackbar: the server's own sentence on a rejection, and
/// a confirmation that rides over the sign-in screen on a success. Signing in
/// again *is* the acknowledgement, so there is nothing to tap through first.
class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      ChangeNotifierProvider<ChangePasswordViewModel>(
        create: (_) => ChangePasswordViewModel(),
        child: const _ChangePasswordView(),
      );
}

class _ChangePasswordView extends StatefulWidget {
  const _ChangePasswordView();

  @override
  State<_ChangePasswordView> createState() => _ChangePasswordViewState();
}

class _ChangePasswordViewState extends State<_ChangePasswordView> {
  final TextEditingController _current = TextEditingController();
  final TextEditingController _next = TextEditingController();
  final TextEditingController _confirm = TextEditingController();

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit(ChangePasswordViewModel vm) async {
    FocusScope.of(context).unfocus();
    final bool ok = await vm.submit(context.l10n);
    if (!mounted) return;

    if (!ok) {
      // Empty on a local rule — those answer on the fields, with the shake.
      if (vm.errorMessage.isNotEmpty) {
        showAppSnackBar(context, vm.errorMessage, tone: ChipTone.danger);
      }
      return;
    }

    final SessionProvider session = context.read<SessionProvider>();
    final BrandingProvider branding = context.read<BrandingProvider>();
    // All captured while this route is still mounted. Clearing the session
    // changes `SessionProvider.sessionKey`, which rebuilds the keyed subtree
    // the whole MaterialApp sits in and disposes this widget with it.
    final GoRouter router = GoRouter.of(context);
    final String notice = context.l10n.passwordChangedDone;

    // The tokens are already dead server-side, so clear locally rather than
    // calling logout with a blacklisted refresh token.
    await session.clearSession();
    await branding.reset();

    // The guard sends an unauthenticated learner to sign-in on its own; this
    // says so outright rather than relying on it.
    router.goNamed(AppRouteNames.signIn);

    // **After** the rebuild, not before. The ScaffoldMessenger is created by
    // the MaterialApp inside that keyed subtree, so one raised beforehand is
    // thrown away with the messenger that was showing it — and this widget is
    // gone by now, so its own context cannot raise one either. The root
    // navigator's context belongs to the new tree.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final BuildContext? root =
          router.routerDelegate.navigatorKey.currentContext;
      if (root == null || !root.mounted) return;
      showAppSnackBar(root, notice, tone: ChipTone.success);
    });
  }

  @override
  Widget build(BuildContext context) {
    final ChangePasswordViewModel vm = context.watch<ChangePasswordViewModel>();
    final AppLocalizations l10n = context.l10n;

    return Scaffold(
      appBar: AppTopBar(title: Text(l10n.changePassword)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: AppSpace.xxl),
          children: <Widget>[
            SizedBox(height: AppSpace.md),
            ResponsiveBody(
              maxWidth: context.isTablet ? 460 : double.infinity,
              child: ShakeOnChange(
                token: vm.shakeToken,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: staggered(<Widget>[
                    Text(
                      l10n.changePasswordBody,
                      style: context.text.bodyMedium?.copyWith(
                        color: context.brand.muted,
                      ),
                    ),
                    const SizedBox(height: AppSpace.xl),
                    AppTextField(
                      label: l10n.currentPassword,
                      hint: l10n.currentPasswordHint,
                      controller: _current,
                      errorText: vm.visibleCurrentError,
                      obscure: true,
                      enabled: !vm.isBusy,
                      textInputAction: TextInputAction.next,
                      onChanged: (String v) => vm.onCurrentChanged(l10n, v),
                      onBlur: () => vm.touchCurrent(l10n),
                    ),
                    const SizedBox(height: AppSpace.lg),
                    AppTextField(
                      label: l10n.newPassword,
                      hint: l10n.newPasswordHint,
                      controller: _next,
                      errorText: vm.visibleNextError,
                      obscure: true,
                      enabled: !vm.isBusy,
                      textInputAction: TextInputAction.next,
                      onChanged: (String v) => vm.onNextChanged(l10n, v),
                      onBlur: () => vm.touchNext(l10n),
                    ),
                    const SizedBox(height: AppSpace.lg),
                    AppTextField(
                      label: l10n.confirmPassword,
                      hint: l10n.confirmPasswordHint,
                      controller: _confirm,
                      errorText: vm.visibleConfirmError,
                      obscure: true,
                      enabled: !vm.isBusy,
                      textInputAction: TextInputAction.done,
                      onChanged: (String v) => vm.onConfirmChanged(l10n, v),
                      onBlur: () => vm.touchConfirm(l10n),
                      onSubmitted: (_) => _submit(vm),
                    ),
                    const SizedBox(height: AppSpace.xxl),
                    AppButton(
                      label: l10n.changePassword,
                      busy: vm.isBusy,
                      onPressed: vm.canSubmit ? () => _submit(vm) : null,
                    ),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
