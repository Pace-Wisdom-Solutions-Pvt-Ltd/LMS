// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The quiz result and review.
///
/// **The review is built from the submit response plus the learner's own
/// picks — never from `is_correct`.** The backend withholds that field until
/// the learner has passed and then exposes it on the same payload; the app
/// ignores it in both states, so this screen renders identically whether they
/// passed or failed. It shows what they answered, and the score, and nothing
/// that could serve as an answer key.
class QuizResultScreen extends StatelessWidget {
  const QuizResultScreen({
    super.key,
    required this.courseId,
    required this.moduleId,
    required this.nodeId,
  });

  final int courseId;
  final int moduleId;
  final int nodeId;

  @override
  Widget build(BuildContext context) {
    final int orgId = context.read<SessionProvider>().orgId ?? 0;

    return ChangeNotifierProvider<QuizResultViewModel>(
      create: (_) =>
          QuizResultViewModel(orgId: orgId, courseId: courseId, nodeId: nodeId)
            ..load(),
      child: const _QuizResultView(),
    );
  }
}

class _QuizResultView extends StatelessWidget {
  const _QuizResultView();

  @override
  Widget build(BuildContext context) {
    final QuizResultViewModel vm = context.watch<QuizResultViewModel>();

    if (vm.isBusy) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: const SafeArea(child: ResponsiveBody(child: _ResultSkeleton())),
      );
    }

    if (vm.state == ViewState.error) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: SafeArea(
          child: ResponsiveBody(
            child: ErrorCard(message: vm.errorMessage, onRetry: vm.load),
          ),
        ),
      );
    }

    final QuizOutcome? outcome = vm.outcome;
    if (outcome == null) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: SafeArea(
          child: ResponsiveBody(
            child: EmptyState(
              icon: Icons.quiz_outlined,
              title: context.l10n.quizEmptyTitle,
              message: context.l10n.quizNoAttempt,
            ),
          ),
        ),
      );
    }

    return _Result(outcome: outcome);
  }
}

class _Result extends StatelessWidget {
  const _Result({required this.outcome});

  final QuizOutcome outcome;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final Quiz quiz = outcome.quiz;
    final bool passed = outcome.passed;
    final Color tone = passed ? brand.success : brand.danger;
    final int? correct = outcome.correctCount;

    return Scaffold(
      appBar: AppTopBar(title: Text(quiz.name)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: AppSpace.xxl),
          children: <Widget>[
            ResponsiveBody(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: staggered(<Widget>[
                  const SizedBox(height: AppSpace.md),
                  Center(
                    child: ScoreRing(
                      value: outcome.score / 100,
                      color: tone,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text(
                            '${outcome.score.round()}%',
                            style: tabular(context.text.displayLarge!),
                          ),
                          // Only the submit response counts correct answers.
                          // Rebuilt from the roadmap there is no honest way to
                          // — the only marker there is `is_correct`, which this
                          // app never reads — so the percentage stands alone.
                          if (correct != null)
                            Text(
                              context.l10n.quizScoreCaption(
                                correct,
                                outcome.totalQuestions,
                              ),
                              style: tabular(context.text.bodySmall!),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpace.lg),
                  Center(
                    child: AppChip(
                      label: passed
                          ? context.l10n.quizPassed
                          : context.l10n.quizFailed,
                      icon: passed
                          ? Icons.check_circle_rounded
                          : Icons.cancel_rounded,
                      tone: passed ? ChipTone.success : ChipTone.danger,
                    ),
                  ),
                  if (quiz.mustPassToContinue && !passed) ...<Widget>[
                    const SizedBox(height: AppSpace.lg),
                    ErrorCard(message: context.l10n.quizMustPass),
                  ],
                  const SizedBox(height: AppSpace.sectionGap),
                  Text(
                    context.l10n.quizYourAnswers,
                    style: context.text.titleLarge,
                  ),
                  const SizedBox(height: AppSpace.sm),
                  for (int i = 0; i < quiz.questions.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.md),
                      child: _ReviewItem(
                        number: i + 1,
                        question: quiz.questions[i],
                        pickedIds:
                            outcome.submittedAnswers[quiz.questions[i].id] ??
                            const <int>[],
                      ),
                    ),
                  const SizedBox(height: AppSpace.lg),
                  AppButton(
                    label: context.l10n.backToRoadmap,
                    tone: ChipTone.neutral,
                    onPressed: () => context.pop(),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One reviewed question: what was asked, and what the learner chose.
///
/// Deliberately does not mark the answer right or wrong per question — the app
/// never holds that information.
class _ReviewItem extends StatelessWidget {
  const _ReviewItem({
    required this.number,
    required this.question,
    required this.pickedIds,
  });

  final int number;
  final QuizQuestion question;
  final List<int> pickedIds;

  @override
  Widget build(BuildContext context) {
    final List<AnswerOption> picked = question.options
        .where((AnswerOption o) => pickedIds.contains(o.id))
        .toList();

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                '$number.',
                style: tabular(
                  context.text.titleMedium!.copyWith(
                    color: context.brand.muted,
                  ),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(question.text, style: context.text.titleMedium),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          if (picked.isEmpty)
            Text(
              context.l10n.quizNotAnswered,
              style: context.text.bodyMedium?.copyWith(
                color: context.brand.warning,
              ),
            )
          else
            for (final AnswerOption o in picked)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xxs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    // The same control the question was answered with, so
                    // the review reads as a record of the choice rather than
                    // a different widget making the same claim.
                    ChoiceIndicator(
                      picked: true,
                      multiple: question.allowMultipleCorrect,
                      size: 20,
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(o.text, style: context.text.bodyMedium),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

/// First-load placeholder, shaped like the ring and the first review cards.
class _ResultSkeleton extends StatelessWidget {
  const _ResultSkeleton();

  @override
  Widget build(BuildContext context) => AppShimmer(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: AppSpace.lg),
        const Center(child: SkeletonBox(height: 150, width: 150, radius: 75)),
        const SizedBox(height: AppSpace.lg),
        const Center(child: SkeletonBox(height: 28, width: 110, radius: 999)),
        const SizedBox(height: AppSpace.sectionGap),
        const SkeletonBox(height: 24, width: 160),
        const SizedBox(height: AppSpace.md),
        for (int i = 0; i < 3; i++) ...<Widget>[
          const SkeletonBox(height: 96),
          const SizedBox(height: AppSpace.md),
        ],
      ],
    ),
  );
}
