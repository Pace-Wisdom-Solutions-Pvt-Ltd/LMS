// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:intl/intl.dart';
import 'package:lms/utils/app_exports.dart';

/// Date and duration formatting.
///
/// All of it goes through `intl` so a later locale addition changes the output
/// without touching a screen.

/// `12 Oct` — for due dates.
String formatShortDate(DateTime value) =>
    DateFormat.MMMd().format(value.toLocal());

/// `12 Oct 2026` — for issued certificates.
String formatLongDate(DateTime value) =>
    DateFormat.yMMMd().format(value.toLocal());

/// `30 Dec 2026` — day first, for a course deadline badge.
String formatDueDate(DateTime value) =>
    DateFormat('d MMM yyyy').format(value.toLocal());

/// `12 Oct, 14:30`.
String formatDateTime(DateTime value) =>
    '${DateFormat.MMMd().format(value.toLocal())}, '
    '${DateFormat.Hm().format(value.toLocal())}';

/// `1791556205000` — milliseconds since the epoch.
///
/// For a downloaded file's name, so two downloads of the same certificate do
/// not land as the same name. Digits only, which is the point: every character
/// survives `FileSaver`'s file-name scrub, nothing has to be sliced off a
/// formatted string, and the name keeps the single dot before `.pdf`.
///
/// No `toLocal()`: the epoch is the same instant everywhere, so a timezone
/// cannot change it. It is not meant to be read as a date.
String formatFileStamp(DateTime value) => '${value.millisecondsSinceEpoch}';

/// `09:59` — a countdown. Tabular figures keep it from jittering; pair with
/// `tabular(...)` or [appMono] at the call site.
String formatCountdown(Duration d) {
  final Duration clamped = d.isNegative ? Duration.zero : d;
  final String minutes = clamped.inMinutes
      .remainder(60)
      .toString()
      .padLeft(2, '0');
  final String seconds = clamped.inSeconds
      .remainder(60)
      .toString()
      .padLeft(2, '0');
  if (clamped.inHours > 0) {
    return '${clamped.inHours}:$minutes:$seconds';
  }
  return '$minutes:$seconds';
}

/// "10 minutes" / "2 hours" — for a rules sheet.
String formatDurationWords(Duration d) {
  if (d.inMinutes < 60) return '${d.inMinutes} min';
  final int hours = d.inHours;
  final int minutes = d.inMinutes.remainder(60);
  return minutes == 0 ? '$hours hr' : '$hours hr $minutes min';
}
