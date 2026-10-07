// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// White-label branding.
//
// An organization's colours arrive as arbitrary hex from an admin form and are
// routinely null or empty. A bad value must never throw and must never produce
// a black theme, and a pale brand must never render as unreadable text.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

import 'support/fake_api.dart';

void main() {
  group('AppBrand.fromOrg', () {
    test('parses a valid pair', () {
      final AppBrand brand = AppBrand.fromOrg('#0F766E', '#14B8A6');

      expect(brand.primary, const Color(0xFF0F766E));
      expect(brand.accent, const Color(0xFF14B8A6));
      expect(brand.usesDefaultRings, isFalse);
    });

    test('accepts a hex without the leading hash', () {
      expect(AppBrand.fromOrg('0F766E', null).primary, const Color(0xFF0F766E));
    });

    test('falls back when the org sets nothing', () {
      for (final String? value in <String?>[null, '', '   ']) {
        expect(AppBrand.fromOrg(value, value), AppBrand.fallback);
      }
    });

    test('falls back on an unparseable colour rather than throwing', () {
      for (final String value in <String>[
        'nope',
        '#12',
        '#1234567',
        'rgb(1,2,3)',
      ]) {
        expect(AppBrand.fromOrg(value, null), AppBrand.fallback);
      }
    });

    test('an accent alone does not brand the app', () {
      expect(AppBrand.fromOrg(null, '#14B8A6'), AppBrand.fallback);
    });

    test('a missing accent reuses the primary', () {
      final AppBrand brand = AppBrand.fromOrg('#0F766E', null);
      expect(brand.accent, brand.primary);
    });

    test('round-trips through hex, so it can be cached', () {
      final AppBrand brand = AppBrand.fromOrg('#0F766E', '#14B8A6');
      final AppBrand restored = AppBrand.fromOrg(
        brand.primaryHex,
        brand.accentHex,
      );
      expect(restored, brand);
    });
  });

  group('contrast', () {
    test('brand text stays readable on both surfaces', () {
      // A pale yellow is the worst case: raw, it is invisible on white.
      final AppBrand pale = AppBrand.fromOrg('#FFF176', null);

      expect(
        contrastRatio(pale.textFor(Brightness.light), AppPalette.lSurface),
        greaterThanOrEqualTo(4.5),
      );
      expect(
        contrastRatio(pale.textFor(Brightness.dark), AppPalette.dSurface),
        greaterThanOrEqualTo(4.5),
      );
    });

    test('a dark brand fill is lightened for dark mode', () {
      final AppBrand navy = AppBrand.fromOrg('#0B1020', null);
      expect(
        contrastRatio(navy.fillFor(Brightness.dark), AppPalette.dSurface),
        greaterThanOrEqualTo(3.0),
      );
    });

    test('a brand fill always carries a white label', () {
      // Black on a brand green reads as a disabled control whatever the
      // arithmetic says, so the label never flips — see deepenForWhiteText.
      for (final String hex in <String>[
        '#16A34A', // green
        '#FFF176', // pale yellow, the worst case
        '#0B1020', // navy
      ]) {
        final AppBrand brand = AppBrand.fromOrg(hex, null);
        for (final Brightness b in Brightness.values) {
          expect(brand.onFillFor(b), AppPalette.white);
          expect(
            contrastRatio(AppPalette.white, brand.fillFor(b)),
            greaterThanOrEqualTo(3.0),
            reason: '$hex is deepened until white reads on it',
          );
        }
      }
    });

    test('a fill that already carries white is left alone', () {
      // Only a pale brand is darkened, and only as far as it has to be — a
      // green that white already reads on must come back untouched.
      const Color green = Color(0xFF16A34A);
      expect(deepenForWhiteText(green), green);
    });

    test('onColor still picks the better of white or ink', () {
      // Still the rule for the semantic fills — the tracker's success and
      // danger dots, whose dark-mode greens and reds white fails on.
      expect(onColor(const Color(0xFF0D1B2A)), AppPalette.white);
      expect(onColor(const Color(0xFFFFF176)), AppPalette.ink);
    });
  });

  group('rings', () {
    test('the XP ring stays amber whatever the org brand', () {
      final AppBrand branded = AppBrand.fromOrg('#0F766E', '#14B8A6');
      expect(branded.ring3(), AppBrand.fallback.ring3());
    });

    test('a branded org derives its rings from its own pair', () {
      final AppBrand branded = AppBrand.fromOrg('#0F766E', '#14B8A6');
      expect(branded.ring1().first, const Color(0xFF0F766E));
      expect(branded.ring1(), isNot(AppBrand.fallback.ring1()));
    });
  });

  group('OrgBranding', () {
    test('reads the authenticated organization record', () {
      final OrgBranding b = OrgBranding.fromOrganization(<String, dynamic>{
        'name': 'Demo Academy',
        'logo': null,
        'primary_color': '#0F766E',
        'accent_color': '#14B8A6',
      });

      expect(b.orgName, 'Demo Academy');
      expect(b.hasLogo, isFalse);
      expect(b.brand.usesDefaultRings, isFalse);
    });

    test('empty colour strings are not a brand', () {
      final OrgBranding b = OrgBranding.fromOrganization(<String, dynamic>{
        'name': 'Demo Academy',
        'logo': 'https://cdn.test/logo.svg',
        'primary_color': '',
        'accent_color': null,
      });

      expect(b.hasLogo, isTrue);
      expect(b.logoUrl, 'https://cdn.test/logo.svg');
      expect(b.brand, AppBrand.fallback);
    });
  });

  group('BrandingProvider.refresh', () {
    late Directory tempDir;
    final FakeApi api = FakeApi();
    const int orgId = 2;

    setUpAll(() async {
      TestWidgetsFlutterBinding.ensureInitialized();
      dotenv.loadFromString(envString: 'API_BASE_URL=https://api.test.local');
      tempDir = await Directory.systemTemp.createTemp('lms_brand_');
      Hive.init(tempDir.path);
      for (final String box in HSBox.all) {
        await Hive.openBox<dynamic>(box);
      }
      api.install();
    });

    tearDownAll(() async {
      await Hive.close();
      await tempDir.delete(recursive: true);
    });

    setUp(() async {
      api.reset();
      await HiveStorage.clearAllBoxes();
    });

    void serveOrg({String primary = '#0F766E', String name = 'Demo Academy'}) =>
        api.on(
          ApiEndPoints.organization(orgId),
          status: 200,
          body: <String, dynamic>{
            'id': orgId,
            'name': name,
            'primary_color': primary,
            'accent_color': null,
          },
        );

    int orgCalls() => api.requests
        .where((RequestOptions r) => r.path == ApiEndPoints.organization(orgId))
        .length;

    test(
      'refetches every time it is called, with no cadence to wait out',
      () async {
        // It used to skip the call for 24 hours off a cached timestamp, so an
        // admin changing a colour could not be seen by relaunching.
        serveOrg();
        final BrandingProvider branding = BrandingProvider();
        addTearDown(branding.dispose);

        await branding.refresh(orgId);
        expect(orgCalls(), 1);

        await branding.refresh(orgId);
        expect(orgCalls(), 2, reason: 'a second launch asks again');
      },
    );

    test('picks up a brand changed since the last fetch', () async {
      serveOrg(primary: '#0F766E');
      final BrandingProvider branding = BrandingProvider();
      addTearDown(branding.dispose);

      await branding.refresh(orgId);
      final Color first = branding.brand.primary;

      serveOrg(primary: '#B91C1C', name: 'Demo Academy Ltd');
      await branding.refresh(orgId);

      expect(branding.brand.primary, isNot(first));
      expect(branding.orgName, 'Demo Academy Ltd');
      expect(
        HiveStorage.get<String>(HSKeys.brandPrimary),
        '#B91C1C',
        reason: 'and the new one is what the next launch hydrates from',
      );
    });

    test('empty means nothing known, not merely an unbranded org', () async {
      // The splash waits on the fetch only when this is true, so an org that
      // has a name and a logo and sets no colours must not read as empty —
      // that org is known, and waiting for it every launch would put the
      // network in front of Home.
      expect(OrgBranding.empty.isEmpty, isTrue);
      expect(
        const OrgBranding(orgName: 'Demo Academy').isEmpty,
        isFalse,
        reason: 'a name is something to show',
      );
      expect(
        const OrgBranding(logoUrl: 'https://cdn.test/logo.svg').isEmpty,
        isFalse,
      );
      expect(const OrgBranding(primaryColor: '#0F766E').isEmpty, isFalse);
    });

    test('the brand comes from the org record, not from a membership', () async {
      // The login response says which organizations an account belongs to and
      // nothing about how any of them looks — no name, no logo, no colours.
      // `applyMembership` used to seed the name from it; the record is now the
      // only source, which is why the sign-in screen waits for it.
      serveOrg(primary: '#0F766E', name: 'Demo Academy');

      final BrandingProvider branding = BrandingProvider();
      addTearDown(branding.dispose);

      expect(branding.orgName, isEmpty);
      expect(branding.isEmpty, isTrue);

      await branding.refresh(orgId);

      expect(branding.orgName, 'Demo Academy');
      expect(branding.isDefault, isFalse);
    });

    test('a failed fetch keeps the brand that is already applied', () async {
      serveOrg(primary: '#0F766E');
      final BrandingProvider branding = BrandingProvider();
      addTearDown(branding.dispose);

      await branding.refresh(orgId);
      final Color applied = branding.brand.primary;

      api.on(
        ApiEndPoints.organization(orgId),
        status: 500,
        body: <String, dynamic>{'detail': 'Server error'},
      );
      await branding.refresh(orgId);

      expect(
        branding.brand.primary,
        applied,
        reason: 'branding failure is silent — never fall back to the default',
      );
    });
  });

  group('presigned logo URLs', () {
    test('an SVG is recognised through the AWS query string', () {
      // Every logo the backend hands out is presigned, so the extension is
      // followed by ~200 characters of signature. A bare `endsWith('.svg')`
      // on the whole URL never matches one.
      const String url =
          'https://dev-lms-poc.s3.amazonaws.com/media/orgs/x/brand_logo.svg'
          '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260930T042917Z'
          '&X-Amz-Expires=3600&X-Amz-Signature=a60e8f6ebb21ec210011cd13b116';

      expect(looksLikeSvg(url), isTrue);
      expect(urlPath(url), endsWith('/brand_logo.svg'));
    });

    test('a presigned PNG is not read as an SVG', () {
      expect(
        looksLikeSvg('https://s3.amazonaws.com/x/logo.png?X-Amz-Signature=abc'),
        isFalse,
      );
    });

    test('an uppercase extension still counts', () {
      expect(looksLikeSvg('https://s3.test/LOGO.SVG?X-Amz-Expires=60'), isTrue);
    });

    test('S3 can name the type instead of the path', () {
      // A presigned link to an opaque key carries the type as an override.
      expect(
        looksLikeSvg(
          'https://s3.test/media/abc123'
          '?response-content-type=image%2Fsvg%2Bxml&X-Amz-Signature=abc',
        ),
        isTrue,
      );
    });

    test('a malformed URL answers rather than throwing', () {
      expect(looksLikeSvg('not a url at all'), isFalse);
      expect(looksLikeSvg(''), isFalse);
    });
  });
}
