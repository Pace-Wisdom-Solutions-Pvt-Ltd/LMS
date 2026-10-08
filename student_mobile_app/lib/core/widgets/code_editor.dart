// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// `.editor` — the black code box, with a line-number gutter ruled off from
/// the code.
///
/// Used by the task screen's code answer. The colours come from [AppPalette]
/// and are
/// deliberately fixed in both themes: this is the one place in the app where
/// whitespace carries meaning, and an org's brand hex has no business in it.
///
/// **`filled: false` is load-bearing.** The app's `inputDecorationTheme` sets
/// `filled: true` with the theme's `surface`, and an `InputDecoration` that
/// leaves `filled` unset inherits it — which painted a pale panel over the
/// black in light mode and left only the gutter and the padding dark.
///
/// `TextField` soft-wraps, which means the gutter can only count **logical**
/// lines, not visual rows — a long line that wraps makes the numbers drift
/// below it. Horizontal scrolling of a multi-line field is not something
/// Flutter's text field offers, so wrapping is the lesser evil, and the gutter
/// is optional for exactly that reason.
///
/// **An editor with a gutter must not cap [maxLines].** The gutter is a column
/// of numbers *beside* the field, not inside its viewport, so it cannot scroll
/// with it: cap the field and it scrolls its own content under a gutter that
/// keeps growing, and from the 25th line on every number sits beside the wrong
/// code. So a numbered editor grows with what is typed and the page it sits in
/// does the scrolling — which is also the better phone behaviour, there being
/// no second scrollable to fight. [showLineNumbers] `false` is what a bounded
/// box uses.
class CodeEditor extends StatelessWidget {
  const CodeEditor({
    super.key,
    required this.controller,
    required this.hint,
    this.onChanged,
    this.minLines = 8,
    this.maxLines,
    this.readOnly = false,
    this.showLineNumbers = true,
    this.semanticLabel,
  }) : assert(
         !showLineNumbers || maxLines == null,
         'A gutter cannot scroll with the field, so a numbered editor must be '
         'free to grow. Pass showLineNumbers: false to cap the height.',
       );

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onChanged;
  final int minLines;

  /// `null` — the default — grows with the content. Only meaningful without
  /// [showLineNumbers]; see the class doc.
  final int? maxLines;
  final bool readOnly;
  final bool showLineNumbers;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final TextStyle mono = appMono(context)
        .copyWith(color: AppPalette.codeText, height: 1.6);

    final Widget field = TextField(
      controller: controller,
      onChanged: onChanged,
      readOnly: readOnly,
      minLines: minLines,
      // Derived rather than passed straight through, so the invariant holds in
      // release too, where the constructor's assert is gone.
      maxLines: showLineNumbers ? null : maxLines,
      style: mono,
      // A code field must not be second-guessed: no autocorrect, no
      // capitalizing the first letter of every line, no spell underlines.
      autocorrect: false,
      enableSuggestions: false,
      textCapitalization: TextCapitalization.none,
      keyboardType: TextInputType.multiline,
      cursorColor: AppPalette.codeText,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: mono.copyWith(color: AppPalette.codeMuted),
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        errorBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        disabledBorder: InputBorder.none,
        focusedErrorBorder: InputBorder.none,
        filled: false,
        isDense: true,
        contentPadding: const EdgeInsets.all(12),
      ),
    );

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppPalette.codeBackground,
        borderRadius: BorderRadius.circular(AppRadius.tile),
      ),
      child: Semantics(
        label: semanticLabel,
        textField: true,
        child: showLineNumbers
            // IntrinsicHeight, not `CrossAxisAlignment.stretch`: the editor
            // sits in a ListView, so its height is unbounded, and stretching
            // asks the gutter's ColoredBox to be infinitely tall. Measuring
            // the field first is what lets the gutter strip run its full
            // height instead of ending under the last number.
            ? IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    _Gutter(controller: controller, style: mono),
                    // Stretched by the Row, so it runs the editor's full
                    // height rather than stopping under the last number.
                    const SizedBox(
                      width: 1,
                      child: ColoredBox(color: AppPalette.codeMuted),
                    ),
                    Expanded(child: field),
                  ],
                ),
              )
            : field,
      ),
    );
  }
}

/// The numbers down the left edge. Rebuilds from the controller rather than
/// from `onChanged`, so it stays right when the text is set in code.
class _Gutter extends StatelessWidget {
  const _Gutter({required this.controller, required this.style});

  final TextEditingController controller;
  final TextStyle style;

  @override
  Widget build(BuildContext context) =>
      ValueListenableBuilder<TextEditingValue>(
        valueListenable: controller,
        builder: (BuildContext context, TextEditingValue value, Widget? child) {
          final int lines = max(1, value.text.split('\n').length);
          return Container(
            color: AppPalette.codeGutter,
            padding: const EdgeInsets.only(
              top: 12,
              bottom: 12,
              left: 12,
              right: 8,
            ),
            child: Text(
              <String>[for (int i = 1; i <= lines; i++) '$i'].join('\n'),
              textAlign: TextAlign.right,
              style: tabular(style.copyWith(color: AppPalette.codeMuted)),
            ),
          );
        },
      );
}

/// A read-only mono box — code the learner has already submitted, read back.
///
/// Scrolls sideways rather than wrapping: a wrapped line is a different string
/// from the one that was submitted, and the learner needs to see which.
class CodeBlock extends StatelessWidget {
  const CodeBlock({
    super.key,
    required this.text,
    this.tone = ChipTone.neutral,
    this.maxHeight = 160,
  });

  final String text;
  final ChipTone tone;
  final double maxHeight;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final (Color background, Color foreground) = switch (tone) {
      ChipTone.success => (brand.successContainer, brand.success),
      ChipTone.danger => (brand.dangerContainer, brand.danger),
      ChipTone.warning => (brand.warningContainer, brand.warning),
      _ => (AppPalette.codeBackground, AppPalette.codeText),
    };

    return Container(
      width: double.infinity,
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.iconButton),
        border: Border.all(color: AppPalette.codeLine),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: SingleChildScrollView(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Text(
            // An empty output is a fact worth stating — a blank box reads as
            // a rendering bug.
            text.isEmpty ? '—' : text,
            style: appMono(context).copyWith(color: foreground, height: 1.5),
          ),
        ),
      ),
    );
  }
}
