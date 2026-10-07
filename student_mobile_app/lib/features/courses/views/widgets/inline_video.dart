// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:chewie/chewie.dart';
import 'package:lms/utils/app_exports.dart';
import 'package:video_player/video_player.dart';

/// A video inside an expanded roadmap row: poster first, player on tap.
///
/// Nothing loads until the learner asks for it. A roadmap can hold a dozen
/// videos, and initialising even one player per row would cost a network
/// connection each and, on Android, a hardware decoder each.
///
/// Two backends, chosen by the **URL** rather than by `content_type`, because
/// the type only ever says "Video" — and because there is no third option.
/// YouTube does not serve a media file at a watch URL, so `video_player`
/// cannot open one; the IFrame player only accepts YouTube video ids, so it
/// cannot open an MP4. Every package that claims to do both either embeds
/// these two, or scrapes YouTube for a stream URL, which breaks whenever
/// YouTube changes and is against its terms.
///
/// What this widget guarantees instead is that **callers never choose**: they
/// hand over a URL and get a player.
///  * a YouTube link goes to [YoutubeLessonPlayer], which polls position to
///    drive the 90% auto-complete;
///  * anything else is a progressive file, played by `video_player` behind
///    `chewie`, which supplies the controls.
class InlineVideo extends StatefulWidget {
  const InlineVideo({
    super.key,
    required this.material,
    required this.onProgress,
  });

  final LearningMaterial material;

  /// 0..1 through the video. The caller auto-completes at 90%.
  final ValueChanged<double> onProgress;

  @override
  State<InlineVideo> createState() => _InlineVideoState();
}

class _InlineVideoState extends State<InlineVideo> {
  bool _started = false;

  @override
  Widget build(BuildContext context) {
    final bool isYouTube = widget.material.isYouTube;

    if (!_started) {
      return _VideoPoster(
        isYouTube: isYouTube,
        onPlay: () => setState(() => _started = true),
      );
    }

    if (isYouTube) {
      return YoutubeLessonPlayer(
        url: widget.material.url,
        onProgress: widget.onProgress,
      );
    }

    return _FileVideo(url: widget.material.url, onProgress: widget.onProgress);
  }
}

/// The still frame: a dark panel with a play button, sized 16:9 so the row
/// does not jump when the real player replaces it.
class _VideoPoster extends StatelessWidget {
  const _VideoPoster({required this.isYouTube, required this.onPlay});

  final bool isYouTube;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) => PressScale(
    onTap: onPlay,
    child: Semantics(
      button: true,
      container: true,
      label: context.l10n.videoPlay,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.tile),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: <Color>[Color(0xFF16243A), Color(0xFF060D18)],
            ),
          ),
          child: Center(
            child: isYouTube ? const _YouTubePlayButton() : _BrandPlayButton(),
          ),
        ),
      ),
    ),
  );
}

/// YouTube's own play button: a red rounded tab with a white triangle.
///
/// **Deliberately not themed and not branded.** It is a mark the learner
/// already knows, and it tells them before they tap that this one opens
/// YouTube's player rather than the app's — a green or blue lozenge in its
/// place says nothing. So the red is YouTube's `#FF0000` and the triangle is
/// plain white, in both themes and under every organization's palette.
class _YouTubePlayButton extends StatelessWidget {
  const _YouTubePlayButton();

  static const Color _red = Color(0xFFFF0000);

  @override
  Widget build(BuildContext context) => Container(
    width: 62,
    height: 44,
    decoration: BoxDecoration(
      color: _red,
      borderRadius: BorderRadius.circular(12),
    ),
    child: const Icon(
      Icons.play_arrow_rounded,
      size: 32,
      color: AppPalette.white,
    ),
  );
}

/// Anything the app plays itself gets the organization's colour, like every
/// other filled control.
class _BrandPlayButton extends StatelessWidget {
  const _BrandPlayButton();

  @override
  Widget build(BuildContext context) => Container(
    width: 58,
    height: 58,
    decoration: BoxDecoration(
      color: context.brand.brandFill,
      shape: BoxShape.circle,
    ),
    child: Icon(
      Icons.play_arrow_rounded,
      size: 30,
      color: context.brand.onBrand,
    ),
  );
}

