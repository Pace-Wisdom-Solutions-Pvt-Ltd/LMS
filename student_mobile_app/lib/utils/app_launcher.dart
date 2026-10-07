// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';
import 'package:open_filex/open_filex.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opening links, files and the share sheet.
///
/// Each one swallows its own failure and reports a bool, because none of them
/// is worth crashing a screen over — the caller shows a message instead.

/// Opens [url] in the browser or the app that claims it.
Future<bool> openExternalUrl(String url) async {
  final Uri? uri = Uri.tryParse(url);
  if (uri == null) return false;
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (e) {
    appLogPrint('Could not open $url: $e', tag: 'LAUNCH');
    return false;
  }
}

/// Opens a saved file with the system viewer.
Future<bool> openLocalFile(String path) async {
  try {
    final OpenResult result = await OpenFilex.open(path);
    if (result.type != ResultType.done) {
      appLogPrint('Opening $path: ${result.message}', tag: 'LAUNCH');
    }
    return result.type == ResultType.done;
  } catch (e) {
    appLogPrint('Could not open $path: $e', tag: 'LAUNCH');
    return false;
  }
}

/// Opens the system share sheet for a saved file.
///
/// [origin] positions the popover on iPad, where a share sheet without an
/// anchor throws rather than degrading.
Future<bool> shareLocalFile(
  String path, {
  String? subject,
  String? text,
  Rect? origin,
}) async {
  try {
    await SharePlus.instance.share(
      ShareParams(
        files: <XFile>[XFile(path)],
        subject: subject,
        text: text,
        sharePositionOrigin: origin,
      ),
    );
    return true;
  } catch (e) {
    appLogPrint('Could not share $path: $e', tag: 'LAUNCH');
    return false;
  }
}

/// The rectangle a share sheet should point at, taken from the widget that was
/// tapped. Returns null when the widget is gone.
Rect? shareOriginOf(BuildContext context) {
  final RenderObject? box = context.findRenderObject();
  if (box is! RenderBox || !box.hasSize) return null;
  return box.localToGlobal(Offset.zero) & box.size;
}
