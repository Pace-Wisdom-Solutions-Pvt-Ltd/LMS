// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The saved certificate's file name.
//
// Downloading the same certificate twice used to produce the same name, so the
// second save landed on top of the first — or, on Android, sat beside it with
// nothing in either name to say which download it was. The moment of the
// download goes into the name to separate them, as epoch milliseconds.
//
// Digits are deliberate. A formatted timestamp had to be sliced to drop the
// colons that no save dialog accepts, and what it left behind put a second dot
// in the name. Neither is a problem any more, and both are pinned below.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  /// `FileSaver._safe` strips anything outside `[\w\s.-]` and then appends the
  /// extension. Replicated, because the uniqueness this is all for depends on
  /// what survives that, not on what goes into it.
  String saved(String course, DateTime at) {
    final String name = '$course-${formatFileStamp(at)}'
        .replaceAll(RegExp(r'[^\w\s.-]'), '')
        .replaceAll(RegExp(r'\s+'), '-');
    return name.toLowerCase().endsWith('.pdf') ? name : '$name.pdf';
  }

  test('the stamp is epoch milliseconds', () {
    expect(
      formatFileStamp(DateTime.utc(2026, 10, 9, 14, 30, 5)),
      '1791556205000',
    );
  });

  test('it is the same instant in any timezone', () {
    // No `toLocal()` to lose or to add: the epoch does not have one. A test
    // machine in another zone must still agree.
    final DateTime utc = DateTime.utc(2026, 10, 9, 14, 30, 5);
    expect(formatFileStamp(utc), formatFileStamp(utc.toLocal()));
  });

  test('it is digits and nothing else', () {
    expect(
      formatFileStamp(DateTime.utc(2026, 10, 9)),
      matches(RegExp(r'^\d+$')),
    );
  });

  test('two downloads a millisecond apart cannot collide', () {
    final DateTime at = DateTime.utc(2026, 10, 9, 14, 30, 5);
    expect(
      formatFileStamp(at),
      isNot(formatFileStamp(at.add(const Duration(milliseconds: 1)))),
    );
  });

  test('every character of it reaches the file name', () {
    // A stamp that lost characters in the scrub would stop separating the two
    // downloads it is there to separate.
    final DateTime at = DateTime.utc(2026, 10, 9, 14, 30, 5);
    expect(saved('POSH Training', at), contains(formatFileStamp(at)));
    expect(
      saved('POSH Training', at),
      isNot(saved('POSH Training', at.add(const Duration(milliseconds: 1)))),
    );
  });

  test('the name carries one dot, and `.pdf` is it', () {
    final String name = saved('POSH Training', DateTime.utc(2026, 10, 9));

    expect(name, 'POSH-Training-1791504000000.pdf');
    expect(name.split('.'), hasLength(2));
    // What every consumer splits on: FileSaver's own collision suffix,
    // open_filex's MIME lookup and share_plus's. One dot leaves nothing to
    // get wrong.
    expect(name.substring(name.lastIndexOf('.')), '.pdf');
  });
}
