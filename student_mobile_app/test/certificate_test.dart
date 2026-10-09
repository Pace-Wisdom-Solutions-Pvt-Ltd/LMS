// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The Certificate model.
//
// `GET …/certificates/` nests the course now — `{id, title, description}` —
// where it used to send a bare id beside a flat `course_name`. Both shapes are
// read, so a server on either side of that change still lists something.
//
// The row also carries an absolute `download_url`. It is never followed: the
// server builds it from its own hostname and sends `https://localhost:8000/…`,
// which no device can reach. The download is addressed by `certificate_id`
// against the app's own base URL.

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

  group('the nested course shape', () {
    /// A row exactly as the endpoint sends it now.
    Map<String, dynamic> row() => <String, dynamic>{
      'id': 1,
      'certificate_id': 'CERT-C-1-DEEFDA1C',
      'certificate_type': 'Course',
      'issued_at': '2026-10-08T08:37:02.904648Z',
      'student': <String, dynamic>{
        'id': 'ae5af8a1-5534-49ea-b227-e1cc4e54a6aa',
        'email': 'leelanjans828@gmail.com',
        'full_name': 'Leelanjan S',
      },
      'course': <String, dynamic>{
        'id': 1,
        'title': 'POSH Training',
        'description': 'POSH Training',
      },
      'organization': <String, dynamic>{'id': 1, 'name': 'wisdom pace'},
      'template': null,
      'html_content': '<!DOCTYPE html><html lang="en"><head>…',
      'download_url':
          'https://localhost:8000/api/certificates/CERT-C-1-DEEFDA1C/download/',
      'preview_url':
          'https://localhost:8000/api/certificates/CERT-C-1-DEEFDA1C/html/',
    };

    test('the course comes out of the object, not a flat field', () {
      final Certificate c = Certificate.fromJson(row());

      expect(c.id, 1);
      expect(c.courseId, 1);
      expect(c.courseName, 'POSH Training');
      expect(c.certificateId, 'CERT-C-1-DEEFDA1C');
      expect(c.certificateType, 'Course');
      expect(c.issuedAt?.toUtc().year, 2026);
    });

    test('the card title falls back to the course name', () {
      // `certificate_title` is gone from the payload, and the card has to
      // print something.
      final Certificate c = Certificate.fromJson(row());
      expect(c.title, 'POSH Training');
    });

    test('the download is addressed by reference, not by download_url', () {
      final Certificate c = Certificate.fromJson(row());

      expect(
        ApiEndPoints.downloadCertificate(c.certificateId),
        '/api/certificates/CERT-C-1-DEEFDA1C/download/',
      );
      expect(
        c.downloadUrl,
        contains('localhost:8000'),
        reason: 'carried, and exactly why it is not followed',
      );
    });

    test('a course object with no title leaves the name empty', () {
      final Map<String, dynamic> json = row()
        ..['course'] = <String, dynamic>{'id': 4};

      final Certificate c = Certificate.fromJson(json);
      expect(c.courseId, 4);
      expect(c.courseName, isEmpty);
    });
  });
}
