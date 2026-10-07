// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Honest stand-in for a screen that has not been built yet.
///
/// Deliberately not a fake dashboard: it says plainly that the screen is
/// pending so nobody mistakes scaffolding for a finished feature.
class PhasePlaceholder extends StatelessWidget {
  const PhasePlaceholder({super.key, required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppTopBar(title: Text(title)),
    body: EmptyState(
      icon: icon,
      title: context.l10n.screenNotBuiltTitle,
      message: context.l10n.screenNotBuiltBody,
    ),
  );
}
