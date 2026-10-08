// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:flutter_svg/flutter_svg.dart';
import 'package:lms/utils/app_exports.dart';

/// The app's own default mark, shipped as an asset.
///
/// Shown until an organization is known; once one is, [BrandMark] swaps in that
/// org's logo. Kept as a separate widget because the splash and the sign-in
/// backdrop use it directly, independent of whatever org is resolved.
///
/// **The transparent variant, not the launcher one.** `app_logo.png` is
/// matted onto a flat background because a launcher icon has to be — iOS
/// rejects an alpha channel outright — and that matte is a visible tile
/// wherever the mark sits on the app's own surface, which is most places it
/// appears. `flutter_launcher_icons` keeps using `app_logo.png`; everything
/// drawn inside the app uses this one.
///
/// **The format follows the file name**, so replacing [asset] with an `.svg`
/// needs no code change. It used to point at an `assets/app_icon.svg` that was
/// never added, which rendered nothing at all.
class AppIcon extends StatelessWidget {
  const AppIcon({super.key, this.size = 44, this.opacity = 1});

  static const String asset = 'assets/app_logo_transparent.png';

  final double size;

  /// For the sign-in backdrop, where the mark is a watermark rather than a
  /// subject.
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final bool isSvg = asset.toLowerCase().endsWith('.svg');
    final Widget mark = isSvg
        ? SvgPicture.asset(
            asset,
            width: size,
            height: size,
            fit: BoxFit.contain,
          )
        : Image.asset(
            asset,
            width: size,
            height: size,
            fit: BoxFit.contain,
            // A missing or unreadable asset must not put a broken-image glyph
            // on the splash; nothing is better than an error box.
            errorBuilder: (_, _, _) => SizedBox(width: size, height: size),
          );

    return opacity >= 1 ? mark : Opacity(opacity: opacity, child: mark);
  }
}

/// The organization's mark.
///
/// Resolution order (FR-LOGO-1): the org's logo URL → a **monogram tile** built
/// from the org name on the brand fill → the app's own [AppIcon]. There is
/// deliberately no broken-image state, and nothing here waits on the network:
/// the fallback renders immediately and the image swaps in when it arrives.
///
/// Both SVG and raster logos are supported; anything that fails to decode falls
/// back rather than showing an error box.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 44, this.radius});

  final double size;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final BrandingProvider branding = context.watch<BrandingProvider>();
    final String? url = branding.logoUrl;
    final double r = radius ?? AppRadius.tile;

    final Widget fallback = branding.orgName.trim().isEmpty
        // No organization yet (pre-login) — the app's own icon, unframed.
        ? AppIcon(size: size)
        : _MonogramTile(orgName: branding.orgName, size: size, radius: r);

    if (url == null || url.trim().isEmpty) return fallback;

    // Presigned: the extension is followed by the whole AWS query string, so
    // this has to read the path rather than the URL. See [looksLikeSvg].
    final bool isSvg = looksLikeSvg(url);

    return ClipRRect(
      borderRadius: BorderRadius.circular(r),
      child: SizedBox(
        width: size,
        height: size,
        child: isSvg
            ? SvgPicture.network(
                url,
                width: size,
                height: size,
                fit: BoxFit.contain,
                placeholderBuilder: (_) => fallback,
                errorBuilder: (_, _, _) => fallback,
              )
            : CachedNetworkImage(
                imageUrl: url,
                width: size,
                height: size,
                fit: BoxFit.contain,
                placeholder: (_, _) => fallback,
                errorWidget: (_, _, _) => fallback,
              ),
      ),
    );
  }
}

/// First letters of the first two words of the org name, on the brand fill.
class _MonogramTile extends StatelessWidget {
  const _MonogramTile({
    required this.orgName,
    required this.size,
    required this.radius,
  });

  final String orgName;
  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final String text = monogramOf(orgName);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: brand.brandFill,
        borderRadius: BorderRadius.circular(radius),
      ),
      alignment: Alignment.center,
      child: Text(
        text.isEmpty ? '?' : text,
        style: context.text.titleMedium?.copyWith(
          color: brand.onBrand,
          fontSize: size * 0.38,
          fontWeight: FontWeight.w800,
          height: 1,
        ),
      ),
    );
  }
}

/// Initials for a monogram tile: the first letters of the first two words.
String monogramOf(String name) {
  final List<String> words = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((String w) => w.isNotEmpty)
      .toList();
  if (words.isEmpty) return '';
  if (words.length == 1) return words.first.characters.first.toUpperCase();
  return (words[0].characters.first + words[1].characters.first).toUpperCase();
}

/// The watermark behind the sign-in form.
///
/// Deliberately **static and low-contrast**. It used to spin once a minute,
/// which only works for a mark designed for it — and this one is replaced at
/// runtime by whatever logo an organization uploads. A placeholder is all it
/// is, so it reads as one.
class AuthBackdropMark extends StatelessWidget {
  const AuthBackdropMark({super.key, required this.size, this.opacity = 0.06});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: AppIcon(size: size, opacity: opacity),
  );
}
