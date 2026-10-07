// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The control in front of an answer option: a **radio** when only one answer
/// may be picked, a **checkbox** when several may.
///
/// Shared by the quiz (where it is tappable state) and the result review
/// (where it is a record of what was chosen), so the two can never disagree
/// about what shape means what.
///
/// Drawn rather than taken from Material, so the fill, the stroke width and
/// the corner radius match the tile around it in either theme.
///
/// **Always a rounded rectangle, never `BoxShape.circle`.** At [size] 24 a
/// radius of 12 *is* a circle, and the radius lerps cleanly to 7 when the next
/// question wants checkboxes instead of radios. `BoxShape.circle` cannot:
/// moving between a single- and a multi-answer question reuses this element,
/// so `AnimatedContainer` lerps the two decorations, and `BoxDecoration.lerp`
/// takes the shape from one end and the radius from the other — a circle with
/// a border radius, which asserts mid-animation.
class ChoiceIndicator extends StatelessWidget {
  const ChoiceIndicator({
    super.key,
    required this.picked,
    required this.multiple,
    this.size = 24,
  });

  final bool picked;

  /// Whether the question accepts more than one answer.
  final bool multiple;

  final double size;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: AppMotion.standard,
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: picked ? brand.brandFill : Colors.transparent,
        // A circle asks for one answer, a rounded square for any number.
        borderRadius: BorderRadius.circular(multiple ? size * 0.29 : size / 2),
        border: Border.all(
          color: picked ? brand.brandFill : context.colors.outline,
          width: 2,
        ),
      ),
      alignment: Alignment.center,
      child: picked
          ? Icon(
              multiple ? Icons.check_rounded : Icons.circle,
              size: multiple ? size * 0.67 : size * 0.42,
              color: brand.onBrand,
            )
          : null,
    );
  }
}
