// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// `.editor` — the dark code box, with a line-number gutter.
///
/// Shared by the task screen's code answer and the coding practice editor, so
/// the two cannot drift apart. The colours come from [AppPalette] and are
/// deliberately fixed in both themes: this is the one place in the app where
/// whitespace carries meaning, and an org's brand hex has no business in it.
///
/// `TextField` soft-wraps, which means the gutter can only count **logical**
/// lines, not visual rows — a long line that wraps makes the numbers drift
/// below it. Horizontal scrolling of a multi-line field is not something
/// Flutter's text field offers, so wrapping is the lesser evil, and the gutter
/// is optional for exactly that reason.
class CodeEditor extends StatelessWidget {
  const CodeEditor({
    super.key,
    required this.controller,
    required this.hint,
    this.onChanged,
    this.minLines = 8,
    this.maxLines = 24,
    this.readOnly = false,
    this.showLineNumbers = true,
    this.semanticLabel,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onChanged;
  final int minLines;
  final int maxLines;
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
      maxLines: maxLines,
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
        isDense: true,
        contentPadding: const EdgeInsets.all(12),
      ),
    );

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppPalette.codeBackground,
        borderRadius: BorderRadius.circular(AppRadius.tile),
        border: Border.all(color: AppPalette.codeLine),
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

/// A read-only mono box — stdin, expected output, what the judge actually got.
///
/// Scrolls sideways rather than wrapping: a wrapped output is a different
/// string from the one the learner is being compared against, and they need to
/// see which.
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
