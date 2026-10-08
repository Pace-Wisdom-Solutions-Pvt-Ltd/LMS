// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:flutter/services.dart';

/// The app's orientation policy, in one place.
///
/// **Portrait is the app.** Every screen is laid out for a phone held upright
/// — the roadmap, the forms, the four-tab shell — so [lockPortrait] runs once
/// at boot and is the state the app returns to.
///
/// The exception is a video at fullscreen, which is the one thing a learner
/// has a reason to turn the phone for. [allowVideoFullscreen] widens the set
/// while the player is up, and the player restores the lock on the way out.
///
/// Both native sides stay permissive on purpose: `UISupportedInterfaceOrientations`
/// in Info.plist lists both landscapes and `MainActivity` sets no
/// `screenOrientation`. iOS honours [SystemChrome.setPreferredOrientations]
/// only within what the plist allows, so pinning it natively would make the
/// fullscreen case impossible rather than merely unused.
abstract final class AppOrientation {
  /// Upright only. `portraitDown` is left out deliberately — an iPhone's
  /// plist does not list `UIInterfaceOrientationPortraitUpsideDown`, so it
  /// would be ignored there and inconsistent with Android.
  static const List<DeviceOrientation> portrait = <DeviceOrientation>[
    DeviceOrientation.portraitUp,
  ];

  /// Portrait plus both landscapes, for a fullscreen video.
  ///
  /// Portrait stays in the set so the learner is not forced to turn the phone
  /// for a vertical video, and so a fullscreen that opens upright is not
  /// immediately wrong.
  static const List<DeviceOrientation> videoFullscreen = <DeviceOrientation>[
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ];

  /// The app's resting state. Called at boot, and again whenever a fullscreen
  /// player closes.
  static Future<void> lockPortrait() =>
      SystemChrome.setPreferredOrientations(portrait);

  /// Lets the device rotate while a video is fullscreen.
  static Future<void> allowVideoFullscreen() =>
      SystemChrome.setPreferredOrientations(videoFullscreen);
}
