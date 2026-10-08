<!--
SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
SPDX-License-Identifier: Apache-2.0
-->

# LMS

A learner-only mobile client (Android and iOS) for a multi-tenant, white-label corporate
learning management system.

One account can belong to several organizations; the learner picks one after signing in, and
everything from there — courses, progress, certificates — is scoped to it. Each
organization supplies its own name, logo and colours, which the app fetches at runtime and
applies as a theme, so nothing about how the app looks is compiled in. Switching organization
resets the session-scoped state rather than refetching over it.

The learner's path is: **Course → Module → Lesson**, where a lesson can be learning material
(video, PDF, document, link, text), a **Task** submitted for a trainer to review, or a **Quiz**.
A roadmap screen holds all of it in one place and expands a lesson in place; video
auto-completes the lesson at 90% watched.

Every authenticated account is admitted, whatever its role — a trainer or an admin signing in
gets the learner UI, with the learner-scoped endpoints returning their (empty) results.

**Phone portrait is the design target**, and it is enforced rather than
assumed: `initApp` locks the app to `portraitUp`. The one exception is a video at
fullscreen, which may rotate — `AppOrientation` holds both sets and each player
restores the lock when its fullscreen closes. Both native sides stay permissive
on purpose, because iOS honours a runtime orientation request only within what
`Info.plist` already allows.

The desktop and web platform folders exist because `flutter create` made them;
they are not build targets.

## Requirements

|          |                                                                              |
| -------- | ---------------------------------------------------------------------------- |
| Flutter  | 3.47 stable (built and tested against it)                                    |
| Dart SDK | `^3.13.0`, per `pubspec.yaml`                                            |
| Android  | Android Studio + an SDK;`minSdk`/`targetSdk` follow the Flutter defaults |
| iOS      | Xcode and CocoaPods; a macOS host                                            |
| Device   | an emulator, a simulator or a real phone — `flutter run` needs one attached   |

## Running it

```bash
cp .env.example .env   # once per clone, then set API_BASE_URL in it
flutter pub get

cd ios && pod install && cd ..   # iOS only, and only after `pub get`

flutter run
```

`cp .env.example .env` is not optional — the build fails without the file, and the error comes
from asset bundling rather than at runtime. `flutter run` needs no `-t` flag: there is one entry
point.

**Something has to be connected before `flutter run`** — an Android emulator, an iOS simulator,
or a phone plugged in with developer mode on. With nothing attached the run stops rather than
building:

```bash
flutter devices            # what Flutter can currently see
flutter emulators          # ...and what it could start
flutter emulators --launch <emulator_id>
flutter run -d <device_id> # pick one when several are attached
```

`localhost` in `.env` means the *device's* own localhost, not your machine's. An Android
emulator reaches the host at **`10.0.2.2`**, an iOS simulator shares the host's network so
`localhost` works there, and a real phone needs your machine's **LAN IP** — with the backend
bound to it (`python manage.py runserver 0.0.0.0:8000`) and both on the same network.

**`pod install` for iOS, and in that order.** `ios/Pods/` and `Podfile.lock` are both
gitignored, so a fresh clone has no pods at all. It has to run *after* `flutter pub get`, because
that is what generates `ios/Flutter/Generated.xcconfig` — also gitignored — which the `Podfile`
reads to find the Flutter SDK and the plugin list. Run it first and CocoaPods stops with:

```
FLUTTER_ROOT not found in …/Flutter/Generated.xcconfig. Try deleting Generated.xcconfig, then run flutter pub get
```

Re-run `pod install` whenever a dependency with a native side is added or upgraded in
`pubspec.yaml`. Android needs no equivalent step, and neither does a macOS host building only
for Android.

To point a run at another backend without touching `.env`:

```bash
flutter run --dart-define=API_BASE_URL=https://lms.example.com
```

### Configuration

There is **one** setting, `API_BASE_URL` (the API root, no trailing slash), and it resolves in
this order:

1. `--dart-define=API_BASE_URL=…` — what CI and release builds should use.
2. `API_BASE_URL` in `.env` — so a plain `flutter run` works without flags.

With neither set, `AppEnv.isConfigured` is false and every request fails loudly rather than
quietly hitting a wrong origin: **there is no hardcoded host anywhere in `lib/`.**

