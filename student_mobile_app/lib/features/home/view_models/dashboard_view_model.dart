// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Home.
///
/// The dashboard payload and nothing else.
///
/// Session-scoped, so a sign-out discards it along with the rest of the
/// learner's data. Nothing is cached to disk — the app is online-only, and a
/// failed load keeps whatever is already on screen while the "No internet" bar
/// explains why.
class DashboardViewModel extends BaseProvider {
  DashboardViewModel({DashboardRepository? repository})
    : _repository = repository ?? const DashboardRepository();

  final DashboardRepository _repository;

  Dashboard _dashboard = Dashboard.empty;
  Dashboard get dashboard => _dashboard;

  bool _loadedOnce = false;
  bool get loadedOnce => _loadedOnce;

  /// The skeleton shows on the first load only; a pull-to-refresh leaves the
  /// current dashboard in place while the call is in flight.
  Future<void> load(int orgId, {bool refresh = false}) async {
    if (!refresh && !_loadedOnce) setState(ViewState.busy);

    final ApiResponse res = await _repository.getDashboard(orgId);
    final Map<String, dynamic>? body = res.dataMap;

    if (!res.isSuccess || body == null) {
      // Keep whatever was on screen; the "No internet" bar explains the rest.
      setState(
        _loadedOnce ? ViewState.success : ViewState.error,
        error: res.message,
      );
      return;
    }

    _dashboard = Dashboard.fromJson(body);
    _loadedOnce = true;
    setState(ViewState.success);
  }
}
