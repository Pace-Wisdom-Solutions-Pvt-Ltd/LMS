// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// Boxes, split by **lifetime** rather than by feature.
///
/// The split is the point: signing out clears [secrets] and [session] and
/// leaves [prefs] alone, so no caller has to remember which individual keys
/// survive a sign-out. See [HiveStorage.clearOnSignOut].
abstract final class HSBox {
  /// Tokens. Cleared on sign-out.
  ///
  /// "Secret" here means *scoped to the signed-in account*, not encrypted at
  /// rest — see the note on [HSKeys].
  static const String secrets = 'secrets_box';

  /// Everything about the current account: cached user, chosen org, the
  /// memberships, theme mode and the resolved org branding. Cleared on
  /// sign-out.
  static const String session = 'session_box';

  /// Device preferences that outlive any account — currently the locale.
  /// **Survives sign-out.**
  static const String prefs = 'prefs_box';

  /// Opened by [HiveStorage.init], in this order.
  static const List<String> all = <String>[secrets, session, prefs];

  /// The single box this app used before storage was split three ways. It is
  /// deleted from disk at boot so an upgraded install does not leave the old
  /// account's profile JSON lying around. Safe to drop once no device can
  /// still be carrying it.
  static const String legacy = 'app_box';
}

/// A key that knows which box it belongs to and what type it holds.
///
/// Making the box part of the key is what keeps the lifetime split honest: a
/// session value cannot be written into the box that survives sign-out, because
/// there is no call site where the box is chosen.
class HSKey<T> {
  const HSKey(this.name, this.box);

  final String name;
  final String box;

  @override
  String toString() => '$box/$name';
}

/// Every key the app persists.
///
/// **Nothing here is encrypted at rest.** Hive writes to the app's private
/// directory, which the OS keeps away from other apps but not from a rooted or
/// jailbroken device, and Hive's own `HiveAesCipher` would only move the
/// problem to wherever the cipher key was stored. Tokens are short-lived and
/// the refresh token rotates; treat a compromised device as a compromised
/// session.
abstract final class HSKeys {
  // ── secrets ───────────────────────────────────────────────────────────────
  static const HSKey<String> accessToken = HSKey<String>(
    'access_token',
    HSBox.secrets,
  );
  static const HSKey<String> refreshToken = HSKey<String>(
    'refresh_token',
    HSBox.secrets,
  );

  // ── session ───────────────────────────────────────────────────────────────
  static const HSKey<String> user = HSKey<String>('user', HSBox.session);
  static const HSKey<int> orgId = HSKey<int>('org_id', HSBox.session);
  static const HSKey<String> organizations = HSKey<String>(
    'organizations',
    HSBox.session,
  );
  static const HSKey<String> themeMode = HSKey<String>(
    'theme_mode',
    HSBox.session,
  );

  // Resolved org branding, hydrated before runApp so the first frame is
  // branded. Session-scoped: the next person on this device must never see the
  // previous organization's colours.
  static const HSKey<String> brandPrimary = HSKey<String>(
    'brand_primary',
    HSBox.session,
  );
  static const HSKey<String> brandAccent = HSKey<String>(
    'brand_accent',
    HSBox.session,
  );
  static const HSKey<String> brandLogoUrl = HSKey<String>(
    'brand_logo_url',
    HSBox.session,
  );
  static const HSKey<String> brandOrgName = HSKey<String>(
    'brand_org_name',
    HSBox.session,
  );

  // ── prefs ─────────────────────────────────────────────────────────────────
  /// Deliberately outside the session: the language someone picked is a device
  /// preference, not something they should have to set again after signing out.
  static const HSKey<String> langCode = HSKey<String>('lang_code', HSBox.prefs);
}
