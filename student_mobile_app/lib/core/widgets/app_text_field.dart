// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The design's `.field` + `.input`.
///
/// A label *above* the box rather than Material's floating label, a 52px box
/// with a 15px radius and a 1.5px border, and on focus a brand border with a
/// 4px halo. The error message sits under the field in danger colour.
///
/// Validation is live (see [onChanged] / [onBlur]): the field reports every
/// change and every focus loss, and the view model decides when an error is
/// allowed to show. That is what keeps a learner from being told their email is
/// invalid while they are still typing the first character.
class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    this.label,
    required this.hint,
    required this.controller,
    this.errorText,
    this.keyboardType,
    this.textInputAction,
    this.obscure = false,
    this.enabled = true,
    this.autofillHints,
    this.onChanged,
    this.onBlur,
    this.onSubmitted,
    this.prefixIcon,
  });

  /// Shown above the box. Optional: omit it where the hint already says
  /// everything, such as a search field with a magnifier in it. [hint] stays
  /// required either way.
  final String? label;

  /// Placeholder shown while the field is empty.
  ///
  /// **Required on purpose.** A bare labelled box tells the learner the field's
  /// name but not what a valid value looks like; every field in this app shows
  /// an example or an instruction. Making it required means a new field cannot
  /// quietly ship without one.
  final String hint;

  final TextEditingController controller;
  final String? errorText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscure;
  final bool enabled;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onBlur;
  final ValueChanged<String>? onSubmitted;
  final IconData? prefixIcon;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  final FocusNode _focus = FocusNode();
  bool _focused = false;
  bool _reveal = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (!mounted) return;
      setState(() => _focused = _focus.hasFocus);
      // Losing focus is the first moment it is fair to show an error.
      if (!_focus.hasFocus) widget.onBlur?.call();
    });
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final bool hasError = (widget.errorText ?? '').isNotEmpty;

    final Color borderColor = hasError
        ? brand.danger
        : _focused
        ? brand.brandFill
        : context.colors.outline;

    final String label = widget.label ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (label.isNotEmpty) ...<Widget>[
          Text(
            label,
            style: context.text.bodySmall?.copyWith(
              fontSize: fs(13),
              fontWeight: FontWeight.w600,
              color: brand.muted,
            ),
          ),
          const SizedBox(height: AppSpace.xs),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: AppMotion.standard,
          height: 52,
          decoration: BoxDecoration(
            color: context.colors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: _focused && !hasError
                ? <BoxShadow>[
                    BoxShadow(
                      color: brand.brandFill.withValues(alpha: 0.18),
                      spreadRadius: 4,
                    ),
                  ]
                : const <BoxShadow>[],
          ),
          child: Row(
            children: <Widget>[
              if (widget.prefixIcon != null) ...<Widget>[
                const SizedBox(width: AppSpace.md),
                Icon(widget.prefixIcon, size: 20, color: brand.muted),
              ],
              Expanded(
                child: TextField(
                  controller: widget.controller,
                  focusNode: _focus,
                  enabled: widget.enabled,
                  obscureText: widget.obscure && !_reveal,
                  keyboardType: widget.keyboardType,
                  textInputAction: widget.textInputAction,
                  autocorrect: false,
                  autofillHints: widget.autofillHints,
                  onChanged: widget.onChanged,
                  onSubmitted: widget.onSubmitted,
                  style: context.text.bodyLarge?.copyWith(fontSize: fs(16)),
                  decoration: InputDecoration(
                    hintText: widget.hint,
                    hintStyle: context.text.bodyLarge?.copyWith(
                      fontSize: fs(16),
                      color: brand.muted,
                      fontWeight: FontWeight.w400,
                    ),
                    // The box is drawn by the container above; strip Material's.
                    isDense: true,
                    filled: false,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: widget.prefixIcon == null
                          ? AppSpace.lg
                          : AppSpace.sm,
                    ),
                  ),
                ),
              ),
              if (widget.obscure)
                IconButton(
                  iconSize: 20,
                  color: brand.muted,
                  icon: Icon(
                    _reveal
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                  ),
                  onPressed: () => setState(() => _reveal = !_reveal),
                ),
            ],
          ),
        ),
        // Reserve nothing when there is no error: the design lets the form
        // reflow rather than holding an empty gap under every field.
        AnimatedSize(
          duration: AppMotion.fadeIn,
          curve: AppMotion.standard,
          alignment: Alignment.topLeft,
          child: hasError
              ? Padding(
                  padding: const EdgeInsets.only(top: AppSpace.xs),
                  child: Text(
                    widget.errorText!,
                    style: context.text.bodySmall?.copyWith(
                      fontSize: fs(13),
                      fontWeight: FontWeight.w600,
                      color: brand.danger,
                    ),
                  ),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }
}
