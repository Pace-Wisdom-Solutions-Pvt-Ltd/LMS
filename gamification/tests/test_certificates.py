# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from curriculum.models import Course, Module, Node, LearningMaterial, Task, TaskSubmission, StudentNodeProgress
from gamification.models import Certificate, CertificateTemplate
from gamification.utils import is_course_completed_for_student, get_or_create_course_certificate

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def test_setup():
    student_user = User.objects.create_user(
        email="cert_student@test.com",
        password="password123",
        first_name="Jane",
        last_name="Doe"
    )
    teacher_user = User.objects.create_user(
        email="cert_teacher@test.com",
        password="password123",
        first_name="Prof",
        last_name="Smith"
    )
    org = Organization.objects.create(name="Cert Org", slug="cert-org")
    student_role, _ = Role.objects.get_or_create(name="student")
    teacher_role, _ = Role.objects.get_or_create(name="teacher")

    student_member = OrganizationMember.objects.create(
        user=student_user, organization=org, role=student_role
    )
    teacher_member = OrganizationMember.objects.create(
        user=teacher_user, organization=org, role=teacher_role
    )

    course = Course.objects.create(organization=org, title="Cybersecurity 101", status="Published")
    module = Module.objects.create(course=course, title="Module 1")
    node1 = Node.objects.create(module=module, title="Lesson 1")
    LearningMaterial.objects.create(node=node1, content_type="Doc")

    node2 = Node.objects.create(module=module, title="Practical Lab")
    task = Task.objects.create(node=node2, title="Submit Lab Report")

    client = APIClient()
    return {
        "student_user": student_user,
        "teacher_user": teacher_user,
        "org": org,
        "student_member": student_member,
        "course": course,
        "node1": node1,
        "node2": node2,
        "task": task,
        "client": client,
    }


def test_course_completion_requires_all_tasks_approved(test_setup):
    s = test_setup
    # Initially not completed
    completed, reason = is_course_completed_for_student(s["student_user"], s["course"])
    assert not completed
    assert "Task" in reason or "remaining" in reason

    # Complete lesson 1
    StudentNodeProgress.objects.create(
        student=s["student_member"],
        node=s["node1"],
        status="Completed"
    )

    # Submit task, but not yet approved
    submission = TaskSubmission.objects.create(
        task=s["task"],
        student=s["student_member"],
        payload={"notes": "Done"},
        status="Pending"
    )
    completed, reason = is_course_completed_for_student(s["student_user"], s["course"])
    assert not completed
    assert "pending trainer review" in reason

    # Approve task
    submission.status = "Approved"
    submission.save()
    StudentNodeProgress.objects.create(
        student=s["student_member"],
        node=s["node2"],
        status="Completed"
    )

    # Now completed!
    completed, reason = is_course_completed_for_student(s["student_user"], s["course"])
    assert completed


def test_auto_generate_certificate_and_api_endpoints(test_setup):
    s = test_setup
    # Complete the course
    StudentNodeProgress.objects.create(student=s["student_member"], node=s["node1"], status="Completed")
    TaskSubmission.objects.create(task=s["task"], student=s["student_member"], status="Approved")
    StudentNodeProgress.objects.create(student=s["student_member"], node=s["node2"], status="Completed")

    # Claim certificate via endpoint
    s["client"].force_authenticate(user=s["student_user"])
    url = f"/api/organizations/{s['org'].id}/courses/{s['course'].id}/certificate/"
    res = s["client"].get(url)
    assert res.status_code in [200, 201]
    data = res.json()
    assert "certificate_id" in data
    assert data["course"]["title"] == "Cybersecurity 101"
    assert data["student"]["email"] == "cert_student@test.com"
    cert_code = data["certificate_id"]

    # Verify via user UUID endpoint
    user_url = f"/api/users/{s['student_user'].id}/certificates/"
    res_user = s["client"].get(user_url)
    assert res_user.status_code == 200
    user_certs = res_user.json()
    assert len(user_certs) == 1
    assert user_certs[0]["certificate_id"] == cert_code

    # Verify via users/me endpoint
    me_url = "/api/users/me/certificates/"
    res_me = s["client"].get(me_url)
    assert res_me.status_code == 200
    assert len(res_me.json()) == 1

    # Verify via public verification endpoint
    public_url = f"/api/certificates/{cert_code}/"
    public_client = APIClient()
    res_pub = public_client.get(public_url)
    assert res_pub.status_code == 200
    assert res_pub.json()["certificate_id"] == cert_code

    # Verify org certificates list
    org_url = f"/api/organizations/{s['org'].id}/certificates/"
    res_org = s["client"].get(org_url)
    assert res_org.status_code == 200
    assert len(res_org.json()) == 1


def test_backend_html_preview_and_pdf_download(test_setup):
    from gamification.utils import render_certificate_html, generate_certificate_pdf

    s = test_setup
    StudentNodeProgress.objects.create(student=s["student_member"], node=s["node1"], status="Completed")
    TaskSubmission.objects.create(task=s["task"], student=s["student_member"], status="Approved")
    StudentNodeProgress.objects.create(student=s["student_member"], node=s["node2"], status="Completed")

    s["client"].force_authenticate(user=s["student_user"])
    url = f"/api/organizations/{s['org'].id}/courses/{s['course'].id}/certificate/"
    res = s["client"].get(url)
    cert_code = res.json()["certificate_id"]

    cert = Certificate.objects.get(certificate_id=cert_code)

    # 1. Test render_certificate_html
    html = render_certificate_html(cert)
    assert "CERTIFICATE OF COMPLETION" in html
    assert "Jane Doe" in html
    assert "Cybersecurity 101" in html
    assert cert_code in html
    assert "CERT ORG" in html

    # 2. Test generate_certificate_pdf
    pdf_bytes = generate_certificate_pdf(cert)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")

    # 3. Test HTTP HTML preview endpoint
    html_url = f"/api/certificates/{cert_code}/html/"
    res_html = s["client"].get(html_url)
    assert res_html.status_code == 200
    assert "text/html" in res_html["content-type"]
    assert "CERTIFICATE OF COMPLETION" in res_html.content.decode("utf-8")

    # 4. Test HTTP PDF download endpoint
    pdf_url = f"/api/certificates/{cert_code}/download/"
    res_pdf = s["client"].get(pdf_url)
    assert res_pdf.status_code == 200
    assert res_pdf["content-type"] == "application/pdf"
    assert f"certificate_{cert_code}.pdf" in res_pdf["content-disposition"]
    assert res_pdf.content.startswith(b"%PDF-")
