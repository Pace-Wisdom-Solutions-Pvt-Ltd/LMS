// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The Certificate model.
//
// `GET …/certificates/` has a captured example, but it is an **empty page** —
// so unlike every other model here, this one is written against the OpenAPI
// schema and has never been seen against real data. These tests pin what the
// schema promises and, more importantly, what happens when it does not
// deliver.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  Map<String, dynamic> schemaRow({
    Object? certificateType = 'COURSE',
    Object? course = 1,
    String courseName = 'Python Fundamentals',
    String title = 'Course Completion',
  }) => <String, dynamic>{
    'id': 5,
    'user': 'b1f3f937',
    'user_email': 'learner@example.com',
    'user_name': 'Diya Rao',
    'course': course,
    'course_name': courseName,
    'certificate_id': 'CERT-C-5-EC645BC6',
    'issued_at': '2026-08-31T10:00:00Z',
    'certificate_type': certificateType,
    'certificate_title': title,
    'organization_name': 'Demo Academy',
    'org_logo': '',
    'download_url': '/api/organizations/2/certificates/5/download/',
  };

  test('reads every field the record carries', () {
    final Certificate c = Certificate.fromJson(schemaRow());

    expect(c.id, 5);
    expect(c.courseId, 1);
    expect(c.courseName, 'Python Fundamentals');
    expect(c.certificateId, 'CERT-C-5-EC645BC6');
    expect(c.title, 'Course Completion');
    expect(c.certificateType, 'COURSE');
    expect(c.downloadUrl, '/api/organizations/2/certificates/5/download/');
    expect(c.issuedAt, isNotNull);
  });

  test('certificate_type is carried but decides nothing', () {
    // Every certificate the endpoint returns is listed; the type is read so
    // the value is to hand, not so something can be hidden by it.
    for (final Object? value in <Object?>[
      'COURSE',
      'ASSESSMENT',
      'ANYTHING_ELSE',
      null,
    ]) {
      final Certificate c = Certificate.fromJson(
        schemaRow(certificateType: value),
      );
      expect(c.id, 5, reason: 'parsed whatever the type says');
      expect(c.title, 'Course Completion');
    }
  });

  test('a null type is empty, not the string "null"', () {
    // `'$raw'` on a null yields "null"; the reader must not.
    expect(
      Certificate.fromJson(schemaRow(certificateType: null)).certificateType,
      isEmpty,
    );
  });

  test('a record with no course still parses', () {
    final Certificate c = Certificate.fromJson(
      schemaRow(course: null, courseName: ''),
    );
    expect(c.courseId, isNull);
    expect(c.courseName, isEmpty);
  });

  test('a row with nothing in it does not throw', () {
    final Certificate c = Certificate.fromJson(<String, dynamic>{});
    expect(c.id, -1);
    expect(c.courseId, isNull);
    expect(c.certificateType, isEmpty);
    expect(c.downloadUrl, isEmpty);
    expect(c.issuedAt, isNull);
  });
}
