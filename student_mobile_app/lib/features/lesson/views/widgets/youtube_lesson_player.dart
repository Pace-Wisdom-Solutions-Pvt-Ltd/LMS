// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

/// The YouTube player for a video lesson.
///
/// It owns the **auto-complete contract**: it reports playback position to
/// [LessonViewModel.onVideoProgress], which fires the completion call once 90%
/// of the video has been watched. "Mark as complete" stays as a fallback, not
/// the primary path.
///
/// Position is polled rather than streamed because the iframe API exposes no
/// position callback — one read a second is plenty for a 90% threshold and far
/// cheaper than a tighter loop.
class YoutubeLessonPlayer extends StatefulWidget {
  const YoutubeLessonPlayer({
    super.key,
    required this.url,
    required this.onProgress,
  });

  /// The URL as the backend sent it. **Not an id** — picking one out is the
  /// package's job (`convertUrlToId` handles watch, youtu.be, /shorts/,
  /// /embed/ and music.youtube.com), and a second implementation of it here
  /// could only ever be the one that is wrong.
  final String url;
  final ValueChanged<double> onProgress;

  @override
  State<YoutubeLessonPlayer> createState() => _YoutubeLessonPlayerState();
}

class _YoutubeLessonPlayerState extends State<YoutubeLessonPlayer> {
  late final YoutubePlayerController _controller;
  Timer? _poll;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = YoutubePlayerController(
      params: const YoutubePlayerParams(
        showControls: true,
        showFullscreenButton: true,
      ),
    )..loadVideo(widget.url);
    _poll = Timer.periodic(const Duration(seconds: 1), (_) => _readPosition());
  }

  Future<void> _readPosition() async {
    if (!mounted) return;
    try {
      final double duration = await _controller.duration;
      if (duration <= 0) return;
      final double position = await _controller.currentTime;
      widget.onProgress((position / duration).clamp(0.0, 1.0));
    } catch (e) {
      // A player that never becomes ready must not spam the log or strand the
      // learner — fall back to opening the video externally.
      appLogPrint('YouTube position read failed: $e', tag: 'LESSON');
      _poll?.cancel();
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    _controller.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return _UnavailableVideo(url: widget.url);

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: YoutubePlayer(controller: _controller, aspectRatio: 16 / 9),
    );
  }
}

/// Shown when the embedded player cannot run — the learner still reaches the
/// video rather than staring at a dead box.
class _UnavailableVideo extends StatelessWidget {
  const _UnavailableVideo({required this.url});

  /// Handed straight to the browser. Rebuilding a watch URL out of an id we
  /// had extracted from one was a round trip through a string we already had.
  final String url;

  @override
  Widget build(BuildContext context) => AppCard(
    onTap: () => openExternalUrl(url),
    child: Row(
      children: <Widget>[
        Icon(Icons.smart_display_outlined, color: context.brand.brandText),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Text(
            context.l10n.videoOpenExternally,
            style: context.text.titleMedium,
          ),
        ),
        const Icon(Icons.open_in_new_rounded, size: 18),
      ],
    ),
  );
}
