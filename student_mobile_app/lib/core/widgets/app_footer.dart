// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// [AppEnv.companyCopyright], on every route, opening
/// [AppEnv.companyWebsite].
///
/// Mounted once by [MyApp] below the router, so no screen opts in. It is the
/// last thing in that column, so it always pays the home indicator's inset;
/// [NoInternetBar] is overlaid on top of it rather than placed beneath, so a
/// connection dropping moves neither this nor anything above it.
///
/// **White on black, in both themes.** Not a theme oversight: it is a
/// publisher's mark rather than part of the app's surface, and it reads the
/// same way whichever theme the learner picked. Only the colours are pinned —
/// the type still comes from the theme, so it follows the text scale.
class AppFooter extends StatelessWidget {
  const AppFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black,
      child: SafeArea(
        top: false,
        bottom: true,
        // Semantics outside the InkWell, so "link" lands on the tappable
        // node rather than on something inside it.
        child: Semantics(
          link: true,
          child: InkWell(
            onTap: () => openExternalUrl(AppEnv.companyWebsite),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpace.lg,
                vertical: AppSpace.sm,
              ),
              child: Text(
                AppEnv.companyCopyright,
                textAlign: TextAlign.center,
                style: context.text.labelMedium?.copyWith(color: Colors.white),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
