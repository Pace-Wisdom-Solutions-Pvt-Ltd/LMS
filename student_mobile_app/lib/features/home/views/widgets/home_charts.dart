// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:math' as math;

import 'package:lms/utils/app_exports.dart';

/// The 270° gauge on "Overall Progress".
///
/// A three-quarter arc opening at the bottom, brand-gradient fill over a flat
/// track, with round caps so an empty gauge still shows a dot rather than
/// nothing. The sweep animates unless the OS asks for reduced motion.
class GaugeArc extends StatelessWidget {
  const GaugeArc({
    super.key,
    required this.value,
    this.size = 200,
    this.stroke = 18,
    this.center,
  });

  /// 0..1. Values outside that range are clamped rather than drawn wrong.
  final double value;
  final double size;
  final double stroke;
  final Widget? center;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0, end: value.clamp(0.0, 1.0)),
        duration: context.reduceMotion ? Duration.zero : AppMotion.ringDraw,
        curve: AppMotion.decelerate,
        builder: (BuildContext context, double t, Widget? child) => CustomPaint(
          painter: _GaugePainter(
            value: t,
            gradient: brand.ring1,
            track: brand.track,
            stroke: stroke,
          ),
          child: child,
        ),
        child: center == null ? null : Center(child: center),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({
    required this.value,
    required this.gradient,
    required this.track,
    required this.stroke,
  });

  final double value;
  final List<Color> gradient;
  final Color track;
  final double stroke;

  /// Opens at the bottom: start bottom-left, sweep 270° clockwise.
  static const double _start = math.pi * 0.75;
  static const double _sweep = math.pi * 1.5;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect rect = Offset.zero & size;
    final Rect arcRect = rect.deflate(stroke / 2);

    final Paint base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(arcRect, _start, _sweep, false, base..color = track);

    if (value <= 0) return;
    canvas.drawArc(
      arcRect,
      _start,
      _sweep * value,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = LinearGradient(
          begin: Alignment.bottomLeft,
          end: Alignment.topRight,
          colors: gradient,
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.value != value || old.track != track || old.gradient != gradient;
}

/// The colours of the course-status donut: one green at two weights, over the
/// flat track.
///
/// **Deliberately not brand-derived.** These were originally the two ends of
/// `brand.ring1`, which is `[primary, lerp(primary, accent, 0.45)]` for a
/// branded organization — two points on one short gradient, so "completed" and
/// "in progress" came out nearly the same colour, and *exactly* the same
/// colour for an org that sets a primary but no accent, because `accent` falls
/// back to `primary`. A status scale has to stay legible whatever hex an admin
/// picks, so it uses `success` the way `ring3` stays amber.
abstract final class CourseStatusColors {
  /// Full-strength green, brightness-aware so it holds up in dark mode.
  static Color completed(BuildContext context) => context.brand.success;

  /// The same green at part strength.
  ///
  /// Blended into the surface rather than drawn with an alpha, so the wedge
  /// and its 10px legend dot are the same colour no matter what ends up behind
  /// them, and so two touching arcs cannot show a seam.
  ///
  /// The weight is brightness-dependent on purpose: tinting toward a white
  /// surface lightens, toward a dark one darkens, and a single factor would
  /// push the dark-mode tint down onto [notStarted]. 0.45/0.55 keeps roughly
  /// 0.3 relative luminance from *both* neighbours in either mode.
  static Color inProgress(BuildContext context) {
    final bool isDark = context.theme.brightness == Brightness.dark;
    return Color.lerp(
      context.colors.surface,
      context.brand.success,
      isDark ? 0.55 : 0.45,
    )!;
  }

  /// The same flat track the progress bars use, so "nothing yet" looks like
  /// an empty bar rather than a third status colour.
  static Color notStarted(BuildContext context) => context.brand.track;
}

/// One slice of [StatusDonut].
class DonutSlice {
  const DonutSlice({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;
}

/// The "Course Status" donut: one arc per slice, drawn clockwise from twelve
/// o'clock, with the total in the hole.
///
/// An all-zero set draws the track alone rather than dividing by zero.
class StatusDonut extends StatelessWidget {
  const StatusDonut({
    super.key,
    required this.slices,
    this.size = 150,
    this.stroke = 26,
    this.center,
  });

  final List<DonutSlice> slices;
  final double size;
  final double stroke;
  final Widget? center;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0, end: 1),
        duration: context.reduceMotion ? Duration.zero : AppMotion.ringDraw,
        curve: AppMotion.decelerate,
        builder: (BuildContext context, double t, Widget? child) => CustomPaint(
          painter: _DonutPainter(
            slices: slices,
            progress: t,
            track: context.brand.track,
            stroke: stroke,
          ),
          child: child,
        ),
        child: center == null ? null : Center(child: center),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({
    required this.slices,
    required this.progress,
    required this.track,
    required this.stroke,
  });

  final List<DonutSlice> slices;
  final double progress;
  final Color track;
  final double stroke;

  static const double _start = -math.pi / 2;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect arcRect = (Offset.zero & size).deflate(stroke / 2);
    final Paint paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;

    final int total = slices.fold<int>(
      0,
      (int sum, DonutSlice s) => sum + s.count,
    );
    if (total <= 0) {
      canvas.drawCircle(
        arcRect.center,
        arcRect.width / 2,
        paint..color = track,
      );
      return;
    }

    double angle = _start;
    for (final DonutSlice slice in slices) {
      if (slice.count <= 0) continue;
      final double sweep = 2 * math.pi * (slice.count / total) * progress;
      canvas.drawArc(arcRect, angle, sweep, false, paint..color = slice.color);
      angle += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter old) =>
      old.progress != progress ||
      old.track != track ||
      old.stroke != stroke ||
      _signature(old.slices) != _signature(slices);

  /// The slices are rebuilt every frame, so identity is useless — compare what
  /// actually changes the painting.
  static String _signature(List<DonutSlice> slices) => slices
      .map((DonutSlice s) => '${s.count}:${s.color.toARGB32()}')
      .join('|');
}
