// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The single boot path, shared by every entry point.
///
/// Order matters:
///  * every Hive box must be open before [AuthTokenStore.load] reads from it;
///  * the session must be hydrated before `runApp`, so the router's first
///    redirect already knows whether the learner is signed in — otherwise a
///    returning learner sees the sign-in screen flash before being bounced on;
///  * branding is hydrated from disk here too, so the **first frame is already
///    in the organization's colours** rather than popping from the default.
///
/// Everything runs inside [runZonedGuarded] so an uncaught async error is
/// logged rather than lost.
Future<void> initApp() async {
  runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      await AppEnv.load();
      await HiveStorage.init();
      AuthTokenStore.load();
      await appSession.hydrate();
      appBranding.hydrateFromCache();
      unawaited(AppInfo.load());

      // The interceptor cannot reach the widget tree, so it signals an
      // unrecoverable 401 through this callback. Clearing the session makes
      // the router's refreshListenable fire, which bounces to sign-in.
      AppInterceptor.onSessionExpired = () async {
        await appSession.clearSession();
        await appBranding.reset();
      };

      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        appLogPrint('Flutter error: ${details.exception}', tag: 'ERROR');
      };

      if (!AppEnv.isConfigured) {
        appLogPrint(
          'No API base URL. Pass --dart-define=API_BASE_URL=… or set '
          'API_BASE_URL in ${AppEnv.envFile}. Every request will fail '
          'until then.',
          tag: 'INIT',
        );
      }

      appLogPrint('Booting → ${AppEnv.baseUrl}', tag: 'INIT');
      runApp(const MyApp());
    },
    (Object error, StackTrace stack) =>
        appLogPrint('Uncaught: $error\n$stack', tag: 'ZONE'),
  );
}
