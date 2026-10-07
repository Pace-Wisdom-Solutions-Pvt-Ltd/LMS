// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// My Courses: the list, the search box and the filter chips.
///
/// Both search and filtering are **client-side** — the endpoint returns a bare
/// array with no query support, so everything is done over the loaded list.
class CoursesViewModel extends BaseProvider {
  CoursesViewModel({CoursesRepository? repository})
    : _repository = repository ?? const CoursesRepository();

  final CoursesRepository _repository;

  List<Course> _all = const <Course>[];
  List<Course> get all => _all;

  String _query = '';
  String get query => _query;

  CourseFilter _filter = CourseFilter.all;
  CourseFilter get filter => _filter;

  bool _loadedOnce = false;
  bool get loadedOnce => _loadedOnce;

  /// Search and filter combine: the chips narrow whatever the search matched.
  List<Course> get visible => _all
      .where((Course c) => c.matches(_query))
      .where(
        (Course c) => switch (_filter) {
          CourseFilter.all => true,
          CourseFilter.inProgress => c.isInProgress,
          CourseFilter.notStarted => c.isNotStarted,
          CourseFilter.completed => c.isCompleted,
        },
      )
      .toList();

  /// Counts for the chip badges, computed against the search result so a chip
  /// never promises rows the search has already excluded.
  int countFor(CourseFilter filter) {
    final Iterable<Course> searched = _all.where(
      (Course c) => c.matches(_query),
    );
    return switch (filter) {
      CourseFilter.all => searched.length,
      CourseFilter.inProgress =>
        searched.where((Course c) => c.isInProgress).length,
      CourseFilter.notStarted =>
        searched.where((Course c) => c.isNotStarted).length,
      CourseFilter.completed =>
        searched.where((Course c) => c.isCompleted).length,
    };
  }

  void search(String value) {
    _query = value;
    notifyListeners();
  }

  void setFilter(CourseFilter value) {
    _filter = value;
    notifyListeners();
  }

  Future<void> load(int orgId, {bool refresh = false}) async {
    if (!refresh && !_loadedOnce) setState(ViewState.busy);

    final ApiResponse res = await _repository.getMyCourses(orgId);
    if (!res.isSuccess) {
      setState(
        _loadedOnce ? ViewState.success : ViewState.error,
        error: res.message,
      );
      return;
    }

    _all = res.listOf(Course.fromJson);
    _loadedOnce = true;
    setState(ViewState.success);
  }
}