`.env` is gitignored; only `.env.example` is committed. It is declared as an asset in
`pubspec.yaml`, so a fresh clone **fails to build until the file exists** — and the error comes
from asset bundling, not at runtime, which is confusing if you have not seen it before. Adding a
key means editing both files.

There are **no build flavors**: one entry point (`lib/main.dart`), one `.env`.

## Folder structure

Four top-level folders under `lib/`. `config/` is app-level configuration, `core/` is shared
infrastructure, `features/` is product code, `utils/` is the barrel and helpers.

```
lib/
  main.dart         — the only entry point: `void main() => initApp();`
  init_app.dart     — boot order: env, Hive, token store, session, branding, then runApp

  config/
    app_env/        — API base URL resolution (dart-define → .env)
    l10n/           — app_en.arb and the generated AppLocalizations
    theme/          — palette, per-org brand, spacing/radius/motion tokens, ThemeData
    routes/         — route names and paths, the GoRouter, the route observer
    providers/      — the two provider tiers (global vs. session-scoped)

  core/
    base/           — BaseProvider: every view model extends it
    models/         — user, organization membership, organization branding
    providers/      — session, branding, reachability, the tab refresher
    repository/     — organization lookups (branding)
    services/       — Dio client, auth interceptor, ApiResponse, endpoint list, token store,
                      file saver, orientation policy
    local_storage/  — the Hive wrapper and its typed keys
    views/          — the root widget and the four-tab shell
    widgets/        — shared UI: top bar, buttons, sheets, text fields, skeletons,
                      progress rings, snackbars, the code editor, the brand mark

  features/<name>/  — splash, auth, home, courses, lesson, progress, profile
    models/         — plain data classes with fromJson
    view_models/    — ChangeNotifiers extending BaseProvider
    views/          — screens, plus views/widgets/ for feature-local widgets
    repository/     — wraps the Dio client, returns ApiResponse

  utils/
    app_exports.dart   — the barrel (see below)
    app_extensions.dart, app_enums.dart
```

Three conventions that are not obvious from the tree:

- **The barrel.** `lib/utils/app_exports.dart` re-exports nearly every package import, util and
  feature file, and almost every file's only import is
  `import 'package:lms/utils/app_exports.dart';`. A new file must be exported from it, and a new
  package import belongs there rather than in each file that needs it.
- **MVVM with Provider only.** No Riverpod, no Bloc. View models are `ChangeNotifier`s consumed
  with `context.watch` / `read` / `select` / `Consumer`, and they all extend `BaseProvider`,
  which guards `notifyListeners()` after dispose and carries a view state and error message.
- **Two provider tiers.** Global providers survive sign-out; session providers are keyed on
  `userId@orgId`, so signing in, signing out, or switching organization rebuilds that subtree and
  discards every session-scoped view model with it.

Other top-level files: `l10n.yaml` (points `flutter gen-l10n` at `lib/config/l10n/`),
`analysis_options.yaml`, `assets/` (two logo files, see below), and `test/` — the test
suite, including `test/support/fake_api.dart`, a fake Dio adapter the widget tests serve
responses from.

## Day-to-day commands

```bash
flutter analyze                           # must be clean
flutter test                              # the whole suite
flutter test --plain-name '<substring>'   # one test
dart format lib/ test/                    # after every edit
flutter gen-l10n                          # after editing lib/config/l10n/app_en.arb
dart run flutter_launcher_icons            # after changing assets/app_logo.png
```

All user-facing strings come from `lib/config/l10n/app_en.arb` — adding one means editing that
file and re-running `flutter gen-l10n`. Only English ships today.

## Building a release

Pass the backend in explicitly; release builds should not depend on a local `.env`.

### Android

```bash
# Play Store upload (preferred):
flutter build appbundle --release --dart-define=API_BASE_URL=https://lms.example.com
# → build/app/outputs/bundle/release/app-release.aab

# Sideloadable APKs, one per ABI:
flutter build apk --release --split-per-abi --dart-define=API_BASE_URL=https://lms.example.com
# → build/app/outputs/flutter-apk/
```

> **Signing is not set up yet.** `android/app/build.gradle.kts` points the `release` build type at
> `signingConfigs.getByName("debug")`, so `--release` builds today are signed with the debug
> keys. They run, and they cannot be uploaded to Play. Before shipping: create an upload
> keystore, put its path and passwords in `android/key.properties` (gitignored), declare a real
> `signingConfigs.release` reading from it, and point the release build type at that instead.

