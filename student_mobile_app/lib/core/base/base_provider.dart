// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Base class for **every** view model. Extending raw [ChangeNotifier] is banned.
///
/// The reason is [notifyListeners]: an async call that completes after its screen
/// has been popped would otherwise throw "A ChangeNotifier was used after being
/// disposed". Guarding it here means no view model has to remember to check.
abstract class BaseProvider extends ChangeNotifier {
  bool _isDisposed = false;
  bool get isDisposed => _isDisposed;

  ViewState _state = ViewState.idle;
  ViewState get state => _state;

  bool get isBusy => _state == ViewState.busy;

  String _errorMessage = '';
  String get errorMessage => _errorMessage;

  /// Moves the view model into a new [ViewState] and notifies listeners.
  void setState(ViewState value, {String error = ''}) {
    _state = value;
    _errorMessage = error;
    notifyListeners();
  }

  @override
  void notifyListeners() {
    if (_isDisposed) return;
    super.notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }
}
