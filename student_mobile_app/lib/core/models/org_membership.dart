// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

/// One entry of `user.organizations[]`.
///
/// **This is the only membership list the app reads.** The login response also
/// carries a top-level `organizations[]` with a slightly different shape
/// (`org_name`, plus a `logo`); it is ignored, because the nested copy is the
/// one that also comes back from `GET /api/auth/profile/` — so memberships can
/// refresh without a re-login, from a single shape.
///
/// The same account can hold a different role in each organization — a learner
/// in one and a trainer in another is normal. Every membership is offered in
/// the picker, labelled with the roles held there, so the person can see what
/// they are opening.
class OrgMembership {
  final int orgId;
  final String orgName;
  final String role;
  final List<String> roles;

  const OrgMembership({
    required this.orgId,
    required this.orgName,
    required this.role,
    this.roles = const <String>[],
  });

  static const String studentRole = 'student';

  /// Every role held in this organization, lowercased and de-duplicated.
  ///
  /// The backend populates `role` and `roles[]` inconsistently across
  /// endpoints, so both are merged rather than trusting either alone.
  Set<String> get allRoles => <String>{
    if (role.trim().isNotEmpty) role.trim().toLowerCase(),
    ...roles
        .map((String r) => r.trim().toLowerCase())
        .where((String r) => r.isNotEmpty),
  };

  /// True when this membership makes the account a learner **in this org**.
  ///
  /// Not a gate — the app admits every role. It is used only to order the
  /// picker, so the organizations the person actually learns in come first.
  bool get isStudent => allRoles.contains(studentRole);

  /// The roles held here, in display form: `['Student', 'Trainer']`.
  List<String> get roleLabels => RoleLabels.forAll(allRoles);

  /// The same list joined for a single-line label.
  String get roleLabel => roleLabels.join(' · ');

  /// Never blank. An organization the API names nothing still has to be
  /// tellable apart in the picker and nameable on Profile.
  String get displayName =>
      orgName.trim().isEmpty ? 'Organization $orgId' : orgName.trim();

  /// Reads `user.organizations[]`.
  ///
  /// The name is accepted under any of the three spellings the API uses for
  /// it. **This is not a licence to feed it the top-level `organizations[]`** —
  /// which list the app reads is decided in [AuthRepository.login] and pinned
  /// by the decoy org in the test fakes. Being strict about the *key* here
  /// only ever produced blank organization names.
  factory OrgMembership.fromJson(Map<String, dynamic> json) => OrgMembership(
    orgId: int.tryParse('${json['org_id']}') ?? -1,
    orgName:
        (json['name'] ?? json['org_name'] ?? json['organization_name'] ?? '')
            .toString(),
    role: (json['role'] ?? '').toString(),
    roles: (json['roles'] as List<dynamic>? ?? const <dynamic>[])
        .map((dynamic e) => '$e')
        .toList(),
  );

  Map<String, dynamic> toJson() => <String, dynamic>{
    'org_id': orgId,
    'name': orgName,
    'role': role,
    'roles': roles,
  };
}

/// Turns an API role string into the word the product uses for it.
///
/// Shared so an account-wide role (`AppUser.roles`) and a role held in one
/// organization ([OrgMembership.roleLabels]) can never print differently.
/// "teacher" becomes **Trainer**: the glossary is binding on UI copy, and the
/// API's word for the role is not the product's word.
abstract final class RoleLabels {
  static String of(String role) => switch (role.trim().toLowerCase()) {
    'student' => 'Student',
    'teacher' || 'trainer' => 'Trainer',
    'manager' => 'Manager',
    'admin' || 'org_admin' => 'Admin',
    'super_admin' || 'superadmin' => 'Super admin',
    final String r =>
      r.isEmpty
          ? r
          : '${r[0].toUpperCase()}${r.substring(1).replaceAll('_', ' ')}',
  };

  /// De-duplicated and sorted, so the same set always reads the same way.
  static List<String> forAll(Iterable<String> roles) {
    final Set<String> labels = <String>{
      for (final String r in roles)
        if (r.trim().isNotEmpty) of(r),
    };
    return labels.toList()..sort();
  }
}