### iOS

```bash
flutter build ipa --release --dart-define=API_BASE_URL=https://lms.example.com
# → build/ios/ipa/*.ipa, plus an Xcode archive to upload with Transporter
```

Run `pod install` first on a clean machine (see [Running it](#running-it)).
`ios/Runner.xcworkspace` is committed, but it references a `Pods` project that is not — so
opening it before the pods exist fails to build rather than telling you what is missing.

Signing has to be configured first: open `ios/Runner.xcworkspace` in Xcode, select the **Runner**
target → **Signing & Capabilities**, and set your team and provisioning profile. `flutter build ipa --export-method …` covers ad-hoc and enterprise distribution.

Bump the version for either platform in **one** place — `version: 1.0.0+1` in `pubspec.yaml`.
The name before `+` is the version string, the number after it is the build number, and both
platforms read them from there.

## Changing the app name

The name lives in **four** places and they must agree. It is currently `LMS` everywhere.

| Where                                        | What to change                                           |
| -------------------------------------------- | -------------------------------------------------------- |
| `android/app/src/main/AndroidManifest.xml` | `android:label="LMS"` — the Android launcher label    |
| `ios/Runner/Info.plist`                    | `CFBundleDisplayName` — the iOS home-screen label     |
| `ios/Runner/Info.plist`                    | `CFBundleName` — the short name iOS falls back to     |
| `lib/config/l10n/app_en.arb`               | `"appName"` — what the app calls itself in its own UI |

Then run `flutter gen-l10n` (for the `.arb` change) and rebuild. A hot reload will not pick up
the two native files.

**The bundle identifier is a separate thing**, and renaming the app is usually when you notice it
is still the `flutter create` placeholder `com.lms.student`. Changing it means:

- `android/app/build.gradle.kts` — both `namespace` and `applicationId`;
- `ios/Runner.xcodeproj/project.pbxproj` — `PRODUCT_BUNDLE_IDENTIFIER` (do it in Xcode rather
  than by hand; there are several occurrences, including the test target's).

An `applicationId` or bundle id that has already been published cannot be changed afterwards, so
settle it before the first release.

## Changing the app icon

There are **two** logo files, and the difference between them is the alpha channel:

| File | Used for | Why |
| ---- | -------- | --- |
| `assets/app_logo.png` | both platforms' launcher icons | a launcher icon is matted onto a flat background — iOS rejects an alpha channel outright |
| `assets/app_logo_transparent.png` | the in-app mark, via the `AppIcon` widget | the matte would otherwise be a visible tile wherever the mark sits on the app's own surface |

Keep the two in step: they are the same artwork, and only one of them is the
one a learner sees inside the app.

```bash
# 1. Replace assets/app_logo.png — square, ideally 1024×1024, with some padding
#    of its own so the Android adaptive mask does not crop it. Replace
#    assets/app_logo_transparent.png with the same artwork, alpha intact.

# 2. Regenerate both platforms' icons. Only app_logo.png feeds this.
dart run flutter_launcher_icons

# 3. Rebuild. Android caches launcher icons aggressively, so uninstall first if
#    the old one persists.
```

> The generator rewrites `mipmap-anydpi-v26/ic_launcher.xml` from scratch and
> **drops its SPDX header**. Put the header back before committing, or
> `reuse lint` fails.

That writes `android/app/src/main/res/mipmap-*/` and
`ios/Runner/Assets.xcassets/AppIcon.appiconset/` — generated output, committed, and not worth
editing by hand.

The generator is configured in the `flutter_launcher_icons:` block in `pubspec.yaml`. Two
settings there are deliberate: `adaptive_icon_background: "#FFFFFF"`, so a logo carrying its own
padding is not cropped by Android's adaptive mask, and `remove_alpha_ios: true`, because iOS
rejects an app icon with an alpha channel. If the icon needs a different treatment per platform,
`image_path_android` / `image_path_ios` take their own files.

`AppIcon` picks its decoder from the file extension, so pointing it at an SVG needs no code
change — but `flutter_launcher_icons` needs a raster image, so the launcher file stays a PNG.

What the in-app mark is **not** is the organization's logo. Anywhere an organization is known,
`BrandMark` shows that organization's logo, falling back to a monogram tile and only then to the
app's own mark.
