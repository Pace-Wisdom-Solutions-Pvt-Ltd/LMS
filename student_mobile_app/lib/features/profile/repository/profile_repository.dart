// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The learner's own user record.
///
/// Only ever called with the signed-in learner's own id. The backend permits a
/// student token to read `GET /api/users/{any-uuid}/` (PRD R4, a cross-tenant
/// leak flagged for the backend) — this app does not exercise that, and should
/// not start.
class ProfileRepository {
  const ProfileRepository();

  Future<ApiResponse> getProfile(String userId) =>
      DioClient.get(ApiEndPoints.user(userId));

  /// Name and phone go as JSON.
  ///
  /// Only the fields the learner actually changed are sent, so a PATCH never
  /// clears a value the form did not touch.
  Future<ApiResponse> updateProfile({
    required String userId,
    String? firstName,
    String? lastName,
    String? phoneNumber,
  }) {
    final Map<String, dynamic> body = <String, dynamic>{};
    if (firstName != null) body['first_name'] = firstName;
    if (lastName != null) body['last_name'] = lastName;
    if (phoneNumber != null) body['phone_number'] = phoneNumber;

    if (body.isEmpty) {
      return Future<ApiResponse>.value(
        ApiResponse.failure('Nothing to update.'),
      );
    }
    return DioClient.patch(ApiEndPoints.user(userId), data: body);
  }

  /// The picture is a binary field, so it goes as multipart on its own —
  /// mixing it with the JSON patch would force the whole update to multipart.
  Future<ApiResponse> updateProfilePicture({
    required String userId,
    required String filePath,
    String? fileName,
  }) async {
    final FormData form = FormData.fromMap(<String, dynamic>{
      'profile_picture': await MultipartFile.fromFile(
        filePath,
        filename: fileName,
      ),
    });
    return DioClient.patchMultipart(ApiEndPoints.user(userId), form);
  }
}
