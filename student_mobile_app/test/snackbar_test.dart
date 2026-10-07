// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// One snackbar at a time.
//
// Flutter queues them and plays them in turn, so two in quick succession meant
// the learner read a stale message for four seconds while the one that mattered
// waited its turn. `showAppSnackBar` clears the queue first, and
// `hideAppSnackBars` exists for the moment before the platform takes the
// foreground — a snackbar cannot animate away while this app is not drawing,
// so one left behind survives until the learner comes back.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  Future<BuildContext> pumpHost(WidgetTester tester) async {
    late BuildContext captured;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        locale: const Locale('en'),
        supportedLocales: const <Locale>[Locale('en')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: Builder(
            builder: (BuildContext context) {
              captured = context;
              return const SizedBox.expand();
            },
          ),
        ),
      ),
    );
    return captured;
  }

  testWidgets('a new message replaces the one on screen, never queues', (
    WidgetTester tester,
  ) async {
    final BuildContext context = await pumpHost(tester);

    showAppSnackBar(context, 'Saved to your device');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Saved to your device'), findsOneWidget);

    showAppSnackBar(context, 'Could not share that file');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(
      find.text('Saved to your device'),
      findsNothing,
      reason: 'the stale message is gone, not waiting its turn',
    );
    expect(find.text('Could not share that file'), findsOneWidget);
  });

  testWidgets('hideAppSnackBars takes down whatever is showing', (
    WidgetTester tester,
  ) async {
    // What the Progress screen calls before opening the PDF.
    final BuildContext context = await pumpHost(tester);

    showAppSnackBar(context, 'Saved to your device');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Saved to your device'), findsOneWidget);

    hideAppSnackBars(context);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Saved to your device'), findsNothing);
  });

  testWidgets('an action is offered only when it has somewhere to go', (
    WidgetTester tester,
  ) async {
    final BuildContext context = await pumpHost(tester);

    showAppSnackBar(context, 'Saved', actionLabel: 'Open');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(
      find.text('Open'),
      findsNothing,
      reason: 'a label with no callback is a button that does nothing',
    );
  });

  testWidgets('the action runs what it was given', (WidgetTester tester) async {
    final BuildContext context = await pumpHost(tester);

    bool tapped = false;
    showAppSnackBar(
      context,
      'Saved',
      actionLabel: 'Open',
      onAction: () => tapped = true,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    await tester.tap(find.byType(SnackBarAction));
    await tester.pump();
    expect(tapped, isTrue);
  });

  testWidgets(
    'a tone colours the message, and neutral leaves the theme alone',
    (WidgetTester tester) async {
      final BuildContext context = await pumpHost(tester);

      showAppSnackBar(context, 'Neutral');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(
        tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor,
        isNull,
        reason: 'the theme already styles the default one',
      );

      showAppSnackBar(context, 'Wrong', tone: ChipTone.danger);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(
        tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor,
        AppTheme.light().extension<BrandColors>()!.dangerContainer,
      );
    },
  );
}
