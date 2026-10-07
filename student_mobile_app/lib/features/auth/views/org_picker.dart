// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Asks which organization to open.
///
/// Shown imperatively after sign-in and from Profile — never from the router's
/// redirect, which stays a pure auth guard.
///
/// **Every** organization the account belongs to is listed, whatever the role
/// held there, and each row states those roles so the person can see what they
/// are opening. Learner memberships are ordered first, since that is what the
/// app is built around.
///
/// Renders as a bottom sheet on a phone and a dialog on a tablet, where a sheet
/// pinned to the bottom edge is a long reach.
Future<int?> showOrgPicker(BuildContext context, {bool dismissible = true}) {
  final List<OrgMembership> orgs = context
      .read<SessionProvider>()
      .organizations;
  final Widget content = _OrgPickerContent(orgs: orgs);

  if (context.prefersDialogOverSheet) {
    return showDialog<int>(
      context: context,
      barrierDismissible: dismissible,
      builder: (_) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: content,
        ),
      ),
    );
  }

  return showModalBottomSheet<int>(
    context: context,
    isDismissible: dismissible,
    enableDrag: dismissible,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => content,
  );
}

class _OrgPickerContent extends StatelessWidget {
  const _OrgPickerContent({required this.orgs});

  final List<OrgMembership> orgs;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpace.xl,
          AppSpace.sm,
          AppSpace.xl,
          AppSpace.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(context.l10n.chooseOrgTitle, style: context.text.titleLarge),
            const SizedBox(height: AppSpace.xs),
            Text(
              context.l10n.chooseOrgBody,
              style: context.text.bodyMedium?.copyWith(
                color: context.brand.muted,
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: orgs.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                itemBuilder: (BuildContext context, int i) =>
                    _OrgTile(org: orgs[i]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrgTile extends StatelessWidget {
  const _OrgTile({required this.org});

  final OrgMembership org;

  @override
  Widget build(BuildContext context) {
    final bool isCurrent =
        context.select((SessionProvider s) => s.orgId) == org.orgId;
    final BrandColors brand = context.brand;
    final String roles = org.roleLabel;

    return Material(
      color: isCurrent ? brand.brandSoft : context.colors.surface,
      borderRadius: BorderRadius.circular(AppRadius.tile),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.tile),
        onTap: () => Navigator.of(context).pop(org.orgId),
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.md),
          child: Row(
            children: <Widget>[
              _OrgAvatar(org: org),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      org.displayName,
                      style: context.text.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (roles.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 4),
                      // What the person is in this organization. Shown because
                      // a trainer opening the learner app should know that is
                      // what they are doing.
                      AppChip(
                        label: roles,
                        icon: org.isStudent
                            ? Icons.school_outlined
                            : Icons.badge_outlined,
                        tone: org.isStudent ? ChipTone.brand : ChipTone.neutral,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              if (isCurrent)
                Icon(
                  Icons.check_circle_rounded,
                  color: brand.brandText,
                  size: 20,
                )
              else
                Icon(Icons.chevron_right_rounded, color: brand.muted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

/// The org's own logo if the login response carried one, else a monogram.
///
/// Deliberately not [BrandMark], which shows the *currently applied* brand —
/// here every row needs its own.
class _OrgAvatar extends StatelessWidget {
  const _OrgAvatar({required this.org});

  final OrgMembership org;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final String initials = monogramOf(org.displayName);

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: brand.brandFill,
        borderRadius: BorderRadius.circular(AppRadius.tile),
      ),
      alignment: Alignment.center,
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: context.text.labelLarge?.copyWith(color: brand.onBrand),
      ),
    );
  }
}
