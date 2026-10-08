// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'app_localizations/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// The product name. An organization's own name replaces it on branded surfaces at runtime.
  ///
  /// In en, this message translates to:
  /// **'LMS'**
  String get appName;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Learn at your pace.'**
  String get appTagline;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// Bar pinned to the bottom of the app while the internet is unreachable. The app is online-only, so this states the fact rather than promising saved data.
  ///
  /// In en, this message translates to:
  /// **'No internet connection.'**
  String get noInternet;

  /// No description provided for @signInOverline.
  ///
  /// In en, this message translates to:
  /// **'LMS for learners'**
  String get signInOverline;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back.\nKeep learning.'**
  String get signInTitle;

  /// No description provided for @signInFootnote.
  ///
  /// In en, this message translates to:
  /// **'This app is for learners. Trainers and admins sign in on the LMS website.'**
  String get signInFootnote;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// Placeholder shown in the empty email field, so the learner can see the expected format.
  ///
  /// In en, this message translates to:
  /// **'you@company.com'**
  String get emailHint;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'Your LMS password'**
  String get passwordHint;

  /// No description provided for @signInCta.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInCta;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @emailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your email.'**
  String get emailRequired;

  /// No description provided for @emailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get emailInvalid;

  /// No description provided for @passwordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your password.'**
  String get passwordRequired;

  /// No description provided for @signInFailed.
  ///
  /// In en, this message translates to:
  /// **'We couldn\'t sign you in. Please try again.'**
  String get signInFailed;

  /// No description provided for @forgotPasswordSent.
  ///
  /// In en, this message translates to:
  /// **'If that email has an account, a reset link is on its way.'**
  String get forgotPasswordSent;

  /// No description provided for @forgotPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot password'**
  String get forgotPasswordTitle;

  /// No description provided for @forgotPasswordBody.
  ///
  /// In en, this message translates to:
  /// **'Enter the email you sign in with and we\'ll send a link to set a new password.'**
  String get forgotPasswordBody;

  /// No description provided for @forgotPasswordCta.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get forgotPasswordCta;

  /// No description provided for @forgotPasswordSentTitle.
  ///
  /// In en, this message translates to:
  /// **'Check your email'**
  String get forgotPasswordSentTitle;

  /// No description provided for @forgotPasswordSentBody.
  ///
  /// In en, this message translates to:
  /// **'If that email has an account, a link to set a new password is on its way. The link opens on the LMS website.'**
  String get forgotPasswordSentBody;

  /// No description provided for @backToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get backToSignIn;

  /// No description provided for @resetPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Set a new password'**
  String get resetPasswordTitle;

  /// No description provided for @resetPasswordBody.
  ///
  /// In en, this message translates to:
  /// **'Choose a password for your account. You\'ll sign in with it on the next screen.'**
  String get resetPasswordBody;

  /// No description provided for @resetPasswordCta.
  ///
  /// In en, this message translates to:
  /// **'Set password'**
  String get resetPasswordCta;

  /// No description provided for @resetTokenMissing.
  ///
  /// In en, this message translates to:
  /// **'This link is incomplete. Open the link from your email again.'**
  String get resetTokenMissing;

  /// No description provided for @resetTokenInvalid.
  ///
  /// In en, this message translates to:
  /// **'This link has expired or has already been used. Ask for a new one.'**
  String get resetTokenInvalid;

  /// No description provided for @resetPasswordDone.
  ///
  /// In en, this message translates to:
  /// **'Password set. Sign in with your new password.'**
  String get resetPasswordDone;

  /// No description provided for @signingOut.
  ///
  /// In en, this message translates to:
  /// **'Signing out…'**
  String get signingOut;

  /// No description provided for @switchingOrg.
  ///
  /// In en, this message translates to:
  /// **'Switching organization…'**
  String get switchingOrg;

  /// No description provided for @chooseOrgTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose an organization'**
  String get chooseOrgTitle;

  /// No description provided for @chooseOrgBody.
  ///
  /// In en, this message translates to:
  /// **'You belong to more than one organization. Pick the one you want to open.'**
  String get chooseOrgBody;

  /// No description provided for @switchOrg.
  ///
  /// In en, this message translates to:
  /// **'Switch organization'**
  String get switchOrg;

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get tabCourses;

  /// No description provided for @tabProgress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get tabProgress;

  /// No description provided for @tabProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get tabProfile;

  /// No description provided for @homeOrgOverline.
  ///
  /// In en, this message translates to:
  /// **'Your organization'**
  String get homeOrgOverline;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @themeMode.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get themeMode;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @greeting.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String greeting(String name);

  /// No description provided for @screenNotBuiltTitle.
  ///
  /// In en, this message translates to:
  /// **'Not built yet'**
  String get screenNotBuiltTitle;

  /// No description provided for @screenNotBuiltBody.
  ///
  /// In en, this message translates to:
  /// **'This screen arrives in a later phase.'**
  String get screenNotBuiltBody;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @video.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get video;

  /// No description provided for @homeNoCoursesTitle.
  ///
  /// In en, this message translates to:
  /// **'No courses yet'**
  String get homeNoCoursesTitle;

  /// No description provided for @homeNoCoursesBody.
  ///
  /// In en, this message translates to:
  /// **'When a trainer assigns you to a batch, its courses appear here.'**
  String get homeNoCoursesBody;

  /// No description provided for @homeStatCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get homeStatCourses;

  /// No description provided for @homeOverallTitle.
  ///
  /// In en, this message translates to:
  /// **'Overall Progress'**
  String get homeOverallTitle;

  /// No description provided for @homeOverallSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Completion across all courses'**
  String get homeOverallSubtitle;

  /// No description provided for @homeCourseProgressTitle.
  ///
  /// In en, this message translates to:
  /// **'Course Progress'**
  String get homeCourseProgressTitle;

  /// No description provided for @homeCourseProgressSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Completion by course'**
  String get homeCourseProgressSubtitle;

  /// No description provided for @homeCourseStatusTitle.
  ///
  /// In en, this message translates to:
  /// **'Course Status'**
  String get homeCourseStatusTitle;

  /// No description provided for @homeCourseStatusSubtitle.
  ///
  /// In en, this message translates to:
  /// **'How your courses are progressing'**
  String get homeCourseStatusSubtitle;

  /// No description provided for @homeOverallEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing to measure yet'**
  String get homeOverallEmptyTitle;

  /// No description provided for @homeOverallEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Your overall completion appears once you have a course.'**
  String get homeOverallEmptyBody;

  /// No description provided for @homeCourseProgressEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No progress to show yet'**
  String get homeCourseProgressEmptyTitle;

  /// No description provided for @homeCourseProgressEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Courses assigned to your batch will show up here.'**
  String get homeCourseProgressEmptyBody;

  /// No description provided for @homeCourseStatusEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No courses to chart yet'**
  String get homeCourseStatusEmptyTitle;

  /// No description provided for @homeCourseStatusEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Completed, in progress and not started appear here.'**
  String get homeCourseStatusEmptyBody;

  /// No description provided for @homeGlanceTitle.
  ///
  /// In en, this message translates to:
  /// **'At a Glance'**
  String get homeGlanceTitle;

  /// No description provided for @homeGlanceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Key learning stats'**
  String get homeGlanceSubtitle;

  /// No description provided for @homeStatEnrolled.
  ///
  /// In en, this message translates to:
  /// **'Enrolled courses'**
  String get homeStatEnrolled;

  /// No description provided for @homeStatLearningHours.
  ///
  /// In en, this message translates to:
  /// **'Learning hours'**
  String get homeStatLearningHours;

  /// No description provided for @homeStatUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get homeStatUpcoming;

  /// No description provided for @homeStatPoints.
  ///
  /// In en, this message translates to:
  /// **'Points'**
  String get homeStatPoints;

  /// No description provided for @homeStatComplete.
  ///
  /// In en, this message translates to:
  /// **'Complete'**
  String get homeStatComplete;

  /// Screen title. The tab itself stays the shorter "Courses".
  ///
  /// In en, this message translates to:
  /// **'My Courses'**
  String get coursesTitle;

  /// No description provided for @coursesSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Course, batch or topic'**
  String get coursesSearchHint;

  /// Badge on a course card carrying its completion deadline.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String courseDue(String date);

  /// No description provided for @coursesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No courses yet'**
  String get coursesEmptyTitle;

  /// No description provided for @coursesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Courses assigned to your batch will show up here.'**
  String get coursesEmptyBody;

  /// No description provided for @coursesNoMatchTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing matches'**
  String get coursesNoMatchTitle;

  /// No description provided for @coursesNoMatchBody.
  ///
  /// In en, this message translates to:
  /// **'Try a different search or filter.'**
  String get coursesNoMatchBody;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get filterInProgress;

  /// No description provided for @filterNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Not started'**
  String get filterNotStarted;

  /// No description provided for @filterCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get filterCompleted;

  /// No description provided for @kindQuiz.
  ///
  /// In en, this message translates to:
  /// **'Quiz'**
  String get kindQuiz;

  /// No description provided for @kindTask.
  ///
  /// In en, this message translates to:
  /// **'Task'**
  String get kindTask;

  /// No description provided for @claimCertificate.
  ///
  /// In en, this message translates to:
  /// **'Claim your certificate'**
  String get claimCertificate;

  /// No description provided for @certificateReadyTitle.
  ///
  /// In en, this message translates to:
  /// **'Certificate ready'**
  String get certificateReadyTitle;

  /// No description provided for @certificateReadyBody.
  ///
  /// In en, this message translates to:
  /// **'Your certificate has been issued. Find it under Progress.'**
  String get certificateReadyBody;

  /// No description provided for @certificateNotReadyTitle.
  ///
  /// In en, this message translates to:
  /// **'Not ready yet'**
  String get certificateNotReadyTitle;

  /// No description provided for @lessonLockedTitle.
  ///
  /// In en, this message translates to:
  /// **'Lesson locked'**
  String get lessonLockedTitle;

  /// No description provided for @lessonLockedGeneric.
  ///
  /// In en, this message translates to:
  /// **'Finish the earlier lessons to unlock this one.'**
  String get lessonLockedGeneric;

  /// No description provided for @backToRoadmap.
  ///
  /// In en, this message translates to:
  /// **'Back to the course'**
  String get backToRoadmap;

  /// No description provided for @readMore.
  ///
  /// In en, this message translates to:
  /// **'Read more'**
  String get readMore;

  /// No description provided for @readLess.
  ///
  /// In en, this message translates to:
  /// **'Read less'**
  String get readLess;

  /// No description provided for @videoPlay.
  ///
  /// In en, this message translates to:
  /// **'Play video'**
  String get videoPlay;

  /// No description provided for @moduleLocked.
  ///
  /// In en, this message translates to:
  /// **'Finish the earlier modules to unlock this one.'**
  String get moduleLocked;

  /// No description provided for @moduleEmpty.
  ///
  /// In en, this message translates to:
  /// **'No lessons have been added to this module yet.'**
  String get moduleEmpty;

  /// No description provided for @focusAreas.
  ///
  /// In en, this message translates to:
  /// **'Focus areas'**
  String get focusAreas;

  /// No description provided for @quickOutline.
  ///
  /// In en, this message translates to:
  /// **'Quick outline'**
  String get quickOutline;

  /// No description provided for @viewDocument.
  ///
  /// In en, this message translates to:
  /// **'View document'**
  String get viewDocument;

  /// No description provided for @markCompleteAction.
  ///
  /// In en, this message translates to:
  /// **'Mark as completed'**
  String get markCompleteAction;

  /// No description provided for @nodeDone.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get nodeDone;

  /// No description provided for @nodeUpdating.
  ///
  /// In en, this message translates to:
  /// **'Updating this lesson'**
  String get nodeUpdating;

  /// Chip at the top of the roadmap, e.g. 3/6 done.
  ///
  /// In en, this message translates to:
  /// **'{done}/{total} done'**
  String nodesDone(int done, int total);

  /// Overline above a module, e.g. MODULE 1 · 2 LESSONS. Rendered uppercase.
  ///
  /// In en, this message translates to:
  /// **'Module {number} · {count, plural, =1{1 lesson} other{{count} lessons}}'**
  String moduleHeader(int number, int count);

  /// No description provided for @quizMinutes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 minute} other{{count} minutes}}'**
  String quizMinutes(int count);

  /// No description provided for @openTaskPage.
  ///
  /// In en, this message translates to:
  /// **'Open task'**
  String get openTaskPage;

  /// No description provided for @viewTaskPage.
  ///
  /// In en, this message translates to:
  /// **'View task'**
  String get viewTaskPage;

  /// No description provided for @kindAssessment.
  ///
  /// In en, this message translates to:
  /// **'Assessment'**
  String get kindAssessment;

  /// No description provided for @nodeAssessmentUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This assessment cannot be taken in the app. Open it on the LMS website.'**
  String get nodeAssessmentUnavailable;

  /// No description provided for @nothingToOpen.
  ///
  /// In en, this message translates to:
  /// **'There is nothing to open in this lesson yet.'**
  String get nothingToOpen;

  /// No description provided for @startQuiz.
  ///
  /// In en, this message translates to:
  /// **'Start quiz'**
  String get startQuiz;

  /// No description provided for @openLink.
  ///
  /// In en, this message translates to:
  /// **'Open link'**
  String get openLink;

  /// No description provided for @quizSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit quiz'**
  String get quizSubmit;

  /// No description provided for @quizNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get quizNext;

  /// No description provided for @quizPrevious.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get quizPrevious;

  /// No description provided for @quizSubmitConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Submit this quiz?'**
  String get quizSubmitConfirmTitle;

  /// No description provided for @quizSubmitConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'Your answers are final once you submit.'**
  String get quizSubmitConfirmBody;

  /// No description provided for @quizConfirmSubmit.
  ///
  /// In en, this message translates to:
  /// **'Yes, submit'**
  String get quizConfirmSubmit;

  /// No description provided for @quizTimeUp.
  ///
  /// In en, this message translates to:
  /// **'Time is up. Your answers were submitted.'**
  String get quizTimeUp;

  /// No description provided for @quizTimeUpUnanswered.
  ///
  /// In en, this message translates to:
  /// **'Time is up. Nothing was answered, so no attempt was recorded.'**
  String get quizTimeUpUnanswered;

  /// No description provided for @quizQuestionGrid.
  ///
  /// In en, this message translates to:
  /// **'Questions'**
  String get quizQuestionGrid;

  /// No description provided for @quizEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'This quiz has no questions yet'**
  String get quizEmptyTitle;

  /// No description provided for @quizPassed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get quizPassed;

  /// No description provided for @quizFailed.
  ///
  /// In en, this message translates to:
  /// **'Not passed'**
  String get quizFailed;

  /// No description provided for @quizMustPass.
  ///
  /// In en, this message translates to:
  /// **'You need to pass this quiz before the next lesson unlocks.'**
  String get quizMustPass;

  /// No description provided for @quizYourAnswers.
  ///
  /// In en, this message translates to:
  /// **'Your answers'**
  String get quizYourAnswers;

  /// No description provided for @quizNotAnswered.
  ///
  /// In en, this message translates to:
  /// **'You did not answer this question.'**
  String get quizNotAnswered;

  /// No description provided for @taskScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Task submission'**
  String get taskScreenTitle;

  /// No description provided for @taskLinkLabel.
  ///
  /// In en, this message translates to:
  /// **'Submission link'**
  String get taskLinkLabel;

  /// No description provided for @taskLinkHint.
  ///
  /// In en, this message translates to:
  /// **'https://github.com/... or a Drive link'**
  String get taskLinkHint;

  /// No description provided for @taskLinkHelp.
  ///
  /// In en, this message translates to:
  /// **'Paste a public GitHub, Drive, or hosted link to your solution.'**
  String get taskLinkHelp;

  /// No description provided for @taskParagraphLabel.
  ///
  /// In en, this message translates to:
  /// **'Written answer'**
  String get taskParagraphLabel;

  /// No description provided for @taskParagraphHint.
  ///
  /// In en, this message translates to:
  /// **'Write your answer here...'**
  String get taskParagraphHint;

  /// No description provided for @taskAttachmentLabel.
  ///
  /// In en, this message translates to:
  /// **'Task brief'**
  String get taskAttachmentLabel;

  /// No description provided for @taskOpenAttachment.
  ///
  /// In en, this message translates to:
  /// **'Open the attached file'**
  String get taskOpenAttachment;

  /// No description provided for @taskCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get taskCodeLabel;

  /// No description provided for @taskCodeHint.
  ///
  /// In en, this message translates to:
  /// **'// Paste your code here...'**
  String get taskCodeHint;

  /// No description provided for @taskFileKindFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get taskFileKindFile;

  /// No description provided for @taskFileKindPdf.
  ///
  /// In en, this message translates to:
  /// **'PDF'**
  String get taskFileKindPdf;

  /// No description provided for @taskFileKindScreenshot.
  ///
  /// In en, this message translates to:
  /// **'Screenshot'**
  String get taskFileKindScreenshot;

  /// No description provided for @taskUploadCta.
  ///
  /// In en, this message translates to:
  /// **'Click to upload'**
  String get taskUploadCta;

  /// No description provided for @taskOr.
  ///
  /// In en, this message translates to:
  /// **'OR'**
  String get taskOr;

  /// No description provided for @taskSubmit.
  ///
  /// In en, this message translates to:
  /// **'Upload submission'**
  String get taskSubmit;

  /// No description provided for @taskResubmitCta.
  ///
  /// In en, this message translates to:
  /// **'Re-upload submission'**
  String get taskResubmitCta;

  /// No description provided for @taskHistoryTitle.
  ///
  /// In en, this message translates to:
  /// **'Submission history'**
  String get taskHistoryTitle;

  /// No description provided for @taskUnderReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get taskUnderReviewTitle;

  /// No description provided for @taskUnderReviewBody.
  ///
  /// In en, this message translates to:
  /// **'Your trainer has your work. You will see their feedback here.'**
  String get taskUnderReviewBody;

  /// No description provided for @taskAttempt.
  ///
  /// In en, this message translates to:
  /// **'#{number}'**
  String taskAttempt(int number);

  /// No description provided for @taskSubmittedWork.
  ///
  /// In en, this message translates to:
  /// **'What you submitted'**
  String get taskSubmittedWork;

  /// No description provided for @taskViewFile.
  ///
  /// In en, this message translates to:
  /// **'View file'**
  String get taskViewFile;

  /// No description provided for @taskWorkLink.
  ///
  /// In en, this message translates to:
  /// **'Link'**
  String get taskWorkLink;

  /// No description provided for @taskWorkAnswer.
  ///
  /// In en, this message translates to:
  /// **'Answer'**
  String get taskWorkAnswer;

  /// No description provided for @taskWorkCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get taskWorkCode;

  /// No description provided for @taskWorkFile.
  ///
  /// In en, this message translates to:
  /// **'File'**
  String get taskWorkFile;

  /// No description provided for @taskCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get taskCancel;

  /// No description provided for @taskSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted for review.'**
  String get taskSubmitted;

  /// No description provided for @taskStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get taskStatusPending;

  /// No description provided for @taskStatusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get taskStatusApproved;

  /// No description provided for @taskStatusRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get taskStatusRejected;

  /// No description provided for @taskFeedback.
  ///
  /// In en, this message translates to:
  /// **'Trainer feedback'**
  String get taskFeedback;

  /// No description provided for @taskScore.
  ///
  /// In en, this message translates to:
  /// **'awarded'**
  String get taskScore;

  /// No description provided for @taskResubmit.
  ///
  /// In en, this message translates to:
  /// **'Re-submit'**
  String get taskResubmit;

  /// No description provided for @viewResult.
  ///
  /// In en, this message translates to:
  /// **'View result'**
  String get viewResult;

  /// No description provided for @attemptsLeftLabel.
  ///
  /// In en, this message translates to:
  /// **'Attempts left'**
  String get attemptsLeftLabel;

  /// No description provided for @progressTitle.
  ///
  /// In en, this message translates to:
  /// **'My Learning Progress'**
  String get progressTitle;

  /// No description provided for @progressSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Overall completion, course-wise breakdown and your earned certificates'**
  String get progressSubtitle;

  /// No description provided for @progressOverallTitle.
  ///
  /// In en, this message translates to:
  /// **'Overall Progress'**
  String get progressOverallTitle;

  /// No description provided for @progressBreakdownTitle.
  ///
  /// In en, this message translates to:
  /// **'Course-wise Breakdown'**
  String get progressBreakdownTitle;

  /// No description provided for @progressLessonsDone.
  ///
  /// In en, this message translates to:
  /// **'Lessons'**
  String get progressLessonsDone;

  /// No description provided for @progressCertificates.
  ///
  /// In en, this message translates to:
  /// **'Certificates'**
  String get progressCertificates;

  /// No description provided for @progressEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No progress to show yet'**
  String get progressEmptyTitle;

  /// No description provided for @progressEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Courses assigned to your batch will show up here.'**
  String get progressEmptyBody;

  /// No description provided for @certificatesTitle.
  ///
  /// In en, this message translates to:
  /// **'My Certificates'**
  String get certificatesTitle;

  /// No description provided for @certificatesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your earned certificates, organised by type'**
  String get certificatesSubtitle;

  /// No description provided for @certificatesEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No course certificates yet'**
  String get certificatesEmptyTitle;

  /// No description provided for @certificatesEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Complete a course to earn your first certificate and showcase your achievement!'**
  String get certificatesEmptyBody;

  /// No description provided for @view.
  ///
  /// In en, this message translates to:
  /// **'View'**
  String get view;

  /// No description provided for @certificateDownloadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not download that certificate.'**
  String get certificateDownloadFailed;

  /// No description provided for @reopenFromCourseTitle.
  ///
  /// In en, this message translates to:
  /// **'Open this from the course'**
  String get reopenFromCourseTitle;

  /// No description provided for @reopenFromCourseBody.
  ///
  /// In en, this message translates to:
  /// **'This screen needs to be opened from its lesson.'**
  String get reopenFromCourseBody;

  /// No description provided for @percentComplete.
  ///
  /// In en, this message translates to:
  /// **'{percent}% complete'**
  String percentComplete(int percent);

  /// No description provided for @lessonsDone.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} lessons done'**
  String lessonsDone(int done, int total);

  /// No description provided for @lessonLockedBy.
  ///
  /// In en, this message translates to:
  /// **'Finish “{title}” first.'**
  String lessonLockedBy(String title);

  /// No description provided for @questionOf.
  ///
  /// In en, this message translates to:
  /// **'Question {current} of {total}'**
  String questionOf(int current, int total);

  /// No description provided for @quizScored.
  ///
  /// In en, this message translates to:
  /// **'Scored {percent}%'**
  String quizScored(int percent);

  /// No description provided for @quizNoAttempt.
  ///
  /// In en, this message translates to:
  /// **'There is no recorded attempt for this quiz yet.'**
  String get quizNoAttempt;

  /// No description provided for @quizScoreCaption.
  ///
  /// In en, this message translates to:
  /// **'{correct} of {total} correct'**
  String quizScoreCaption(int correct, int total);

  /// No description provided for @attemptsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No attempts left} =1{1 attempt left} other{{count} attempts left}}'**
  String attemptsLeft(int count);

  /// No description provided for @rulesQuestions.
  ///
  /// In en, this message translates to:
  /// **'{count} questions'**
  String rulesQuestions(int count);

  /// No description provided for @signOutConfirm.
  ///
  /// In en, this message translates to:
  /// **'You\'ll need to sign in again to keep learning on this device.'**
  String get signOutConfirm;

  /// No description provided for @videoOpenExternally.
  ///
  /// In en, this message translates to:
  /// **'Open the video'**
  String get videoOpenExternally;

  /// No description provided for @videoPlaybackSpeed.
  ///
  /// In en, this message translates to:
  /// **'Playback speed'**
  String get videoPlaybackSpeed;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @download.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get download;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @certificateShareText.
  ///
  /// In en, this message translates to:
  /// **'My certificate for {course}'**
  String certificateShareText(String course);

  /// No description provided for @certificateSaved.
  ///
  /// In en, this message translates to:
  /// **'Certificate saved to your device.'**
  String get certificateSaved;

  /// No description provided for @certificateSavedInApp.
  ///
  /// In en, this message translates to:
  /// **'Certificate downloaded. Use Share to save or send it.'**
  String get certificateSavedInApp;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @profileLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load your profile.'**
  String get profileLoadFailed;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get editProfile;

  /// No description provided for @profileRoles.
  ///
  /// In en, this message translates to:
  /// **'Your access'**
  String get profileRoles;

  /// No description provided for @profileOrganization.
  ///
  /// In en, this message translates to:
  /// **'Organization'**
  String get profileOrganization;

  /// No description provided for @profileSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get profileSettings;

  /// No description provided for @profileContact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get profileContact;

  /// Printed under Sign out, e.g. v1.0.0.
  ///
  /// In en, this message translates to:
  /// **'v{version}'**
  String appVersion(String version);

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile updated.'**
  String get profileSaved;

  /// No description provided for @profileUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Profile unavailable'**
  String get profileUnavailable;

  /// No description provided for @profilePhoto.
  ///
  /// In en, this message translates to:
  /// **'Profile photo'**
  String get profilePhoto;

  /// No description provided for @photoChoose.
  ///
  /// In en, this message translates to:
  /// **'Choose a photo'**
  String get photoChoose;

  /// No description provided for @photoRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove selected photo'**
  String get photoRemove;

  /// No description provided for @firstName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get firstName;

  /// No description provided for @firstNameHint.
  ///
  /// In en, this message translates to:
  /// **'Your given name'**
  String get firstNameHint;

  /// No description provided for @firstNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your first name.'**
  String get firstNameRequired;

  /// No description provided for @lastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get lastName;

  /// No description provided for @lastNameHint.
  ///
  /// In en, this message translates to:
  /// **'Your family name'**
  String get lastNameHint;

  /// No description provided for @phoneNumber.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phoneNumber;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'9876543210'**
  String get phoneHint;

  /// No description provided for @phoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid phone number.'**
  String get phoneInvalid;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get changePassword;

  /// No description provided for @changePasswordBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be signed out everywhere and will need to sign in again with the new password.'**
  String get changePasswordBody;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get currentPassword;

  /// No description provided for @currentPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'The password you use now'**
  String get currentPasswordHint;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPassword;

  /// No description provided for @newPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters'**
  String get newPasswordHint;

  /// No description provided for @confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get confirmPassword;

  /// No description provided for @confirmPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Type the new password again'**
  String get confirmPasswordHint;

  /// No description provided for @passwordsDoNotMatch.
  ///
  /// In en, this message translates to:
  /// **'These passwords don\'t match.'**
  String get passwordsDoNotMatch;

  /// No description provided for @passwordSameAsCurrent.
  ///
  /// In en, this message translates to:
  /// **'Choose a password different from your current one.'**
  String get passwordSameAsCurrent;

  /// No description provided for @passwordChangedDone.
  ///
  /// In en, this message translates to:
  /// **'Password changed. Sign in with your new password.'**
  String get passwordChangedDone;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least {count} characters.'**
  String passwordTooShort(int count);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