/// A progressive file (`.mp4` and friends) played in place.
///
/// `video_player` draws frames and nothing else: it has no play button, no
/// scrubber, no clock and no fullscreen, so this used to be a tap-anywhere
/// toggle over a hairline progress bar — a learner could not skip a minute,
/// jump back over something they missed, or see how long was left. `chewie`
/// is the controls, over the same [VideoPlayerController] this widget still
/// listens to for the 90% auto-complete.
class _FileVideo extends StatefulWidget {
  const _FileVideo({required this.url, required this.onProgress});

  final String url;
  final ValueChanged<double> onProgress;

  @override
  State<_FileVideo> createState() => _FileVideoState();
}

class _FileVideoState extends State<_FileVideo> {
  VideoPlayerController? _controller;
  ChewieController? _chewie;
  bool _failed = false;
  double _reported = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_open());
  }

  Future<void> _open() async {
    final Uri? uri = Uri.tryParse(widget.url);
    if (uri == null || !uri.hasScheme) {
      setState(() => _failed = true);
      return;
    }

    final VideoPlayerController controller = VideoPlayerController.networkUrl(
      uri,
    );
    try {
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      controller.addListener(_onTick);
      setState(() {
        _controller = controller;
        _chewie = _chewieFor(controller);
      });
    } catch (e) {
      appLogPrint('Video failed to open: $e', tag: 'LESSON');
      await controller.dispose();
      if (mounted) setState(() => _failed = true);
    }
  }

  /// The learner already tapped the poster, so playback starts itself; the
  /// screen is held awake because a lesson video is watched, not driven.
  ///
  /// The scrubber wears the organization's colour like every other filled
  /// control, and the options sheet's labels come from the `.arb` rather than
  /// from the package's own English.
  ChewieController _chewieFor(VideoPlayerController controller) {
    final BrandColors brand = context.brand;
    final ChewieProgressColors bar = ChewieProgressColors(
      playedColor: brand.brandFill,
      handleColor: brand.brandFill,
      bufferedColor: AppPalette.white.withValues(alpha: 0.35),
      backgroundColor: AppPalette.white.withValues(alpha: 0.18),
    );

    return ChewieController(
      videoPlayerController: controller,
      autoPlay: true,
      looping: false,
      allowedScreenSleep: false,
      // Casting needs a cast controller this app does not have, and the
      // subtitle button has nothing to show.
      allowCasting: false,
      showSubtitles: false,
      materialProgressColors: bar,
      cupertinoProgressColors: bar,
      optionsTranslation: OptionsTranslation(
        playbackSpeedButtonText: context.l10n.videoPlaybackSpeed,
        cancelButtonText: context.l10n.cancel,
      ),
      aspectRatio: controller.value.aspectRatio == 0
          ? 16 / 9
          : controller.value.aspectRatio,
      errorBuilder: (BuildContext _, String message) {
        appLogPrint('Video playback failed: $message', tag: 'LESSON');
        return _VideoFallback(url: widget.url);
      },
    );
  }

  /// Reports progress in whole percent only. The controller ticks several
  /// times a second, and every report rebuilds the row above it.
  void _onTick() {
    final VideoPlayerController? c = _controller;
    if (c == null || !c.value.isInitialized) return;

    final int total = c.value.duration.inMilliseconds;
    if (total <= 0) return;

    final double value = (c.value.position.inMilliseconds / total).clamp(
      0.0,
      1.0,
    );
    if ((value - _reported).abs() < 0.01) return;
    _reported = value;
    widget.onProgress(value);
  }

  @override
  void dispose() {
    _controller?.removeListener(_onTick);
    // The Chewie controller goes first: it is the one holding the fullscreen
    // route and the wakelock, and it does not own the player underneath it.
    _chewie?.dispose();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return _VideoFallback(url: widget.url);

    final ChewieController? chewie = _chewie;
    if (chewie == null) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
      );
    }

    // Chewie centres itself inside its own AspectRatio, which would be
    // unbounded in the list this sits in — the explicit ratio bounds the
    // height, as the bare player did before it.
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.tile),
      child: AspectRatio(
        aspectRatio: chewie.aspectRatio ?? 16 / 9,
        child: Chewie(controller: chewie),
      ),
    );
  }
}

/// When the file will not play in-app — a codec the device lacks, or a host
/// that refuses range requests — hand it to the platform rather than leaving
/// a dead panel.
class _VideoFallback extends StatelessWidget {
  const _VideoFallback({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) => AppButton(
    label: context.l10n.videoOpenExternally,
    icon: Icons.open_in_new_rounded,
    tone: ChipTone.neutral,
    onPressed: () => openExternalUrl(url),
  );
}
