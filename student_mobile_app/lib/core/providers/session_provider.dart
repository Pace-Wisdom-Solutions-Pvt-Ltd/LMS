// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:convert';

import 'package:lms/utils/app_exports.dart';

/// The UI-facing source of truth for "who is signed in, and where".
///
/// It owns the session and mirrors every change into [AuthTokenStore], which
/// the Dio interceptor reads synchronously. Features call the methods here and
/// never write to [AuthTokenStore] themselves.
///
/// It holds **every** organization the account belongs to, whatever the role
/// in each: the app does not gate on role, and the student-scoped endpoints
/// simply return empty results for a non-learner.
///
/// [userId] keys the session provider tier in [MyApp], so signing in or out
/// tears down and rebuilds every session-scoped view model.
class SessionProvider extends BaseProvider {
  SessionProvider({AuthRepository? auth})
    : _auth = auth ?? const AuthRepository();

  final AuthRepository _auth;

  AppUser? _user;
  AppUser? get user => _user;

  List<OrgMembership> _organizations = const <OrgMembership>[];

  /// Every membership, learner or not, ordered so the organizations this
  /// account learns in come first — those are the ones the app is for.
  List<OrgMembership> get organizations =>
      List<OrgMembership>.unmodifiable(_organizations);

  int? _orgId;
  int? get orgId => _orgId;

  Locale _appLocale = const Locale('en');
  Locale get appLocale => _appLocale;

  ThemeMode _themeMode = ThemeMode.system;
  ThemeMode get themeMode => _themeMode;

  bool get isLoggedIn => AuthTokenStore.isLoggedIn && _user != null;

  /// The org currently in scope. Null until one is chosen.
  OrgMembership? get currentOrg {
    if (_orgId == null) return null;
    for (final OrgMembership o in _organizations) {
      if (o.orgId == _orgId) return o;
    }
    return null;
  }

  /// True when the account belongs to several organizations and has not picked
  /// one yet — the app shows the picker.
  bool get needsOrgChoice => _organizations.length > 1 && currentOrg == null;

  /// True when switching organizations is worth offering in Profile.
  bool get canSwitchOrg => _organizations.length > 1;

  /// The key for session-scoped providers. `'guest'` while signed out.
  String get userId => _user?.id ?? 'guest';

  /// What [MyApp] keys the session provider tier on.
  ///
  /// The organization is part of it because every student endpoint is scoped
  /// by `org_id`: switching org must discard the dashboard, courses,
  /// progress belonging to the previous one, not merely
  /// refetch over them.
  String get sessionKey => '$userId@${_orgId ?? 0}';

  // ── Boot ────────────────────────────────────────────────────────────────

  /// Reads the persisted session into the provider. Called by `initApp` after
  /// [AuthTokenStore.load] and before `runApp`, so the router's first redirect
  /// already knows whether the learner is signed in.
  Future<void> hydrate() async {
    final Map<String, dynamic>? stored = AuthTokenStore.user;
    if (stored != null) _user = AppUser.fromJson(stored);

    _organizations = _ordered(_readStoredOrgs());
    _orgId = AuthTokenStore.orgId;
    _appLocale = Locale(AuthTokenStore.langCode);
    _themeMode = _readThemeMode();
    notifyListeners();
  }

  // ── Sign in / out ───────────────────────────────────────────────────────

  /// Persists a successful sign-in.
  Future<void> startSession(LoginSuccess result) async {
    await AuthTokenStore.saveTokens(
      access: result.accessToken,
      refresh: result.refreshToken,
    );
    await AuthTokenStore.saveUser(result.user.toJson());

    _user = result.user;
    _organizations = _ordered(result.organizations);
    await _storeOrgs(_organizations);

    // One org: choose it silently. Several: the picker decides.
    if (result.organizations.length == 1) {
      await _setOrgId(result.organizations.first.orgId);
    } else {
      _orgId = null;
    }

    notifyListeners();
  }

  /// Chooses the active organization.
  ///
  /// Rejects an org this account does not belong to at all, so a bad deep link
  /// or a stale cache cannot scope the app to someone else's tenant. The role
  /// held there is not checked — every membership is selectable.
  Future<bool> selectOrg(int orgId) async {
    final bool isMember = _organizations.any(
      (OrgMembership o) => o.orgId == orgId,
    );
    if (!isMember) {
      appLogPrint('Refused org $orgId — not a membership', tag: 'AUTH');
      return false;
    }
    await _setOrgId(orgId);
    notifyListeners();
    return true;
  }

  /// Signs out: ends the server session, then clears everything local.
  ///
  /// The server call is best-effort — a learner who taps "Sign out" ends up
  /// signed out on this device regardless.
  Future<void> signOut() async {
    await _auth.logout();
    await clearSession();
  }

