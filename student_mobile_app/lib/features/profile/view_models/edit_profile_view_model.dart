// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:file_picker/file_picker.dart';
import 'package:lms/utils/app_exports.dart';

/// Editing name, phone and profile picture.
///
/// Screen-scoped. On success it pushes the updated user into
/// [SessionProvider], so every screen already showing the old name updates
/// without a refetch.
class EditProfileViewModel extends BaseProvider {
  EditProfileViewModel({required this.user, ProfileRepository? repository})
    : _repository = repository ?? const ProfileRepository(),
      firstName = user.firstName,
      lastName = user.lastName,
      phoneNumber = user.phoneNumber;

  final AppUser user;
  final ProfileRepository _repository;

  String firstName;
  String lastName;
  String phoneNumber;

  String? firstNameError;
  String? phoneError;

  bool _firstNameTouched = false;
  bool _phoneTouched = false;

  /// A newly chosen picture, not yet uploaded.
  String? pickedImagePath;
  String? pickedImageName;

  String? get visibleFirstNameError =>
      _firstNameTouched ? firstNameError : null;
  String? get visiblePhoneError => _phoneTouched ? phoneError : null;

  /// Nothing to save until something actually differs from the stored record.
  bool get isDirty =>
      firstName.trim() != user.firstName.trim() ||
      lastName.trim() != user.lastName.trim() ||
      phoneNumber.trim() != user.phoneNumber.trim() ||
      pickedImagePath != null;

  bool get canSave =>
      !isBusy && isDirty && firstNameError == null && phoneError == null;

  void onFirstNameChanged(AppLocalizations l10n, String value) {
    firstName = value;
    _validateFirstName(l10n);
    notifyListeners();
  }

  void onFirstNameBlur(AppLocalizations l10n) {
    _firstNameTouched = true;
    _validateFirstName(l10n);
    notifyListeners();
  }

  void onLastNameChanged(String value) {
    lastName = value;
    notifyListeners();
  }

  void onPhoneChanged(AppLocalizations l10n, String value) {
    phoneNumber = value;
    _validatePhone(l10n);
    notifyListeners();
  }

  void onPhoneBlur(AppLocalizations l10n) {
    _phoneTouched = true;
    _validatePhone(l10n);
    notifyListeners();
  }

  void _validateFirstName(AppLocalizations l10n) =>
      firstNameError = firstName.trim().isEmpty ? l10n.firstNameRequired : null;

  /// Phone is optional, but a value that is present has to look like one. The
  /// backend caps it at 20 characters.
  void _validatePhone(AppLocalizations l10n) {
    final String value = phoneNumber.trim();
    if (value.isEmpty) {
      phoneError = null;
    } else if (!RegExp(r'^[+0-9][0-9 ()-]{5,19}$').hasMatch(value)) {
      phoneError = l10n.phoneInvalid;
    } else {
      phoneError = null;
    }
  }

  /// Picks a profile photo.
  ///
  /// Through **`file_picker`**, the one picker in this app: the task form needs
  /// arbitrary files (a PDF, a screenshot) and `image_picker` cannot offer
  /// those, so narrowing this one to `FileType.image` costs less than carrying
  /// a second package for it.
  ///
  /// The trade is the **camera**: `file_picker` opens a browser, not a
  /// viewfinder. A learner takes the photo in their camera app and picks it
  /// here, which is one more step for them and one fewer permission for us.
  Future<void> pickImage() async {
    try {
      final List<PlatformFile> picked = await FilePicker.pickFiles(
        type: FileType.image,
        compressionQuality: 85,
      );
      final PlatformFile? file = picked.firstOrNull;
      final String? path = file?.path;
      if (file == null || path == null) return;

      pickedImagePath = path;
      pickedImageName = file.name;
      notifyListeners();
    } catch (e) {
      appLogPrint('Picking a profile photo failed: $e', tag: 'PROFILE');
    }
  }

  void clearPickedImage() {
    pickedImagePath = null;
    pickedImageName = null;
    notifyListeners();
  }

  /// Saves, and returns the updated user so the caller can store it.
  ///
  /// The picture is a separate multipart call; if it fails, the name and phone
  /// change still stands and the error says so rather than rolling everything
  /// back.
  Future<AppUser?> save(AppLocalizations l10n) async {
    _firstNameTouched = true;
    _phoneTouched = true;
    _validateFirstName(l10n);
    _validatePhone(l10n);
    if (firstNameError != null || phoneError != null) {
      notifyListeners();
      return null;
    }

    setState(ViewState.busy);
    AppUser updated = user;

    final bool fieldsChanged =
        firstName.trim() != user.firstName.trim() ||
        lastName.trim() != user.lastName.trim() ||
        phoneNumber.trim() != user.phoneNumber.trim();

    if (fieldsChanged) {
      final ApiResponse res = await _repository.updateProfile(
        userId: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      );
      if (!res.isSuccess) {
        setState(ViewState.error, error: res.message);
        return null;
      }
      updated = updated.copyWith(
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      );
    }

    if (pickedImagePath != null) {
      final ApiResponse res = await _repository.updateProfilePicture(
        userId: user.id,
        filePath: pickedImagePath!,
        fileName: pickedImageName,
      );
      if (!res.isSuccess) {
        setState(ViewState.error, error: res.message);
        // The text fields did save — hand them back so they are not lost.
        return fieldsChanged ? updated : null;
      }
      final String? url = res.dataMap?['profile_picture'] as String?;
      if (url != null) updated = updated.copyWith(profilePicture: url);
    }

    setState(ViewState.success);
    return updated;
  }
}
