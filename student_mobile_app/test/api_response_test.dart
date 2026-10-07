// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

// The DRF adapter.
//
// The backend does not envelope, and its list shapes are inconsistent:
// `my-courses` is a bare array while certificates are page objects.
// Normalizing once is only safe if every shape is actually covered.

import 'package:flutter_test/flutter_test.dart';
import 'package:lms/utils/app_exports.dart';

void main() {
  group('success bodies', () {
    test('a bare object becomes data', () {
      final ApiResponse res = ApiResponse.fromBody(<String, dynamic>{
        'id': 2,
        'name': 'Demo Academy',
      }, statusCode: 200);

      expect(res.isSuccess, isTrue);
      expect(res.dataMap?['name'], 'Demo Academy');
      expect(res.dataList, isEmpty);
    });

    test('a bare array becomes a list — my-courses is not paginated', () {
      final ApiResponse res = ApiResponse.fromBody(<dynamic>[
        <String, dynamic>{'id': 'a'},
        <String, dynamic>{'id': 'b'},
      ], statusCode: 200);

      expect(res.dataList, hasLength(2));
      expect(res.totalCount, 2);
      expect(res.hasNextPage, isFalse);
    });

    test('a DRF page object is unwrapped to its results', () {
      final ApiResponse res = ApiResponse.fromBody(<String, dynamic>{
        'count': 42,
        'next':
            'https://api.test.local/api/organizations/2/certificates/?page=2',
        'previous': null,
        'results': <dynamic>[
          <String, dynamic>{'id': '1'},
        ],
      });

      expect(res.dataList, hasLength(1));
      expect(res.totalCount, 42);
      expect(res.hasNextPage, isTrue);
      expect(
        res.dataMap,
        isNull,
        reason: 'data is the results list, not the page',
      );
    });

    test('a page object on its last page reports no next page', () {
      final ApiResponse res = ApiResponse.fromBody(<String, dynamic>{
        'count': 1,
        'next': null,
        'previous': null,
        'results': <dynamic>[],
      });

      expect(res.hasNextPage, isFalse);
    });

    test('listOf maps results through a fromJson', () {
      final ApiResponse res = ApiResponse.fromBody(<dynamic>[
        <String, dynamic>{'org_id': 2, 'name': 'A', 'role': 'student'},
      ]);

      final List<OrgMembership> orgs = res.listOf(OrgMembership.fromJson);
      expect(orgs.single.orgName, 'A');
    });
  });

  group('error bodies', () {
    test('{"detail": …} becomes the message', () {
      final ApiResponse res = ApiResponse.fromErrorBody(<String, dynamic>{
        'detail': 'Invalid credentials.',
      }, statusCode: 400);

      expect(res.isSuccess, isFalse);
      expect(res.message, 'Invalid credentials.');
      expect(res.fieldErrors, isEmpty);
    });

    test('a field-error map keeps every field and headlines the first', () {
      final ApiResponse res = ApiResponse.fromErrorBody(<String, dynamic>{
        'email': <String>['This field is required.'],
        'password': <String>['Too short.'],
      }, statusCode: 400);

      expect(res.fieldErrors['email'], <String>['This field is required.']);
      expect(res.fieldErrors['password'], <String>['Too short.']);
      expect(res.message, isNotEmpty);
    });

    test('non_field_errors headlines over other fields', () {
      final ApiResponse res = ApiResponse.fromErrorBody(<String, dynamic>{
        'email': <String>['Also wrong.'],
        'non_field_errors': <String>['Unable to log in.'],
      }, statusCode: 400);

      expect(res.message, 'Unable to log in.');
    });

    test('an HTML gateway page degrades to the fallback message', () {
      final ApiResponse res = ApiResponse.fromErrorBody(
        '<html><body>${'x' * 400}</body></html>',
        statusCode: 502,
        fallbackMessage: 'The server is having trouble.',
      );

      expect(res.isSuccess, isFalse);
      expect(res.message, 'The server is having trouble.');
    });
  });
}
