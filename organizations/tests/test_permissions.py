# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from rest_framework.test import APIClient
from organizations.permissions import (
    IsSuperAdmin,
    IsOrgAdminOrTeacher,
    IsOrgAdmin,
    IsOrgAdminOrTeacherOrEnrolledStudent,
)
from django.contrib.auth import get_user_model
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role

pytestmark = pytest.mark.django_db
User = get_user_model()


def make_view_with_kwargs(**kwargs):
    class V:
        pass

    v = V()
    v.kwargs = kwargs
    return v


def test_is_superadmin_permission_true_and_false():
    user = User.objects.create_superuser("s1@org.com", "p", username="s1")
    request = APIClient().request()
    request.user = user
    assert IsSuperAdmin().has_permission(request, None)

    user2 = User.objects.create_user("s2@org.com", "p", username="s2")
    request2 = APIClient().request()
    request2.user = user2
    assert not IsSuperAdmin().has_permission(request2, None)


def test_is_org_admin_or_teacher_checks_org_membership():
    # setup org, roles, and members
    org = Organization.objects.create(name="OrgA", contact_email="a@org.com")
    role_admin, _ = Role.objects.get_or_create(name="org_admin")
    role_teacher, _ = Role.objects.get_or_create(name="teacher")

    admin_user = User.objects.create_user("oa@org.com", "p", username="oa")
    OrganizationMember.objects.create(organization=org, user=admin_user, role=role_admin)
    teacher_user = User.objects.create_user("ot@org.com", "p", username="ot")
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=role_teacher)

    req_admin = APIClient().request()
    req_admin.user = admin_user
    view = make_view_with_kwargs(org_pk=org.id)
    assert IsOrgAdminOrTeacher().has_permission(req_admin, view)

    req_teacher = APIClient().request()
    req_teacher.user = teacher_user
    assert IsOrgAdminOrTeacher().has_permission(req_teacher, view)

    # user not member
    outsider = User.objects.create_user("out@org.com", "p", username="out")
    req_out = APIClient().request()
    req_out.user = outsider
    assert not IsOrgAdminOrTeacher().has_permission(req_out, view)

    # missing org id in view -> False
    view2 = make_view_with_kwargs()
    assert not IsOrgAdminOrTeacher().has_permission(req_admin, view2)


def test_is_org_admin_checks_strict_admin_role():
    org = Organization.objects.create(name="OrgB", contact_email="b@org.com")
    role_admin, _ = Role.objects.get_or_create(name="org_admin")
    admin_user = User.objects.create_user("ad@org.com", "p", username="ad")
    OrganizationMember.objects.create(organization=org, user=admin_user, role=role_admin)

    req = APIClient().request()
    req.user = admin_user
    view = make_view_with_kwargs(pk=org.id)
    assert IsOrgAdmin().has_permission(req, view)

    # non-admin should be False
    non = User.objects.create_user("n@org.com", "p", username="n")
    req2 = APIClient().request()
    req2.user = non
    assert not IsOrgAdmin().has_permission(req2, view)


def test_is_org_admin_or_teacher_or_enrolled_student_various_paths():
    org = Organization.objects.create(name="OrgC", contact_email="c@org.com")
    role_admin, _ = Role.objects.get_or_create(name="org_admin")
    _, _ = Role.objects.get_or_create(name="teacher")
    _, _ = Role.objects.get_or_create(name="student")

    admin = User.objects.create_user("adm@org.com", "p", username="adm")
    OrganizationMember.objects.create(organization=org, user=admin, role=role_admin)
    student = User.objects.create_user("stu@org.com", "p", username="stu")

    # case: admin should pass regardless of batch
    req_admin = APIClient().request()
    req_admin.user = admin
    view = make_view_with_kwargs(org_pk=org.id)
    assert IsOrgAdminOrTeacherOrEnrolledStudent().has_permission(req_admin, view)

    # case: not staff and no batch -> False
    req_student = APIClient().request()
    req_student.user = student
    view_no_batch = make_view_with_kwargs(org_pk=org.id)
    assert not IsOrgAdminOrTeacherOrEnrolledStudent().has_permission(req_student, view_no_batch)

    # case: not staff, batch provided but student not enrolled -> False
    batch = Batch.objects.create(organization=org, name="B1", start_date="2026-01-01", end_date="2026-12-31")
    view_with_batch = make_view_with_kwargs(org_pk=org.id, batch_pk=batch.id)
    assert not IsOrgAdminOrTeacherOrEnrolledStudent().has_permission(req_student, view_with_batch)

    # enroll student and test True
    BatchStudent.objects.create(batch=batch, student=student)
    assert IsOrgAdminOrTeacherOrEnrolledStudent().has_permission(req_student, view_with_batch)


def test_permission_classes_allow_superuser_and_org_id_variants():
    superuser = User.objects.create_superuser("root@org.com", "p", username="root")
    req = APIClient().request()
    req.user = superuser

    assert IsOrgAdminOrTeacher().has_permission(req, make_view_with_kwargs(org_id=999))
    assert IsOrgAdmin().has_permission(req, make_view_with_kwargs(org_id=999))
    assert IsOrgAdminOrTeacherOrEnrolledStudent().has_permission(req, make_view_with_kwargs(org_pk=999, batch_pk=999))
