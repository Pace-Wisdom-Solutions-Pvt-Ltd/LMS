// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Sign in with the same credentials the learner uses on the web.
///
/// Laid out to the prototype's `S.login`: the mark bleeding off the top-right
/// corner and turning slowly, a 150px top inset, an overline over a two-line
/// display heading, then the fields, the forgot link, the button and a footnote
/// that explains who the app is for.
///
/// Every authenticated account is admitted, whatever its role — there is no
/// role gate. When the account belongs to more than one organization, the
/// picker runs here, imperatively, before Home.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  /// True from the moment credentials are accepted until Home is reachable:
  /// the session is written, an organization is chosen, and its record is
  /// fetched. `SignInViewModel.isBusy` covers only the first of those, and a
  /// form that looks live while the app is still deciding where to send the
  /// learner invites a second tap.
  bool _landing = false;

  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(SignInViewModel vm) async {
    FocusScope.of(context).unfocus();
    final LoginOutcome? outcome = await vm.signIn(context.l10n);
    if (!mounted || outcome == null) return;

    switch (outcome) {
      case LoginFailure():
        // Whatever the server said, verbatim. No classifying it into fields or
        // cards — a rejected sign-in is one sentence and one place to read it.
        showAppSnackBar(context, vm.errorMessage, tone: ChipTone.danger);

      case LoginSuccess(:final List<OrgMembership> organizations):
        final SessionProvider session = context.read<SessionProvider>();
        final BrandingProvider branding = context.read<BrandingProvider>();

        setState(() => _landing = true);
        await session.startSession(outcome);
        if (!mounted) return;

        int? orgId = session.orgId;
        if (organizations.length > 1) {
          orgId = await showOrgPicker(context, dismissible: false);
          if (!mounted) return;
          if (orgId == null) {
            await session.clearSession();
            setState(() => _landing = false);
            return;
          }
          await session.selectOrg(orgId);
          if (!mounted) return;
        }

        // The login response is read for **one** thing: which organizations
        // the account belongs to, so the picker can offer them. Nothing about
        // how an organization *looks* comes from it — not its name and not a
        // logo — so the brand is whatever `GET /api/organizations/{id}/` says,
        // and this waits for it.
        //
        // Branding is cleared on sign-out, so there is nothing cached here:
        // not waiting would land the learner on Home in the app's own colours
        // and repaint a moment later. A **failure** is silent by design — Home
        // opens in the default brand and the splash picks the real one up on
        // the next launch, which beats holding someone on a sign-in form over
        // a logo.
        if (orgId != null) await branding.refresh(orgId);

        if (!mounted) return;
        context.goNamed(AppRouteNames.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<SignInViewModel>(
      create: (_) => SignInViewModel(),
      child: Consumer<SignInViewModel>(
        builder: (BuildContext context, SignInViewModel vm, _) {
          final AppLocalizations l10n = context.l10n;

          return Scaffold(
            body: Stack(
              clipBehavior: Clip.hardEdge,
              children: <Widget>[
                // A watermark, not a subject: centred, faint and still. The
                // mark here is the app's placeholder — an organization's own
                // logo only arrives after sign-in — so it sits behind the form
                // rather than competing with it.
                const Positioned.fill(
                  child: Center(child: AuthBackdropMark(size: 280)),
                ),
                SafeArea(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.only(
                      bottom: AppSpace.xxl + context.viewPadding.bottom,
                    ),
                    child: ResponsiveBody(
                      maxWidth: context.isTablet ? 460 : double.infinity,
                      child: ShakeOnChange(
                        token: vm.shakeToken,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            // `.auth { padding-top: 150px }`
                            const SizedBox(height: 150),
                            ...staggered(<Widget>[
                              Text(
                                l10n.signInOverline,
                                style: context.text.labelSmall?.copyWith(
                                  color: context.brand.brandText,
                                  letterSpacing: 1.0,
                                ),
                              ),
                              const SizedBox(height: AppSpace.sm),
                              Text(
                                l10n.signInTitle,
                                style: context.text.displaySmall,
                              ),
                              const SizedBox(height: AppSpace.lg),
                              AppTextField(
                                label: l10n.emailLabel,
                                hint: l10n.emailHint,
                                controller: _email,
                                errorText: vm.emailError,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                enabled: !vm.isBusy && !_landing,
                                autofillHints: const <String>[
                                  AutofillHints.username,
                                ],
                                onChanged: (String v) =>
                                    vm.onEmailChanged(l10n, v),
                                onBlur: () => vm.onEmailBlur(l10n),
                              ),
                              const SizedBox(height: AppSpace.lg),
                              AppTextField(
                                label: l10n.passwordLabel,
                                hint: l10n.passwordHint,
                                controller: _password,
                                errorText: vm.passwordError,
                                obscure: true,
                                textInputAction: TextInputAction.done,
                                enabled: !vm.isBusy && !_landing,
                                autofillHints: const <String>[
                                  AutofillHints.password,
                                ],
                                onChanged: (String v) =>
                                    vm.onPasswordChanged(l10n, v),
                                onBlur: () => vm.onPasswordBlur(l10n),
                                onSubmitted: (_) => _submit(vm),
                              ),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  // Its own screen, with its own email
                                  // field: whoever needs it mistyped a
                                  // password, so the address up there is as
                                  // likely to be wrong as right.
                                  onPressed: vm.isBusy || _landing
                                      ? null
                                      : () => context.pushNamed(
                                          AppRouteNames.forgotPassword,
                                        ),
                                  child: Text(l10n.forgotPassword),
                                ),
                              ),
                              const SizedBox(height: AppSpace.xs),
                              _SignInButton(
                                vm: vm,
                                busy: vm.isBusy || _landing,
                                onPressed: () => _submit(vm),
                              ),
                              const SizedBox(height: AppSpace.lg),
                              Text(
                                l10n.signInFootnote,
                                textAlign: TextAlign.center,
                                style: context.text.bodySmall?.copyWith(
                                  color: context.brand.muted,
                                ),
                              ),
                            ]),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// `.btn`: 54px tall, 17px radius, brand fill, `scale(.96)` while pressed and
/// desaturated while disabled.
class _SignInButton extends StatelessWidget {
  const _SignInButton({
    required this.vm,
    required this.busy,
    required this.onPressed,
  });

  final SignInViewModel vm;

  /// The whole landing, not only the login call — see `_SignInScreenState`.
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final bool enabled = vm.canSubmit && !busy;
    final BrandColors brand = context.brand;

    return PressScale(
      onTap: enabled ? onPressed : null,
      child: AnimatedOpacity(
        duration: AppMotion.fadeIn,
        opacity: enabled ? 1 : 0.55,
        child: Container(
          height: 54,
          decoration: BoxDecoration(
            color: brand.brandFill,
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          alignment: Alignment.center,
          child: busy
              ? SizedBox(
                  height: 22,
                  width: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: brand.onBrand,
                  ),
                )
              : Text(
                  context.l10n.signInCta,
                  style: context.text.titleMedium?.copyWith(
                    color: brand.onBrand,
                    fontSize: fs(16),
                  ),
                ),
        ),
      ),
    );
  }
}
