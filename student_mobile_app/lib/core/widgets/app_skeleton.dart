// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';
import 'package:shimmer/shimmer.dart';

/// Shimmering placeholders shaped like the content they stand in for.
///
/// The rule from the shell spec: skeletons, never a full-screen spinner after
/// the first load. Build a skeleton that matches the real layout's boxes — a
/// generic grey rectangle tells the learner nothing about what is coming.
///
/// Respects reduced motion: the shimmer sweep is dropped and the placeholder
/// renders as a static block.
class AppShimmer extends StatelessWidget {
  const AppShimmer({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    if (context.reduceMotion) return child;

    return Shimmer.fromColors(
      baseColor: brand.track,
      highlightColor: Color.lerp(brand.track, context.colors.surface, 0.6)!,
      period: const Duration(milliseconds: 1200),
      child: child,
    );
  }
}

/// A single grey block. Wrap a tree of these in one [AppShimmer].
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height = 16, this.radius = 8});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: context.brand.track,
      borderRadius: BorderRadius.circular(radius),
    ),
  );
}

class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: context.brand.track,
      shape: BoxShape.circle,
    ),
  );
}

/// A card-shaped placeholder: icon, title line, subtitle line.
class SkeletonTile extends StatelessWidget {
  const SkeletonTile({super.key, this.height = 84});

  final double height;

  @override
  Widget build(BuildContext context) => Container(
    height: height,
    padding: const EdgeInsets.all(AppSpace.lg),
    decoration: BoxDecoration(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(AppRadius.card),
      border: Border.all(color: context.colors.outline),
    ),
    child: Row(
      children: <Widget>[
        const SkeletonBox(width: 44, height: 44, radius: AppRadius.tile),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const SkeletonBox(height: 14, width: 160),
              const SizedBox(height: AppSpace.sm),
              SkeletonBox(
                height: 12,
                width: MediaQuery.sizeOf(context).width * 0.35,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// A list of [SkeletonTile]s, for a screen's first load.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.itemCount = 4, this.tileHeight = 84});

  final int itemCount;
  final double tileHeight;

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      children: <Widget>[
        for (int i = 0; i < itemCount; i++) ...<Widget>[
          SkeletonTile(height: tileHeight),
          if (i != itemCount - 1) const SizedBox(height: AppSpace.md),
        ],
      ],
    ),
  );
}
