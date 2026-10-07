// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The learner's own user record — the one place it is fetched.
///
/// Session-scoped and app-wide, because the record is: Home greets by name,
/// Profile shows the whole of it, Edit profile writes it back. Before this,
/// `GET /api/users/{id}/` was never called at all — every screen read the copy
/// that came with the login response, so a name or picture changed on the web
/// never appeared here until the learner signed out and in again.
///
/// **Cache first, then the network, always.** The cached record is already in
/// memory before the first frame ([SessionProvider.hydrate] reads it from
/// Hive), so Profile draws immediately and this view model refreshes it behind
/// that. The fetch is not conditional: a cache that is present is still the
/// one from login, however old.
///
/// The record itself stays in [SessionProvider], which persists it and is what
/// the rest of the app already watches — keeping a second copy here is how the
/// name in Home's greeting comes to disagree with the name on Profile.
class ProfileViewModel extends BaseProvider {
  ProfileViewModel({
    required this.session,
    this.branding,
    ProfileRepository? repository,
  }) : _repository = repository ?? const ProfileRepository() {
    // The record lives in the session, so anything that writes it there —
    // this view model, or the edit form saving — has to reach the screens
    // reading it through here. Without this a name changed on Edit profile
    // updates Profile (which watches the session too) and leaves Home's
    // greeting on the old one.
    session.addListener(_onSessionChanged);
  }

  final SessionProvider session;

  /// Cleared along with the session, so the next person on the device never
  /// sees the previous organization's brand. Nullable because a test can drive
  /// this view model without the global tier above it.
  final BrandingProvider? branding;

  final ProfileRepository _repository;

  void _onSessionChanged() => notifyListeners();

  @override
  void dispose() {
    session.removeListener(_onSessionChanged);
    super.dispose();
  }

  AppUser? get user => session.user;

  bool _signingOut = false;

  /// True from the moment Sign out is confirmed until the session is gone.
  ///
  /// It lives here rather than in the screen's `State` because the work does:
  /// `signOut` is a round trip — `logout` blacklists the refresh token
  /// server-side — then two Hive writes, which is several seconds on a bad
  /// connection.
  bool get isSigningOut => _signingOut;

  bool _switchingOrg = false;

  /// True while another organization is being scoped to: its record fetched,
  /// then the session switched.
  bool get isSwitchingOrg => _switchingOrg;

  /// Scopes the app to [orgId].
  ///
  /// **The brand is fetched first and the session switched last**, which is
  /// the opposite of the obvious order and the only one that works.
  /// `MyApp` keys the session subtree on `SessionProvider.sessionKey`, and the
  /// org is in that key — so `selectOrg` tears down this view model, this
  /// screen and the navigator with it. Anything awaited after it is awaited by
  /// an object that no longer exists, and a loading flag set before it would
  /// vanish mid-fetch. Fetching first also means Home opens already wearing
  /// the new brand rather than repainting into it.
  ///
  /// Returns false when the account does not belong to that organization,
  /// which `selectOrg` would refuse anyway — checked up front so a refused
  /// switch cannot leave the *wrong* brand applied.
  Future<bool> switchOrg(int orgId) async {
    if (_switchingOrg) return false;
    final bool isMember = session.organizations.any(
      (OrgMembership o) => o.orgId == orgId,
    );
    if (!isMember) return false;

    _switchingOrg = true;
    notifyListeners();

    try {
      await branding?.refresh(orgId);
      return await session.selectOrg(orgId);
    } finally {
      // Usually a no-op: by here this provider has been disposed along with
      // the subtree, and `BaseProvider` swallows the notify.
      _switchingOrg = false;
      notifyListeners();
    }
  }

  /// Ends the session, with [isSigningOut] true throughout.
  ///
  /// The flag is cleared in a `finally` and the clear is mostly ceremonial:
  /// the router's `refreshListenable` is the session, so by then this screen
  /// is already being replaced by sign-in. It matters only when something
  /// fails and it is not — a learner must not be left behind a scrim they
  /// cannot dismiss.
  Future<void> signOut() async {
    if (_signingOut) return;
    _signingOut = true;
    notifyListeners();

    try {
      await session.signOut();
      await branding?.reset();
    } finally {
      _signingOut = false;
      notifyListeners();
    }
  }

  /// True while there is nothing at all to draw. The skeleton is for this
  /// case only — a stale record on screen beats a shimmer over nothing.
  bool get isLoadingFromEmpty => isBusy && session.user == null;

  /// Takes no `refresh` flag, unlike the tab view models: there is nothing to
  /// vary. The loading state is decided by whether anything is cached, and
  /// pull-to-refresh draws its own spinner above the record it is replacing.
  Future<void> load() async {
    final AppUser? cached = session.user;
    // Only an empty cache is worth a loading state; with a record on screen
    // the refresh is silent.
    if (cached == null) setState(ViewState.busy);

    final String? id = cached?.id ?? AuthTokenStore.userId;
    if (id == null || id.isEmpty) {
      setState(ViewState.error, error: '');
      return;
    }

    final ApiResponse res = await _repository.getProfile(id);
    final Map<String, dynamic>? body = res.dataMap;

    if (!res.isSuccess || body == null) {
      // Online-only: a failed refresh keeps the cached record rather than
      // blanking a screen that was already right.
      setState(
        cached != null ? ViewState.success : ViewState.error,
        error: res.message,
      );
      return;
    }

    // Straight into the session, which writes it to Hive and notifies every
    // screen holding the old copy.
    await session.setUser(AppUser.fromJson(body));
    setState(ViewState.success);
  }
}
