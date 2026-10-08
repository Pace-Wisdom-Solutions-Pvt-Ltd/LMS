// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The editor grows; the gutter cannot be left behind.
//
// It used to cap the field at `maxLines: 24`, which made the field scroll its
// own content while the gutter — a column of numbers *beside* that viewport,
// not inside it — kept growing. Past the 24th line every number sat beside the
// wrong code, and pressing enter at the bottom appeared to do nothing.
//
// A numbered editor is therefore uncapped, and the page it sits in scrolls.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  /// Pumps one editor in a scrollable page, the way both screens hold it.
  Future<void> pumpEditor(
    WidgetTester tester,
    TextEditingController controller, {
    bool showLineNumbers = true,
    int minLines = 8,
    int? maxLines,
  }) async {
    tester.view.physicalSize = const Size(420, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: ListView(
            children: <Widget>[
              CodeEditor(
                controller: controller,
                hint: 'Write your code',
                showLineNumbers: showLineNumbers,
                minLines: minLines,
                maxLines: maxLines,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
  }

  String lines(int n) =>
      <String>[for (int i = 1; i <= n; i++) 'line $i'].join('\n');

  TextField field(WidgetTester tester) =>
      tester.widget<TextField>(find.byType(TextField));

  testWidgets('a numbered editor is never capped', (WidgetTester tester) async {
    final TextEditingController c = TextEditingController(text: lines(30));
    addTearDown(c.dispose);

    await pumpEditor(tester, c);

    expect(
      field(tester).maxLines,
      isNull,
      reason: 'a cap would scroll the field out from under its own gutter',
    );
  });

  testWidgets('the gutter and the field keep the same height past 24 lines', (
    WidgetTester tester,
  ) async {
    final TextEditingController c = TextEditingController(text: lines(8));
    addTearDown(c.dispose);

    await pumpEditor(tester, c);
    final double atEight = tester.getSize(find.byType(CodeEditor)).height;

    // Well past the old cap, and past it by enough that a capped field would
    // show as a height that stopped growing.
    c.text = lines(40);
    await tester.pump(const Duration(milliseconds: 300));
    final double atForty = tester.getSize(find.byType(CodeEditor)).height;

    expect(
      atForty,
      greaterThan(atEight),
      reason: 'a capped field would have stopped growing at the 24th line',
    );

    // And the gutter numbers every one of them. The gutter is a single Text of
    // newline-joined numbers, so this is also what proves it did not stop
    // where the old cap did.
    expect(
      find.text(<String>[for (int i = 1; i <= 40; i++) '$i'].join('\n')),
      findsOneWidget,
    );
  });

  testWidgets('a gutterless box may still be bounded', (
    WidgetTester tester,
  ) async {
    final TextEditingController c = TextEditingController(text: lines(30));
    addTearDown(c.dispose);

    // No numbers beside it, so capping it misaligns nothing.
    await pumpEditor(
      tester,
      c,
      showLineNumbers: false,
      minLines: 2,
      maxLines: 6,
    );

    expect(field(tester).maxLines, 6);
  });
}
