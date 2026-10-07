// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Listens to `internet_connection_checker` and exposes one flag.
///
/// The package actually pings hosts rather than reading the network interface,
/// so this reports whether the internet is *reachable* — a Wi-Fi with no route
/// out still comes back disconnected. That is the whole reason for the swap
/// away from a route-only check: a captive portal used to read as online.
///
/// Global tier: connectivity is unrelated to who is signed in.
class InternetProvider extends BaseProvider {
  InternetProvider() {
    if (!pollingEnabled) return;
    _subscription = InternetConnectionChecker.instance.onStatusChange.listen(
      _onStatus,
    );
    _seed();
  }

  /// Test seam. The checker reschedules itself on a real periodic timer that
  /// outlives the widget tree, which fails `pumpWidget`'s pending-timer check
  /// in every widget test. Setting this false leaves the provider permanently
  /// optimistic, which is what an offline-unaware test wants anyway.
  @visibleForTesting
  static bool pollingEnabled = true;

  StreamSubscription<InternetConnectionStatus>? _subscription;

  /// Optimistic until the first check answers, so the bar never flashes on a
  /// perfectly good launch.
  bool _hasInternet = true;
  bool get hasInternet => _hasInternet;
  bool get isOffline => !_hasInternet;

  Future<void> _seed() async {
    _set(await InternetConnectionChecker.instance.hasConnection);
  }

  /// The status enum has three values — `slow` still has internet, so only
  /// `disconnected` counts as offline.
  void _onStatus(InternetConnectionStatus status) =>
      _set(status != InternetConnectionStatus.disconnected);

  void _set(bool value) {
    if (_hasInternet == value || isDisposed) return;
    _hasInternet = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    // Deliberately NOT `InternetConnectionChecker.instance.dispose()`: that
    // closes the package's singleton stream for the rest of the process, so a
    // hot restart would leave every later listener dead.
    super.dispose();
  }
}
