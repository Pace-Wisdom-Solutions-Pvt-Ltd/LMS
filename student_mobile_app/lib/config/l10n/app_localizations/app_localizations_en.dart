// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'LMS';

  @override
  String get appTagline => 'Learn at your pace.';

  @override
  String get retry => 'Retry';

  @override
  String get cancel => 'Cancel';

  @override
  String get continueLabel => 'Continue';

  @override
  String get noInternet => 'No internet connection.';

  @override
  String get signInOverline => 'LMS for learners';

  @override
  String get signInTitle => 'Welcome back.\nKeep learning.';

  @override
  String get signInFootnote =>
      'This app is for learners. Trainers and admins sign in on the LMS website.';

  @override
  String get emailLabel => 'Email';

  @override
  String get emailHint => 'you@company.com';

  @override
  String get passwordLabel => 'Password';

  @override
  String get passwordHint => 'Your LMS password';

  @override
  String get signInCta => 'Sign in';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get emailRequired => 'Enter your email.';

  @override
  String get emailInvalid => 'Enter a valid email address.';

  @override
  String get passwordRequired => 'Enter your password.';

  @override
  String get signInFailed => 'We couldn\'t sign you in. Please try again.';

  @override
  String get forgotPasswordSent =>
      'If that email has an account, a reset link is on its way.';

  @override
  String get forgotPasswordTitle => 'Forgot password';

  @override
  String get forgotPasswordBody =>
      'Enter the email you sign in with and we\'ll send a link to set a new password.';

  @override
  String get forgotPasswordCta => 'Send reset link';

  @override
  String get forgotPasswordSentTitle => 'Check your email';

  @override
  String get forgotPasswordSentBody =>
      'If that email has an account, a link to set a new password is on its way. The link opens on the LMS website.';

  @override
  String get backToSignIn => 'Back to sign in';

  @override
  String get resetPasswordTitle => 'Set a new password';

  @override
  String get resetPasswordBody =>
      'Choose a password for your account. You\'ll sign in with it on the next screen.';

  @override
  String get resetPasswordCta => 'Set password';

  @override
  String get resetTokenMissing =>
      'This link is incomplete. Open the link from your email again.';

  @override
  String get resetTokenInvalid =>
      'This link has expired or has already been used. Ask for a new one.';

  @override
  String get resetPasswordDone =>
      'Password set. Sign in with your new password.';

  @override
  String get signingOut => 'Signing out…';

  @override
  String get switchingOrg => 'Switching organization…';

  @override
  String get chooseOrgTitle => 'Choose an organization';

  @override
  String get chooseOrgBody =>
      'You belong to more than one organization. Pick the one you want to open.';

  @override
  String get switchOrg => 'Switch organization';

  @override
  String get tabHome => 'Home';

  @override
  String get tabCourses => 'Courses';

  @override
  String get tabProgress => 'Progress';

  @override
  String get tabProfile => 'Profile';

  @override
  String get homeOrgOverline => 'Your organization';

  @override
  String get signOut => 'Sign out';

  @override
  String get themeMode => 'Appearance';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String greeting(String name) {
    return 'Hi, $name';
  }

  @override
  String get screenNotBuiltTitle => 'Not built yet';

  @override
  String get screenNotBuiltBody => 'This screen arrives in a later phase.';

  @override
  String get done => 'Done';

  @override
  String get video => 'Video';

  @override
  String get homeNoCoursesTitle => 'No courses yet';

  @override
  String get homeNoCoursesBody =>
      'When a trainer assigns you to a batch, its courses appear here.';

  @override
  String get homeStatCourses => 'Courses';

  @override
  String get homeOverallTitle => 'Overall Progress';

  @override
  String get homeOverallSubtitle => 'Completion across all courses';

  @override
  String get homeCourseProgressTitle => 'Course Progress';

  @override
  String get homeCourseProgressSubtitle => 'Completion by course';

  @override
  String get homeCourseStatusTitle => 'Course Status';

  @override
  String get homeCourseStatusSubtitle => 'How your courses are progressing';

  @override
  String get homeOverallEmptyTitle => 'Nothing to measure yet';

  @override
  String get homeOverallEmptyBody =>
      'Your overall completion appears once you have a course.';

  @override
  String get homeCourseProgressEmptyTitle => 'No progress to show yet';

  @override
  String get homeCourseProgressEmptyBody =>
      'Courses assigned to your batch will show up here.';

  @override
  String get homeCourseStatusEmptyTitle => 'No courses to chart yet';

  @override
  String get homeCourseStatusEmptyBody =>
      'Completed, in progress and not started appear here.';

  @override
  String get homeGlanceTitle => 'At a Glance';

  @override
  String get homeGlanceSubtitle => 'Key learning stats';

  @override
  String get homeStatEnrolled => 'Enrolled courses';

  @override
  String get homeStatLearningHours => 'Learning hours';

  @override
  String get homeStatUpcoming => 'Upcoming';

  @override
  String get homeStatPoints => 'Points';

  @override
  String get homeStatComplete => 'Complete';

  @override
  String get coursesTitle => 'My Courses';

  @override
  String get coursesSearchHint => 'Course, batch or topic';

  @override
  String courseDue(String date) {
    return 'Due $date';
  }

  @override
  String get coursesEmptyTitle => 'No courses yet';

  @override
  String get coursesEmptyBody =>
      'Courses assigned to your batch will show up here.';

  @override
  String get coursesNoMatchTitle => 'Nothing matches';

  @override
  String get coursesNoMatchBody => 'Try a different search or filter.';

  @override
  String get filterAll => 'All';

  @override
  String get filterInProgress => 'In progress';

  @override
  String get filterNotStarted => 'Not started';

  @override
  String get filterCompleted => 'Completed';

  @override
  String get kindQuiz => 'Quiz';

  @override
  String get kindTask => 'Task';

  @override
  String get kindCoding => 'Coding';

  @override
  String get claimCertificate => 'Claim your certificate';

  @override
  String get certificateReadyTitle => 'Certificate ready';

  @override
  String get certificateReadyBody =>
      'Your certificate has been issued. Find it under Progress.';

  @override
  String get certificateNotReadyTitle => 'Not ready yet';

  @override
  String get lessonLockedTitle => 'Lesson locked';

  @override
  String get lessonLockedGeneric =>
      'Finish the earlier lessons to unlock this one.';

  @override
  String get backToRoadmap => 'Back to the course';

  @override
  String get readMore => 'Read more';

  @override
  String get readLess => 'Read less';

  @override
  String get videoPlay => 'Play video';

  @override
  String get moduleLocked => 'Finish the earlier modules to unlock this one.';

  @override
  String get moduleEmpty => 'No lessons have been added to this module yet.';

  @override
  String get focusAreas => 'Focus areas';

  @override
  String get quickOutline => 'Quick outline';

  @override
  String get viewDocument => 'View document';

  @override
  String get markCompleteAction => 'Mark as completed';

  @override
  String get nodeDone => 'Completed';

  @override
  String get nodeUpdating => 'Updating this lesson';

  @override
  String nodesDone(int done, int total) {
    return '$done/$total done';
  }

  @override
  String moduleHeader(int number, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count lessons',
      one: '1 lesson',
    );
    return 'Module $number · $_temp0';
  }

  @override
  String quizMinutes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count minutes',
      one: '1 minute',
    );
    return '$_temp0';
  }

  @override
  String get openTaskPage => 'Open task';

  @override
  String get viewTaskPage => 'View task';

  @override
  String get kindAssessment => 'Assessment';

  @override
  String get nodeAssessmentUnavailable =>
      'This assessment cannot be taken in the app. Open it on the LMS website.';

  @override
  String get openCoding => 'Open coding exercise';

  @override
  String get codingTitle => 'Coding practice';

  @override
  String codingProblems(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count problems',
      one: '1 problem',
    );
    return '$_temp0';
  }

  @override
  String codingProblemOf(int index, int count) {
    return 'Problem $index of $count';
  }

  @override
  String get codingOpenAction => 'Start coding';

  @override
  String get codingContinueAction => 'Continue coding';

  @override
  String get codingNoProblems =>
      'There are no coding problems on this lesson yet.';

  @override
  String get codingSolved => 'Solved';

  @override
  String get codingStatement => 'Problem';

  @override
  String get codingInputFormat => 'Input format';

  @override
  String get codingOutputFormat => 'Output format';

  @override
  String get codingSamples => 'Sample cases';

  @override
  String codingCase(int index) {
    return 'Case $index';
  }

  @override
  String get codingSampleInput => 'Input';

  @override
  String get codingSampleOutput => 'Expected output';

  @override
  String get codingYourOutput => 'Your output';

  @override
  String get codingOutput => 'Output';

  @override
  String get codingLanguage => 'Language';

  @override
  String get codingEditorLabel => 'Your solution';

  @override
  String get codingEditorHint => 'Write your solution here';

  @override
  String get codingCustomInput => 'Run with my own input';

  @override
  String get codingCustomInputHint =>
      'Input to run against instead of the samples';

  @override
  String get codingRun => 'Run';

  @override
  String get codingRunning => 'Running…';

  @override
  String get codingSubmit => 'Submit';

  @override
  String get codingGrading => 'Grading…';

  @override
  String get codingRunNotGraded =>
      'A run is not graded. Submit when you are happy with it.';

  @override
  String get codingWriteCodeFirst => 'Write some code first.';

  @override
  String codingTimeLimit(int count) {
    return '${count}s per case';
  }

  @override
  String codingMemoryLimit(int count) {
    return '$count MB';
  }

  @override
  String get codingAccepted => 'Accepted';

  @override
  String get codingNotAccepted => 'Not accepted';

  @override
  String codingCasesPassed(int passed, int total) {
    return '$passed of $total cases passed';
  }

  @override
  String get codingStillGrading =>
      'Still being graded. Open this again in a moment to see the result.';

  @override
  String codingScore(int score) {
    return 'Score $score';
  }

  @override
  String get codingCasePassed => 'Passed';

  @override
  String get codingCaseFailed => 'Failed';

  @override
  String get codingError => 'Error';

  @override
  String get codingAcceptedToast => 'Accepted · lesson complete';

  @override
  String get codingAllSolved => 'Every problem on this lesson is solved.';

  @override
  String get codingStarterLoading => 'Loading starter code…';

  @override
  String get nothingToOpen => 'There is nothing to open in this lesson yet.';

  @override
  String get openTask => 'Open task';

  @override
  String get startQuiz => 'Start quiz';

  @override
  String get openDocument => 'Open document';

  @override
  String get openLink => 'Open link';

  @override
  String get autoCompleteNote =>
      'This lesson completes itself once you reach the end.';

  @override
  String get markComplete => 'Mark as complete';

  @override
  String get lessonCompleted => 'Lesson complete';

  @override
  String get quizSubmit => 'Submit quiz';

  @override
  String get quizNext => 'Next';

  @override
  String get quizPrevious => 'Previous';

  @override
  String get quizSubmitConfirmTitle => 'Submit this quiz?';

  @override
  String get quizSubmitConfirmBody => 'Your answers are final once you submit.';

  @override
  String get quizConfirmSubmit => 'Yes, submit';

  @override
  String get quizTimeUp => 'Time is up. Your answers were submitted.';

  @override
  String get quizTimeUpUnanswered =>
      'Time is up. Nothing was answered, so no attempt was recorded.';

  @override
  String get quizQuestionGrid => 'Questions';

  @override
  String get quizEmptyTitle => 'This quiz has no questions yet';

  @override
  String get quizPassed => 'Passed';

  @override
  String get quizFailed => 'Not passed';

  @override
  String get quizMustPass =>
      'You need to pass this quiz before the next lesson unlocks.';

  @override
  String get quizYourAnswers => 'Your answers';

  @override
  String get quizNotAnswered => 'You did not answer this question.';

  @override
  String get taskScreenTitle => 'Task submission';

  @override
  String get taskLinkLabel => 'Submission link';

  @override
  String get taskLinkHint => 'https://github.com/... or a Drive link';

  @override
  String get taskLinkHelp =>
      'Paste a public GitHub, Drive, or hosted link to your solution.';

  @override
  String get taskParagraphLabel => 'Written answer';

  @override
  String get taskParagraphHint => 'Write your answer here...';

  @override
  String get taskAttachmentLabel => 'Task brief';

  @override
  String get taskOpenAttachment => 'Open the attached file';

  @override
  String get taskCodeLabel => 'Code';

  @override
  String get taskCodeHint => '// Paste your code here...';

  @override
  String get taskFileLabel => 'PDF / Screenshot / File';

  @override
  String get taskUploadCta => 'Click to upload';

  @override
  String get taskOr => 'OR';

  @override
  String get taskSubmit => 'Upload submission';

  @override
  String get taskResubmitCta => 'Re-upload submission';

  @override
  String get taskHistoryTitle => 'Submission history';

  @override
  String get taskUnderReviewTitle => 'Under review';

  @override
  String get taskUnderReviewBody =>
      'Your trainer has your work. You will see their feedback here.';

  @override
  String taskAttempt(int number) {
    return '#$number';
  }

  @override
  String get taskSubmittedWork => 'What you submitted';

  @override
  String get taskViewFile => 'View file';

  @override
  String get taskWorkLink => 'Link';

  @override
  String get taskWorkAnswer => 'Answer';

  @override
  String get taskWorkCode => 'Code';

  @override
  String get taskWorkFile => 'File';

  @override
  String get taskCancel => 'Cancel';

  @override
  String get taskSubmitted => 'Submitted for review.';

  @override
  String get taskStatusPending => 'Pending';

  @override
  String get taskStatusApproved => 'Approved';

  @override
  String get taskStatusRejected => 'Rejected';

  @override
  String get taskFeedback => 'Trainer feedback';

  @override
  String get taskScore => 'awarded';

  @override
  String get taskResubmit => 'Re-submit';

  @override
  String get viewResult => 'View result';

  @override
  String get attemptsLeftLabel => 'Attempts left';

  @override
  String get progressTitle => 'My Learning Progress';

  @override
  String get progressSubtitle =>
      'Overall completion, course-wise breakdown and your earned certificates';

  @override
  String get progressOverallTitle => 'Overall Progress';

  @override
  String get progressBreakdownTitle => 'Course-wise Breakdown';

  @override
  String get progressLessonsDone => 'Lessons';

  @override
  String get progressCertificates => 'Certificates';

  @override
  String get progressEmptyTitle => 'No progress to show yet';

  @override
  String get progressEmptyBody =>
      'Courses assigned to your batch will show up here.';

  @override
  String get certificatesTitle => 'My Certificates';

  @override
  String get certificatesSubtitle =>
      'Your earned certificates, organised by type';

  @override
  String get certificatesEmptyTitle => 'No course certificates yet';

  @override
  String get certificatesEmptyBody =>
      'Complete a course to earn your first certificate and showcase your achievement!';

  @override
  String get view => 'View';

  @override
  String get certificateDownloadFailed =>
      'Could not download that certificate.';

  @override
  String get reopenFromCourseTitle => 'Open this from the course';

  @override
  String get reopenFromCourseBody =>
      'This screen needs to be opened from its lesson.';

  @override
  String percentComplete(int percent) {
    return '$percent% complete';
  }

  @override
  String lessonsDone(int done, int total) {
    return '$done of $total lessons done';
  }

  @override
  String lessonLockedBy(String title) {
    return 'Finish “$title” first.';
  }

  @override
  String questionOf(int current, int total) {
    return 'Question $current of $total';
  }

  @override
  String quizScored(int percent) {
    return 'Scored $percent%';
  }

  @override
  String get quizNoAttempt => 'There is no recorded attempt for this quiz yet.';

  @override
  String quizScoreCaption(int correct, int total) {
    return '$correct of $total correct';
  }

  @override
  String attemptsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count attempts left',
      one: '1 attempt left',
      zero: 'No attempts left',
    );
    return '$_temp0';
  }

  @override
  String rulesQuestions(int count) {
    return '$count questions';
  }

  @override
  String get signOutConfirm =>
      'You\'ll need to sign in again to keep learning on this device.';

  @override
  String get videoOpenExternally => 'Open the video';

  @override
  String get videoPlaybackSpeed => 'Playback speed';

  @override
  String get open => 'Open';

  @override
  String get download => 'Download';

  @override
  String get share => 'Share';

  @override
  String certificateShareText(String course) {
    return 'My certificate for $course';
  }

  @override
  String get certificateSaved => 'Certificate saved to your device.';

  @override
  String get certificateSavedInApp =>
      'Certificate downloaded. Use Share to save or send it.';

  @override
  String get save => 'Save';

  @override
  String get profileLoadFailed => 'Could not load your profile.';

  @override
  String get editProfile => 'Edit profile';

  @override
  String get profileRoles => 'Your access';

  @override
  String get profileOrganization => 'Organization';

  @override
  String get profileSettings => 'Settings';

  @override
  String get profileContact => 'Contact';

  @override
  String appVersion(String version) {
    return 'v$version';
  }

  @override
  String get profileSaved => 'Profile updated.';

  @override
  String get profileUnavailable => 'Profile unavailable';

  @override
  String get profilePhoto => 'Profile photo';

  @override
  String get photoChoose => 'Choose a photo';

  @override
  String get photoRemove => 'Remove selected photo';

  @override
  String get firstName => 'First name';

  @override
  String get firstNameHint => 'Your given name';

  @override
  String get firstNameRequired => 'Enter your first name.';

  @override
  String get lastName => 'Last name';

  @override
  String get lastNameHint => 'Your family name';

  @override
  String get phoneNumber => 'Phone';

  @override
  String get phoneHint => '9876543210';

  @override
  String get phoneInvalid => 'Enter a valid phone number.';

  @override
  String get changePassword => 'Change password';

  @override
  String get changePasswordBody =>
      'You\'ll be signed out everywhere and will need to sign in again with the new password.';

  @override
  String get currentPassword => 'Current password';

  @override
  String get currentPasswordHint => 'The password you use now';

  @override
  String get newPassword => 'New password';

  @override
  String get newPasswordHint => 'At least 8 characters';

  @override
  String get confirmPassword => 'Confirm new password';

  @override
  String get confirmPasswordHint => 'Type the new password again';

  @override
  String get passwordsDoNotMatch => 'These passwords don\'t match.';

  @override
  String get passwordSameAsCurrent =>
      'Choose a password different from your current one.';

  @override
  String get passwordChangedDone =>
      'Password changed. Sign in with your new password.';

  @override
  String passwordTooShort(int count) {
    return 'Use at least $count characters.';
  }
}
