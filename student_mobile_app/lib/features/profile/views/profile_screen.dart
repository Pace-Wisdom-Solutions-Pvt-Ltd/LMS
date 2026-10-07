// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Profile — who is signed in, where, and the few things they can change.
///
/// The header is the identity (avatar, name, email, roles) with editing behind
/// the pencil; below it sit the organization, contact details and settings,
/// then Sign out and the build this is.
///
/// The record is drawn from the cache on the first frame and refreshed behind
/// it by [ProfileViewModel]; the skeleton appears only when there is no cache
/// to draw.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<ProfileViewModel>().load(),
    );
  }

  /// Changes the active organization and reloads everything under it.
  ///
  /// Every student endpoint is scoped by `org_id`, so the dashboard, courses,
  /// progress already on screen belongs to the *previous* org
  /// and have to go. `SessionProvider.sessionKey` includes the org, so
  /// selecting one rebuilds the whole session provider tier — the in-app
  /// equivalent of relaunching. Returning to Home avoids leaving the learner
  /// on a tab that is mid-rebuild.
  Future<void> _switchOrg(BuildContext context) async {
    final SessionProvider session = context.read<SessionProvider>();
    final ProfileViewModel vm = context.read<ProfileViewModel>();

    final int? orgId = await showOrgPicker(context);
    if (orgId == null || orgId == session.orgId) return;

    final bool ok = await vm.switchOrg(orgId);
    if (!ok) return;

    // Through the router itself, not this `context`: switching the session
    // rebuilds the subtree this screen lives in, so by now its element is
    // gone and `context.goNamed` would be a call on a dead tree. `appRouter`
    // is a singleton and outlives all of it.
    appRouter.goNamed(AppRouteNames.home);
  }

  Future<void> _signOut(BuildContext context) async {
    final bool? go = await showAppSheet<bool>(
      context,
      title: context.l10n.signOut,
      child: Text(context.l10n.signOutConfirm, style: context.text.bodyMedium),
      actions: <Widget>[
        AppButton(
          label: context.l10n.signOut,
          tone: ChipTone.danger,
          onPressed: () => Navigator.of(context).pop(true),
        ),
        AppButton(
          label: context.l10n.cancel,
          tone: ChipTone.neutral,
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ],
    );
    if (go != true || !context.mounted) return;

    // The view model owns both the work and the "in progress" state — the
    // screen only renders it. Signing out is a round trip plus two Hive
    // writes, during which Profile used to sit there looking live: taps did
    // nothing, and the learner could not tell whether the first one had
    // registered.
    await context.read<ProfileViewModel>().signOut();
  }

  @override
  Widget build(BuildContext context) {
    final SessionProvider session = context.watch<SessionProvider>();
    final ProfileViewModel vm = context.watch<ProfileViewModel>();
    final AppUser? user = session.user;
    final OrgMembership? org = session.currentOrg;
    final String phone = user?.phoneNumber.trim() ?? '';

    // The membership is the first source, but `GET /api/organizations/{id}/`
    // is the authoritative one and has already been fetched for branding, so
    // fall back to it before settling for "Organization 7".
    final String brandedName = context.watch<BrandingProvider>().orgName.trim();
    final String orgName = (org?.orgName.trim().isNotEmpty ?? false)
        ? org!.orgName.trim()
        : (brandedName.isNotEmpty ? brandedName : (org?.displayName ?? ''));

    return Stack(
      children: <Widget>[
        Scaffold(
          appBar: AppTopBar(
            title: Text(context.l10n.tabProfile),
            actionsPadding: EdgeInsets.all(10),
            actions: [
              Tooltip(
                message: context.l10n.editProfile,
                child: Semantics(
                  button: true,
                  container: true,
                  label: context.l10n.editProfile,
                  child: PressScale(
                    onTap: () => context.pushNamed(AppRouteNames.editProfile),
                    child: Container(
                      padding: EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: context.colors.surface,
                        borderRadius: BorderRadius.circular(
                          AppRadius.iconButton,
                        ),
                        border: Border.all(color: context.colors.outline),
                      ),
                      child: Icon(
                        Icons.edit_outlined,
                        size: 19,
                        color: context.brand.brandText,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          body: SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: vm.load,
              child: ListView(
                // Always scrollable, so the pull still works on the short
                // states — the skeleton and the error card are both shorter
                // than the screen.
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.only(
                  top: AppSpace.sm,
                  bottom: AppSpace.xxl,
                ),
                children: <Widget>[
                  ResponsiveBody(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: staggered(<Widget>[
                        // Only the identity waits on the fetch. Everything below
                        // it — the theme, the password, Sign out — belongs to the
                        // account rather than to the record, and has to stay
                        // reachable when the record cannot be read.
                        if (vm.isLoadingFromEmpty)
                          const _IdentitySkeleton()
                        else if (user == null &&
                            vm.state == ViewState.error) ...[
                          ErrorCard(
                            message: vm.errorMessage.isEmpty
                                ? context.l10n.profileLoadFailed
                                : vm.errorMessage,
                            onRetry: vm.load,
                          ),
                        ] else ...[
                          _ProfileHeader(user: user, org: org),
                          const SizedBox(height: AppSpace.lg),
                          if (org != null)
                            _SettingsGroup(
                              children: <Widget>[
                                _SettingRow(
                                  icon: Icons.apartment_rounded,
                                  title: context.l10n.profileOrganization,
                                  value: orgName,
                                  // Only offered when there is somewhere to switch to.
                                  onTap: session.canSwitchOrg
                                      ? () => _switchOrg(context)
                                      : null,
                                  trailing: session.canSwitchOrg
                                      ? null
                                      : const SizedBox.shrink(),
                                ),
                              ],
                            ),

                          if (phone.isNotEmpty) ...<Widget>[
                            const SizedBox(height: AppSpace.lg),
                            _SettingsGroup(
                              children: <Widget>[
                                _SettingRow(
                                  icon: Icons.phone_outlined,
                                  title: context.l10n.phoneNumber,
                                  value: phone,
                                  trailing: const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ],
                        ],

                        const SizedBox(height: AppSpace.lg),
                        _GroupLabel(context.l10n.profileSettings),
                        _SettingsGroup(
                          children: <Widget>[
                            _ThemeRow(session: session),
                            _SettingRow(
                              icon: Icons.lock_outline_rounded,
                              title: context.l10n.changePassword,
                              onTap: () => context.pushNamed(
                                AppRouteNames.changePassword,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: AppSpace.xxl),
                        AppButton(
                          label: context.l10n.signOut,
                          icon: Icons.logout_rounded,
                          tone: ChipTone.danger,
                          onPressed: () => _signOut(context),
                        ),
                        const SizedBox(height: AppSpace.lg),
                        Text(
                          context.l10n.appVersion(AppInfo.versionName),
                          textAlign: TextAlign.center,
                          style: tabular(
                            context.text.bodySmall!.copyWith(
                              color: context.brand.muted,
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        // Covers the bar as well as the body: nothing on this screen is
        // usable once the session is being torn down.
        if (vm.isSigningOut)
          _BusyOverlay(label: context.l10n.signingOut)
        else if (vm.isSwitchingOrg)
          _BusyOverlay(label: context.l10n.switchingOrg),
      ],
    );
  }
}

/// Shown over the whole of Profile while something is happening to the
/// session — signing out, or switching organization.
///
/// Both are a round trip plus disk writes, and the screen underneath stays
/// interactive for all of it: long enough on a slow connection for a learner
/// to tap Sign out twice, to wander into Change password on a session that is
/// already half gone, or to open the picker again mid-switch.
class _BusyOverlay extends StatelessWidget {
  const _BusyOverlay({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Positioned.fill(
    child: AbsorbPointer(
      child: ColoredBox(
        color: context.theme.scaffoldBackgroundColor.withValues(alpha: 0.82),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              SizedBox(
                width: 30,
                height: 30,
                child: CircularProgressIndicator(
                  strokeWidth: 2.6,
                  color: context.brand.brandText,
                ),
              ),
              const SizedBox(height: AppSpace.lg),
              Text(label, style: context.text.titleMedium),
            ],
          ),
        ),
      ),
    ),
  );
}

/// The identity block on a first-ever load with nothing cached: the header's
/// own shape in shimmer, and nothing below it — the rest of the screen is
/// already real.
class _IdentitySkeleton extends StatelessWidget {
  const _IdentitySkeleton();

  @override
  Widget build(BuildContext context) => const AppShimmer(
    child: Column(
      children: <Widget>[
        SizedBox(height: AppSpace.lg),
        SkeletonBox(width: 90, height: 92, radius: 50),
        SizedBox(height: AppSpace.lg),
        SkeletonBox(width: 200, height: 30),
        SizedBox(height: AppSpace.sm),
        SkeletonBox(width: 250, height: 20),
        SizedBox(height: AppSpace.md),
        SkeletonBox(width: 110, height: 26, radius: 13),
        SizedBox(height: AppSpace.lg),
        SizedBox(height: AppSpace.sm),
        SkeletonBox(width: double.infinity, height: 50, radius: 20),
        SizedBox(height: AppSpace.md),
        SkeletonBox(width: double.infinity, height: 50, radius: 20),
        SizedBox(height: AppSpace.lg),
        SizedBox(height: AppSpace.sm),
      ],
    ),
  );
}

/// Avatar, name, email and the roles held here, with editing behind the
/// pencil in the top-right corner.
class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user, required this.org});

  final AppUser? user;
  final OrgMembership? org;

  @override
  Widget build(BuildContext context) {
    // The account's own roles (`user.roles`), not the ones held in the current
    // organization — Profile is about who this person is, not where they are.
    final List<String> roles = RoleLabels.forAll(
      user?.roles ?? const <String>[],
    );

    return Padding(
      // Room for the pencil, so a long name never runs under it.
      padding: const EdgeInsets.symmetric(horizontal: 48),
      child: Column(
        children: <Widget>[
          _Avatar(user: user),
          const SizedBox(height: AppSpace.lg),
          Text(
            user?.displayName ?? '',
            textAlign: TextAlign.center,
            style: context.text.titleLarge,
          ),
          Text(
            user?.email ?? '',
            textAlign: TextAlign.center,
            style: context.text.bodySmall,
          ),
          if (roles.isNotEmpty) ...<Widget>[
            const SizedBox(height: AppSpace.md),
            Semantics(
              label: context.l10n.profileRoles,
              child: Wrap(
                alignment: WrapAlignment.center,
                spacing: AppSpace.sm,
                runSpacing: AppSpace.xs,
                children: <Widget>[
                  for (final String role in roles)
                    AppChip(
                      label: role,
                      icon: Icons.verified_user_outlined,
                      tone: ChipTone.brand,
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// `.avatar` — initials or the profile picture, inside a ring built from the
/// brand's own fill at descending opacities.
///
/// One colour at several strengths rather than several colours: whatever hex
/// an organization sets, the ring stays recognisably theirs and never mixes in
/// a hue they did not choose.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.user});

  final AppUser? user;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final Color fill = brand.brandFill;
    final String? picture = user?.profilePicture;

    return Container(
      width: 110,
      height: 110,
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: SweepGradient(
          startAngle: 3.49, // 200°, as in the design
          colors: <Color>[
            fill,
            fill.withValues(alpha: 0.55),
            fill.withValues(alpha: 0.18),
            fill.withValues(alpha: 0.55),
            fill,
          ],
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: context.colors.surface,
          shape: BoxShape.circle,
        ),
        padding: const EdgeInsets.all(4),
        child: CircleAvatar(
          backgroundColor: brand.brandSoft,
          foregroundImage: (picture ?? '').trim().isNotEmpty
              ? NetworkImage(picture!.trim())
              : null,
          child: Text(
            user?.initials ?? '?',
            style: context.text.titleLarge?.copyWith(
              color: brand.brandText,
              fontSize: fs(30),
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: AppSpace.xs, bottom: AppSpace.sm),
    child: Text(text, style: context.text.labelSmall),
  );
}

/// `.settings` — rows sharing one card, divided by hairlines.
class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(AppRadius.card),
      border: Border.all(color: context.colors.outline),
    ),
    child: Column(
      children: <Widget>[
        for (int i = 0; i < children.length; i++) ...<Widget>[
          if (i > 0) Divider(height: 1, color: context.colors.outline),
          children[i],
        ],
      ],
    ),
  );
}

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.icon,
    required this.title,
    this.value,
    this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String? value;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.lg,
        vertical: AppSpace.md,
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: context.colors.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, size: 18, color: context.brand.brandText),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  title,
                  style: context.text.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (value != null)
                  Text(
                    value!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodySmall,
                  ),
              ],
            ),
          ),
          trailing ??
              (onTap == null
                  ? const SizedBox.shrink()
                  : Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: context.brand.muted,
                    )),
        ],
      ),
    ),
  );
}

/// Appearance. Persists across launches and is independent of org branding —
/// switching it must never refetch branding.
class _ThemeRow extends StatelessWidget {
  const _ThemeRow({required this.session});

  final SessionProvider session;

  String _label(BuildContext context, ThemeMode mode) => switch (mode) {
    ThemeMode.system => context.l10n.themeSystem,
    ThemeMode.light => context.l10n.themeLight,
    ThemeMode.dark => context.l10n.themeDark,
  };

  @override
  Widget build(BuildContext context) => _SettingRow(
    icon: Icons.brightness_6_outlined,
    title: context.l10n.themeMode,
    trailing: DropdownButton<ThemeMode>(
      value: session.themeMode,
      underline: const SizedBox.shrink(),
      borderRadius: BorderRadius.circular(AppRadius.tile),
      onChanged: (ThemeMode? mode) {
        if (mode != null) session.setThemeMode(mode);
      },
      items: <DropdownMenuItem<ThemeMode>>[
        for (final ThemeMode mode in ThemeMode.values)
          DropdownMenuItem<ThemeMode>(
            value: mode,
            child: Text(_label(context, mode)),
          ),
      ],
    ),
  );
}
