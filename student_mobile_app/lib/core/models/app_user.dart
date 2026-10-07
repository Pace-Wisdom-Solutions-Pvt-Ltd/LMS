// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The signed-in learner. Plain data class — `fromJson` / `toJson` only.
class AppUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String phoneNumber;
  final String? profilePicture;
  final bool isActive;
  final bool isSuperuser;
  final String status;
  final List<String> roles;

  /// The account's organizations, and the **only** membership list the app
  /// uses. It arrives under `user.organizations` on both login and
  /// `GET /api/auth/profile/`; the login response's top-level
  /// `organizations[]` is ignored entirely.
  final List<OrgMembership> organizations;

  const AppUser({
    required this.id,
    required this.email,
    this.firstName = '',
    this.lastName = '',
    this.phoneNumber = '',
    this.profilePicture,
    this.isActive = true,
    this.isSuperuser = false,
    this.status = '',
    this.roles = const <String>[],
    this.organizations = const <OrgMembership>[],
  });

  String get fullName => <String>[
    firstName,
    lastName,
  ].where((String p) => p.trim().isNotEmpty).join(' ').trim();

  /// Falls back to the local part of the email so a nameless account still has
  /// something to greet.
  String get displayName =>
      fullName.isNotEmpty ? fullName : email.split('@').first;

  /// Initials for the avatar when there is no profile picture.
  String get initials {
    final List<String> parts = displayName
        .split(RegExp(r'\s+'))
        .where((String p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first)
        .toUpperCase();
  }

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: '${json['id'] ?? ''}',
    email: (json['email'] ?? '').toString(),
    firstName: (json['first_name'] ?? '').toString(),
    lastName: (json['last_name'] ?? '').toString(),
    phoneNumber: (json['phone_number'] ?? '').toString(),
    profilePicture: json['profile_picture'] as String?,
    isActive: json['is_active'] != false,
    isSuperuser: json['is_superuser'] == true,
    status: (json['status'] ?? '').toString(),
    roles: (json['roles'] as List<dynamic>? ?? const <dynamic>[])
        .map((dynamic e) => '$e')
        .toList(),
    organizations:
        (json['organizations'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map<dynamic, dynamic>>()
            .map(
              (Map<dynamic, dynamic> e) =>
                  OrgMembership.fromJson(Map<String, dynamic>.from(e)),
            )
            .toList(),
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'email': email,
    'first_name': firstName,
    'last_name': lastName,
    'phone_number': phoneNumber,
    'profile_picture': profilePicture,
    'is_active': isActive,
    'is_superuser': isSuperuser,
    'status': status,
    'roles': roles,
    'organizations': organizations
        .map((OrgMembership o) => o.toJson())
        .toList(),
  };

  AppUser copyWith({
    String? firstName,
    String? lastName,
    String? phoneNumber,
    String? profilePicture,
  }) => AppUser(
    id: id,
    email: email,
    firstName: firstName ?? this.firstName,
    lastName: lastName ?? this.lastName,
    phoneNumber: phoneNumber ?? this.phoneNumber,
    profilePicture: profilePicture ?? this.profilePicture,
    isActive: isActive,
    isSuperuser: isSuperuser,
    status: status,
    roles: roles,
    organizations: organizations,
  );
}
