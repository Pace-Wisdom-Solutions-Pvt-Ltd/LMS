// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Red "No internet" bar, shown app-wide whenever [InternetProvider] reports
/// the internet is unreachable.
///
/// Mounted once by [MyApp] at the **bottom** of the app, so no screen has to
/// opt in. Collapses to nothing when online rather than being conditionally
/// built by the caller, which keeps the wiring in [MyApp] to a single line.
///
/// The app is online-only — nothing is cached to disk — so this states the
/// fact rather than promising saved data.
class NoInternetBar extends StatelessWidget {
  const NoInternetBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<InternetProvider>(
      builder: (BuildContext context, InternetProvider internet, Widget? _) {
        if (internet.hasInternet) return const SizedBox.shrink();

        final ColorScheme colors = context.colors;
        return Material(
          color: colors.error,
          child: SafeArea(
            top: false,
            child: SizedBox(
              width: double.infinity,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.lg,
                  vertical: AppSpace.sm,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      Icons.wifi_off_rounded,
                      size: 15,
                      color: colors.onError,
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Flexible(
                      child: Text(
                        context.l10n.noInternet,
                        textAlign: TextAlign.center,
                        style: context.text.labelLarge?.copyWith(
                          color: colors.onError,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
