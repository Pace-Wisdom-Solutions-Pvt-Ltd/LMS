// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// An inline error with the server's own message and a Retry action.
///
/// Errors render inline, never as a full-screen error page — the learner keeps
/// whatever context the screen already had.
class ErrorCard extends StatelessWidget {
  const ErrorCard({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpace.lg),
      decoration: BoxDecoration(
        color: brand.dangerContainer,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(Icons.error_outline_rounded, size: 20, color: brand.danger),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  message,
                  style: context.text.bodyMedium?.copyWith(color: brand.danger),
                ),
              ),
            ],
          ),
          if (onRetry != null) ...<Widget>[
            const SizedBox(height: AppSpace.sm),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onRetry,
                child: Text(context.l10n.retry),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// An explicit empty state — never a blank screen and never a stuck spinner
/// (FR-HOME-5).
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    return Center(
      child: Padding(
        padding: EdgeInsets.all(context.gutter),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: brand.brandSoft,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: brand.brandText),
            ),
            const SizedBox(height: AppSpace.lg),
            Text(
              title,
              style: context.text.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (message != null) ...<Widget>[
              const SizedBox(height: AppSpace.sm),
              Text(
                message!,
                style: context.text.bodyMedium?.copyWith(color: brand.muted),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...<Widget>[
              const SizedBox(height: AppSpace.xl),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
