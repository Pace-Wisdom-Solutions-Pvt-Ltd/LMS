// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The app-wide white-label brand: colours, logo and org name.
///
/// This is a **global** provider, not a session one, because it themes the
/// pre-login screens too. It is hydrated from disk *before* `runApp` so the
/// very first frame is already branded — no white flash and no theme pop — and
/// is explicitly cleared on logout and on a rejected login, so the next person
/// on the device never sees the previous organization's brand (FR-BRAND-7).
///
/// A branding fetch failure is silent by design: keep the cached brand, or the
/// app default. Never block Home on it, never show an error for it.
class BrandingProvider extends BaseProvider {
  BrandingProvider({OrgRepository? repository})
    : _repository = repository ?? const OrgRepository();

  final OrgRepository _repository;

  OrgBranding _branding = OrgBranding.empty;
  OrgBranding get branding => _branding;

  /// Contrast-corrected colours, ready for [AppTheme].
  AppBrand get brand => _branding.brand;

  String get orgName => _branding.orgName;
  String? get logoUrl => _branding.logoUrl;

  /// True while the app is showing its own neutral identity rather than an
  /// organization's.
  bool get isDefault => brand.usesDefaultRings;

  /// True when nothing has been cached for the organization yet — the splash
  /// waits for [refresh] in that case and lets it land in the background in
  /// every other.
  bool get isEmpty => _branding.isEmpty;

  /// Reads the last-known brand from Hive. Called by `initApp` before `runApp`.
  void hydrateFromCache() {
    _branding = OrgBranding(
      orgName: HiveStorage.get<String>(HSKeys.brandOrgName, defaultValue: '')!,
      logoUrl: HiveStorage.get<String>(HSKeys.brandLogoUrl),
      primaryColor: HiveStorage.get<String>(HSKeys.brandPrimary),
      accentColor: HiveStorage.get<String>(HSKeys.brandAccent),
    );
    notifyListeners();
  }

  /// Fetches the full org record. Silent on failure.
  ///
  /// **Unconditional.** There is no cadence and no `force` flag: this ran at
  /// most once a day against a cached timestamp, which meant an admin
  /// changing a logo or a brand colour could take a day to reach a device
  /// that was already open, and nobody could tell whether what they were
  /// looking at was current. One request per launch is cheap; a stale brand
  /// that cannot be refreshed by relaunching is not.
  Future<void> refresh(int orgId) async {
    final ApiResponse res = await _repository.getOrganization(orgId);
    final Map<String, dynamic>? body = res.dataMap;
    if (!res.isSuccess || body == null) {
      appLogPrint('Branding fetch failed: ${res.message}', tag: 'BRAND');
      return;
    }

    _branding = OrgBranding.fromOrganization(body);
    await _persist();
    notifyListeners();
  }

  /// Back to the app's own identity.
  ///
  /// Sign-out clears the whole session box anyway; this stays key-by-key so it
  /// can also be called on its own, without taking the session with it.
  Future<void> reset() async {
    _branding = OrgBranding.empty;
    await HiveStorage.remove(HSKeys.brandPrimary);
    await HiveStorage.remove(HSKeys.brandAccent);
    await HiveStorage.remove(HSKeys.brandLogoUrl);
    await HiveStorage.remove(HSKeys.brandOrgName);
    notifyListeners();
  }

  Future<void> _persist() async {
    await HiveStorage.store(HSKeys.brandOrgName, _branding.orgName);
    await HiveStorage.storeOrRemove(HSKeys.brandLogoUrl, _branding.logoUrl);
    await HiveStorage.storeOrRemove(
      HSKeys.brandPrimary,
      _branding.primaryColor,
    );
    await HiveStorage.storeOrRemove(HSKeys.brandAccent, _branding.accentColor);
  }
}
