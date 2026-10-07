// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// An organization's white-label identity.
///
/// Sourced from `GET /api/organizations/{id}/` after login. Every field is
/// routinely `null` or `""` — that is the normal case, not an error.
class OrgBranding {
  final String orgName;
  final String? logoUrl;
  final String? primaryColor;
  final String? accentColor;

  const OrgBranding({
    this.orgName = '',
    this.logoUrl,
    this.primaryColor,
    this.accentColor,
  });

  static const OrgBranding empty = OrgBranding();

  /// Resolved theme colours, already contrast-corrected. Falls back to the
  /// app's own neutral brand when the org supplies nothing usable.
  AppBrand get brand => AppBrand.fromOrg(primaryColor, accentColor);

  bool get hasLogo => (logoUrl ?? '').trim().isNotEmpty;

  /// True when nothing about the organization is known yet — no name, no logo,
  /// no colours. Not the same as wearing the default *brand*: an org can have
  /// a name and a logo and set no colours at all, and that org is known.
  bool get isEmpty =>
      orgName.trim().isEmpty &&
      !hasLogo &&
      (primaryColor ?? '').trim().isEmpty &&
      (accentColor ?? '').trim().isEmpty;

  /// `GET /api/organizations/{id}/` — the authenticated, full org record.
  factory OrgBranding.fromOrganization(Map<String, dynamic> json) =>
      OrgBranding(
        orgName: (json['name'] ?? '').toString(),
        logoUrl: _clean(json['logo']),
        primaryColor: _clean(json['primary_color']),
        accentColor: _clean(json['accent_color']),
      );

  static String? _clean(dynamic value) {
    if (value == null) return null;
    final String s = '$value'.trim();
    return s.isEmpty ? null : s;
  }
}