  /// Clears local session state without calling the server. Also used by the
  /// interceptor when a token refresh fails.
  Future<void> clearSession() async {
    _user = null;
    _organizations = const <OrgMembership>[];
    _orgId = null;

    // Clears the secrets and session boxes wholesale — the memberships, the
    // brand and the theme go with the tokens. The locale lives in prefs and
    // survives.
    await AuthTokenStore.clear();
    notifyListeners();
  }

  // ── Preferences ─────────────────────────────────────────────────────────

  /// Replaces the learner's record — **and the memberships that came with
  /// it**.
  ///
  /// The membership list is the reason this is not a one-liner. It arrives
  /// nested under `user.organizations[]`, on the profile fetch as well as on
  /// login, which is the whole point of [OrgMembership] reading one shape. But
  /// [organizations] used to be written only by [startSession] and [hydrate],
  /// so an org added on the web landed in `_user` and was invisible to
  /// everything that matters: [canSwitchOrg] stayed false so Profile offered
  /// no switch, and [selectOrg] would have refused the new org as "not a
  /// membership" even if something had asked for it. Signing out and in was
  /// the only way to see it.
  ///
  /// Adopted only when the payload actually carries memberships. An
  /// edit-profile save builds its [AppUser] with `copyWith`, so the list is
  /// already right there — but a response that simply omits the key must not
  /// empty the picker.
  Future<void> setUser(AppUser value) async {
    _user = value;
    await AuthTokenStore.saveUser(value.toJson());

    if (value.organizations.isNotEmpty) {
      _organizations = _ordered(value.organizations);
      await _storeOrgs(_organizations);
      await _dropOrgIdIfNoLongerAMember();
    }

    notifyListeners();
  }

  /// Clears the active org when the refreshed memberships no longer include
  /// it — the account was removed from it elsewhere.
  ///
  /// Only possible now that the list can change mid-session. Staying scoped to
  /// it would 403 every request on the next screen, so it falls back the way
  /// [startSession] does: one membership left is chosen silently, several
  /// leaves the picker to decide.
  Future<void> _dropOrgIdIfNoLongerAMember() async {
    final int? current = _orgId;
    if (current == null) return;
    if (_organizations.any((OrgMembership o) => o.orgId == current)) return;

    appLogPrint('Org $current is no longer a membership', tag: 'AUTH');
    if (_organizations.length == 1) {
      await _setOrgId(_organizations.first.orgId);
    } else {
      _orgId = null;
      await AuthTokenStore.clearOrgId();
    }
  }

  /// Theme mode is independent of org branding — switching it must never
  /// refetch branding (FR-PROF-2). It lives in the session box, so it resets
  /// to [ThemeMode.system] on sign-out along with the rest of the account.
  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    await HiveStorage.store(HSKeys.themeMode, mode.name);
    notifyListeners();
  }

  /// Changes the app language and mirrors it to the `Accept-Language` header.
  Future<void> setLocale(Locale locale) async {
    _appLocale = locale;
    await AuthTokenStore.saveLangCode(locale.languageCode);
    notifyListeners();
  }

  // ── Internals ───────────────────────────────────────────────────────────

  Future<void> _setOrgId(int value) async {
    _orgId = value;
    await AuthTokenStore.saveOrgId(value);
  }

  /// Learner memberships first — this app is built for them, so those are the
  /// organizations most likely to be wanted. Order is otherwise preserved.
  static List<OrgMembership> _ordered(List<OrgMembership> orgs) {
    final List<OrgMembership> sorted = List<OrgMembership>.from(orgs);
    sorted.sort((OrgMembership a, OrgMembership b) {
      if (a.isStudent == b.isStudent) return 0;
      return a.isStudent ? -1 : 1;
    });
    return sorted;
  }

  Future<void> _storeOrgs(List<OrgMembership> orgs) => HiveStorage.store(
    HSKeys.organizations,
    jsonEncode(orgs.map((OrgMembership o) => o.toJson()).toList()),
  );

  List<OrgMembership> _readStoredOrgs() {
    final String? raw = HiveStorage.get<String>(HSKeys.organizations);
    if (raw == null || raw.isBlank) return const <OrgMembership>[];
    try {
      return (jsonDecode(raw) as List<dynamic>)
          .whereType<Map<dynamic, dynamic>>()
          .map(
            (Map<dynamic, dynamic> e) =>
                OrgMembership.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList();
    } catch (e) {
      appLogPrint('Failed to decode stored orgs: $e', tag: 'AUTH');
      return const <OrgMembership>[];
    }
  }

  static ThemeMode _readThemeMode() {
    final String? name = HiveStorage.get<String>(HSKeys.themeMode);
    return ThemeMode.values.firstWhere(
      (ThemeMode m) => m.name == name,
      orElse: () => ThemeMode.system,
    );
  }
}
