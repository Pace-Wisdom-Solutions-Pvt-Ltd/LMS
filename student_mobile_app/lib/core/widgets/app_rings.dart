// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:lms/utils/app_exports.dart';

/// The concentric learning rings from the design.
///
/// Gradient arcs drawn outside-in with a 4px gap — one per value, at most
/// three. They animate on a `ringDraw` curve, staggered by `ringStagger`, and
/// under reduced motion they appear at their final value with no sweep.
class LearningRings extends StatefulWidget {
  const LearningRings({
    super.key,
    required this.values,
    this.size = 136,
    this.stroke = 14,
    this.gap = 4,
    this.center,
  });

  /// 0..1 per ring, outermost first. At most three.
  final List<double> values;
  final double size;
  final double stroke;
  final double gap;
  final Widget? center;

  @override
  State<LearningRings> createState() => _LearningRingsState();
}

class _LearningRingsState extends State<LearningRings>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    // The longest ring plus its stagger.
    duration: AppMotion.ringDraw + AppMotion.ringStagger * 2,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (context.reduceMotion) {
        _controller.value = 1;
      } else {
        _controller.forward();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final List<List<Color>> gradients = <List<Color>>[
      brand.ring1,
      brand.ring2,
      brand.ring3,
    ];

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (BuildContext context, Widget? child) => CustomPaint(
          painter: _RingsPainter(
            values: widget.values,
            gradients: gradients,
            track: brand.track,
            stroke: widget.stroke,
            gap: widget.gap,
            progress: _controller.value,
            totalMs: (AppMotion.ringDraw + AppMotion.ringStagger * 2)
                .inMilliseconds
                .toDouble(),
            drawMs: AppMotion.ringDraw.inMilliseconds.toDouble(),
            staggerMs: AppMotion.ringStagger.inMilliseconds.toDouble(),
          ),
          child: child,
        ),
        child: widget.center == null ? null : Center(child: widget.center),
      ),
    );
  }
}

class _RingsPainter extends CustomPainter {
  _RingsPainter({
    required this.values,
    required this.gradients,
    required this.track,
    required this.stroke,
    required this.gap,
    required this.progress,
    required this.totalMs,
    required this.drawMs,
    required this.staggerMs,
  });

  final List<double> values;
  final List<List<Color>> gradients;
  final Color track;
  final double stroke;
  final double gap;
  final double progress;
  final double totalMs;
  final double drawMs;
  final double staggerMs;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);

    for (int i = 0; i < values.length && i < gradients.length; i++) {
      final double radius =
          (size.width / 2) - (stroke / 2) - (i * (stroke + gap));
      if (radius <= 0) continue;

      final Rect rect = Rect.fromCircle(center: center, radius: radius);

      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..color = track,
      );

      // Each ring starts `staggerMs` after the one outside it.
      final double start = (i * staggerMs) / totalMs;
      final double end = ((i * staggerMs) + drawMs) / totalMs;
      final double local = progress <= start
          ? 0
          : progress >= end
          ? 1
          : (progress - start) / (end - start);
      final double eased = AppMotion.ring.transform(local.clamp(0.0, 1.0));
      final double sweep = 2 * math.pi * values[i].clamp(0.0, 1.0) * eased;
      if (sweep <= 0) continue;

      canvas.drawArc(
        rect,
        -math.pi / 2,
        sweep,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.round
          ..shader = ui.Gradient.sweep(
            center,
            gradients[i],
            <double>[0, 1],
            TileMode.clamp,
            -math.pi / 2,
            (3 * math.pi) / 2,
          ),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RingsPainter old) =>
      old.progress != progress || old.values != values || old.track != track;
}

/// A single large ring with a score in the middle, for quiz
/// results.
class ScoreRing extends StatelessWidget {
  const ScoreRing({
    super.key,
    required this.value,
    required this.child,
    this.size = 190,
    this.stroke = 16,
    this.color,
  });

  final double value;
  final Widget child;
  final double size;
  final double stroke;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final Color ring = color ?? brand.brandFill;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: value.clamp(0.0, 1.0)),
      duration: context.reduceMotion ? Duration.zero : AppMotion.ringDraw,
      curve: AppMotion.ring,
      builder: (BuildContext context, double t, Widget? c) => SizedBox(
        width: size,
        height: size,
        child: Stack(
          alignment: Alignment.center,
          children: <Widget>[
            CustomPaint(
              size: Size.square(size),
              painter: _ScorePainter(
                value: t,
                color: ring,
                track: brand.track,
                stroke: stroke,
              ),
            ),
            c!,
          ],
        ),
      ),
      child: child,
    );
  }
}

class _ScorePainter extends CustomPainter {
  _ScorePainter({
    required this.value,
    required this.color,
    required this.track,
    required this.stroke,
  });

  final double value;
  final Color color;
  final Color track;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = Offset(size.width / 2, size.height / 2);
    final double radius = (size.width / 2) - (stroke / 2);

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = track,
    );

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * value,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(covariant _ScorePainter old) =>
      old.value != value || old.color != color;
}

/// `.bar`: an 8px track with a gradient fill that grows from the left.
class ProgressBar extends StatelessWidget {
  const ProgressBar({
    super.key,
    required this.value,
    this.height = 8,
    this.colors,
  });

  final double value;
  final double height;
  final List<Color>? colors;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final List<Color> fill = colors ?? brand.ring1;

    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: SizedBox(
        height: height,
        child: Stack(
          children: <Widget>[
            Container(color: brand.track),
            TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: value.clamp(0.0, 1.0)),
              duration: context.reduceMotion
                  ? Duration.zero
                  : AppMotion.countUp,
              curve: AppMotion.decelerate,
              // `heightFactor: 1` is load-bearing. Without it the inner
              // constraints stay loose vertically, and a childless
              // DecoratedBox takes the smallest size it is allowed — zero
              // height — so the gradient never appears and the bar reads as a
              // plain grey track at every percentage.
              builder: (_, double t, _) => FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: t,
                heightFactor: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: fill),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// `.chip`: a stadium pill. [tone] picks the colour pair.
enum ChipTone { neutral, brand, success, warning, danger }

class AppChip extends StatelessWidget {
  const AppChip({
    super.key,
    required this.label,
    this.icon,
    this.tone = ChipTone.neutral,
  });

  final String label;
  final IconData? icon;
  final ChipTone tone;

  @override
  Widget build(BuildContext context) {
    final BrandColors b = context.brand;
    final (Color bg, Color fg) = switch (tone) {
      ChipTone.neutral => (context.colors.surfaceContainerHighest, b.muted),
      ChipTone.brand => (b.brandSoft, b.brandText),
      ChipTone.success => (b.successContainer, b.success),
      ChipTone.warning => (b.warningContainer, b.warning),
      ChipTone.danger => (b.dangerContainer, b.danger),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              label,
              style: context.text.labelMedium?.copyWith(color: fg, height: 1),
            ),
          ),
        ],
      ),
    );
  }
}

/// `.card`: surface, hairline outline, 22px radius.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpace.lg),
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final Widget box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: context.colors.outline),
      ),
      child: child,
    );
    return onTap == null ? box : PressScale(onTap: onTap, child: box);
  }
}
