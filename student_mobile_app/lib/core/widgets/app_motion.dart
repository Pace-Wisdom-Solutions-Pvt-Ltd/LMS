// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// Motion primitives, ported one-for-one from the prototype's keyframes.
///
/// Every one of them checks `context.reduceMotion` and renders the final state
/// immediately when the OS asks for reduced motion.

/// `@keyframes rise` + `.stagger > *`: entrance for list and column children.
///
/// `translateY(14px) → 0`, `opacity 0 → 1`, 460ms on `emphasizedDecelerate`,
/// delayed `index * 45ms + 60ms`. Entrance animations run **once** — this plays
/// on mount and never replays on rebuild.
class StaggerRise extends StatefulWidget {
  const StaggerRise({
    super.key,
    required this.index,
    required this.child,
    this.offset = 14,
  });

  final int index;
  final Widget child;
  final double offset;

  @override
  State<StaggerRise> createState() => _StaggerRiseState();
}

class _StaggerRiseState extends State<StaggerRise>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: AppMotion.rise,
  );
  Timer? _delay;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (context.reduceMotion) {
        _controller.value = 1;
        return;
      }
      _delay = Timer(Duration(milliseconds: widget.index * 45 + 60), () {
        if (mounted) _controller.forward();
      });
    });
  }

  @override
  void dispose() {
    _delay?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (_, Widget? child) {
      final double t = AppMotion.decelerate.transform(_controller.value);
      return Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, widget.offset * (1 - t)),
          child: child,
        ),
      );
    },
    child: widget.child,
  );
}

/// Wraps a column's children in [StaggerRise], numbering them in order.
List<Widget> staggered(List<Widget> children, {int from = 0}) => <Widget>[
  for (int i = 0; i < children.length; i++)
    StaggerRise(index: from + i, child: children[i]),
];

/// `.btn:active` / `.press:active`: `scale(.96)` over 150ms.
class PressScale extends StatefulWidget {
  const PressScale({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.96,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  void _set(bool value) {
    if (_down == value) return;
    setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    final bool enabled = widget.onTap != null;
    return GestureDetector(
      onTapDown: enabled ? (_) => _set(true) : null,
      onTapUp: enabled ? (_) => _set(false) : null,
      onTapCancel: enabled ? () => _set(false) : null,
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _down && !context.reduceMotion ? widget.scale : 1,
        duration: AppMotion.press,
        curve: AppMotion.standard,
        child: widget.child,
      ),
    );
  }
}

/// `@keyframes shake`: the rejected-credentials nudge.
///
/// The prototype's exact stops — `10%,90%: -2px`, `20%,80%: 4px`,
/// `30%,50%,70%: -7px`, `40%,60%: 7px` — over 420ms. Replays whenever [token]
/// changes.
class ShakeOnChange extends StatefulWidget {
  const ShakeOnChange({super.key, required this.token, required this.child});

  final int token;
  final Widget child;

  @override
  State<ShakeOnChange> createState() => _ShakeOnChangeState();
}

class _ShakeOnChangeState extends State<ShakeOnChange>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );

  late final Animation<double> _offset = TweenSequence<double>(
    <TweenSequenceItem<double>>[
      _step(0, -2, 10),
      _step(-2, 4, 10),
      _step(4, -7, 10),
      _step(-7, 7, 10),
      _step(7, -7, 10),
      _step(-7, 7, 10),
      _step(7, -7, 10),
      _step(-7, 4, 10),
      _step(4, -2, 10),
      _step(-2, 0, 10),
    ],
  ).animate(CurvedAnimation(parent: _controller, curve: AppMotion.standard));

  static TweenSequenceItem<double> _step(double a, double b, double weight) =>
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: a, end: b),
        weight: weight,
      );

  @override
  void didUpdateWidget(covariant ShakeOnChange oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.token != oldWidget.token && widget.token > 0) {
      if (context.reduceMotion) return;
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _offset,
    builder: (_, Widget? child) =>
        Transform.translate(offset: Offset(_offset.value, 0), child: child),
    child: widget.child,
  );
}

/// `@keyframes pulse`: an expanding brand-coloured halo behind a call to
/// action. 2.4s, infinite. Used on the "continue" affordance and the current
/// roadmap node.
class PulseHalo extends StatefulWidget {
  const PulseHalo({
    super.key,
    required this.child,
    this.color,
    this.period = const Duration(milliseconds: 2400),
    this.maxSpread = 12,
  });

  final Widget child;
  final Color? color;
  final Duration period;
  final double maxSpread;

  @override
  State<PulseHalo> createState() => _PulseHaloState();
}

class _PulseHaloState extends State<PulseHalo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !context.reduceMotion) _controller.repeat();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Color color = widget.color ?? context.brand.brandFill;
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, Widget? child) {
        // 0 → 70%: spread grows and alpha fades. 70% → 100%: nothing.
        final double t = (_controller.value / 0.7).clamp(0.0, 1.0);
        return DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: color.withValues(alpha: 0.45 * (1 - t)),
                spreadRadius: widget.maxSpread * t,
              ),
            ],
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
