# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from django.utils.crypto import get_random_string
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request as DRFRequest
from django.contrib.auth import get_user_model
from organizations.views import OrganizationViewSet, OrganizationMemberViewSet, BatchStudentViewSet
from organizations.models import Organization, OrganizationMember, Batch, BatchStudent
from rbac.models import Role

pytestmark = pytest.mark.django_db
User = get_user_model()
TEST_PASSWORD = get_random_string(length=12)




def test_organization_member_get_queryset_none():
    factory = APIRequestFactory()
    user = User.objects.create_user(email='u@org.com', password=TEST_PASSWORD)
    view = OrganizationMemberViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    req = factory.get('/')
    req.user = user
    request = view.initialize_request(req)
    request.user = user
    view.request = request
    view.kwargs = {}
    qs = view.get_queryset()
    assert qs.count() == 0


def test_batchstudent_create_and_destroy_flow():
    factory = APIRequestFactory()
    user = User.objects.create_user(email='admin@org.com', password=TEST_PASSWORD)
    org = Organization.objects.create(name='OrgX', contact_email='x@o.com')
    import datetime
    batch = Batch.objects.create(organization=org, name='Fall', start_date=datetime.date.today(), end_date=datetime.date.today())

    # ensure student role exists
    _, _ = Role.objects.get_or_create(name='student')

    view = BatchStudentViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    data = {'students': [{'email': 's1@x.com', 'first_name': 'S1'}]}
    post_req = factory.post('/', data=data, format='json')
    post_req.user = user
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.format_kwarg = None
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}
    resp = view.create(request, org.id, batch.id)
    assert resp.status_code in (201,)

    # create a batch student and then delete
    bs = BatchStudent.objects.filter(batch=batch).first()
    del_req = factory.delete('/')
    del_req.user = user
    del_request = view.initialize_request(del_req)
    del_request.user = user
    view.request = del_request
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id, 'pk': str(bs.student.user.id)}
    resp2 = view.destroy(del_request, org.id, batch.id, pk=str(bs.student.user.id))
    assert resp2.status_code in (204,)


def test_batch_student_assignment_date_exceeded():
    """Test that students cannot be assigned to batches created more than 2 weeks ago"""
    from django.utils import timezone
    from datetime import timedelta
    
    factory = APIRequestFactory()
    user = User.objects.create_user(email='admin@org.com', password=TEST_PASSWORD)
    org = Organization.objects.create(name='OrgX', contact_email='x@o.com')
    
    # Create a batch that was created more than 2 weeks ago
    three_weeks_ago = timezone.now() - timedelta(weeks=3)
    batch = Batch.objects.create(
        organization=org, 
        name='Old Batch', 
        start_date=three_weeks_ago.date(), 
        end_date=three_weeks_ago.date()
    )
    # Manually set created_at to 3 weeks ago
    batch.created_at = three_weeks_ago
    batch.save()

    # ensure student role exists
    _, _ = Role.objects.get_or_create(name='student')

    view = BatchStudentViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    data = {'students': [{'email': 's1@x.com', 'first_name': 'S1'}]}
    post_req = factory.post('/', data=data, format='json')
    post_req.user = user
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.format_kwarg = None
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}
    resp = view.create(request, org.id, batch.id)
    
    # Should return 400 Bad Request with "Assignment Date Exceeded" error
    assert resp.status_code == 400
    assert resp.data['error'] == 'Assignment Date Exceeded'


def test_batch_student_assignment_allowed_for_recent_batch():
    """Test that students can be assigned to batches created less than 2 weeks ago"""
    from django.utils import timezone
    from datetime import timedelta
    
    factory = APIRequestFactory()
    user = User.objects.create_user(email='admin@org.com', password=TEST_PASSWORD)
    org = Organization.objects.create(name='OrgX', contact_email='x@o.com')
    
    # Create a batch that was created recently (1 week ago)
    one_week_ago = timezone.now() - timedelta(weeks=1)
    batch = Batch.objects.create(
        organization=org, 
        name='Recent Batch', 
        start_date=one_week_ago.date(), 
        end_date=one_week_ago.date()
    )
    # Manually set created_at to 1 week ago
    batch.created_at = one_week_ago
    batch.save()

    # ensure student role exists
    _, _ = Role.objects.get_or_create(name='student')

    view = BatchStudentViewSet()
    view.action_map = {'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}
    data = {'students': [{'email': 's1@x.com', 'first_name': 'S1'}]}
    post_req = factory.post('/', data=data, format='json')
    post_req.user = user
    request = view.initialize_request(post_req)
    request.user = user
    view.request = request
    view.format_kwarg = None
    view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}
    resp = view.create(request, org.id, batch.id)
    
    # Should succeed with 201 Created
    assert resp.status_code == 201



def test_soft_deleted_students_excluded_from_lists():
    org = Organization.objects.create(name='OrgX', contact_email='x@o.com')
    role, _ = Role.objects.get_or_create(name='student')
    
    # Create user and membership
    student_user = User.objects.create_user(email='deleted_student@org.com', password=TEST_PASSWORD)
    OrganizationMember.objects.create(organization=org, user=student_user, role=role)
    
    from organizations.views import OrganizationStudentViewSet
    view = OrganizationStudentViewSet()
    view.request = DRFRequest(APIRequestFactory().get('/'))
    view.kwargs = {'org_pk': org.id}
    
    # Active student is in queryset
    assert view.get_queryset().filter(user=student_user).exists()
    
    # Soft-delete the user
    student_user.delete()
    assert student_user.is_deleted is True
    
    # Soft-deleted student is excluded from queryset
    assert not view.get_queryset().filter(user=student_user).exists()


def test_globally_inactive_users_excluded_from_lists():
    org = Organization.objects.create(name='OrgY', contact_email='y@o.com')
    student_role, _ = Role.objects.get_or_create(name='student')
    teacher_role, _ = Role.objects.get_or_create(name='teacher')

    student_user = User.objects.create_user(email='test_student@org.com', password=TEST_PASSWORD)
    teacher_user = User.objects.create_user(email='test_teacher@org.com', password=TEST_PASSWORD)

    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)

    import datetime
    batch = Batch.objects.create(organization=org, name='Winter', start_date=datetime.date.today(), end_date=datetime.date.today())
    BatchStudent.objects.create(batch=batch, student=student_user)

    # Verify they exist in viewset querysets initially
    from organizations.views import OrganizationStudentViewSet, OrganizationMemberViewSet, StaffViewSet, BatchStudentViewSet

    # Students List
    student_view = OrganizationStudentViewSet()
    student_view.request = DRFRequest(APIRequestFactory().get('/'))
    student_view.kwargs = {'org_pk': org.id}
    assert student_view.get_queryset().filter(user=student_user).exists()

    # Members List
    member_view = OrganizationMemberViewSet()
    member_view.request = DRFRequest(APIRequestFactory().get('/'))
    member_view.kwargs = {'org_pk': org.id}
    assert member_view.get_queryset().filter(user=student_user).exists()
    assert member_view.get_queryset().filter(user=teacher_user).exists()

    # Staff List
    staff_view = StaffViewSet()
    staff_view.request = DRFRequest(APIRequestFactory().get('/'))
    staff_view.kwargs = {'org_pk': org.id}
    assert staff_view.get_queryset().filter(user=teacher_user).exists()

    # Batch Students List
    batch_view = BatchStudentViewSet()
    batch_view.request = DRFRequest(APIRequestFactory().get('/'))
    batch_view.kwargs = {'org_pk': org.id, 'batch_pk': batch.id}
    batch_view.action = 'list'
    assert batch_view.get_queryset().filter(student=student_user).exists()

    # Deactivate the users globally
    student_user.is_active = False
    student_user.save()
    teacher_user.is_active = False
    teacher_user.save()

    # Verify they are excluded from the viewsets querysets
    assert not student_view.get_queryset().filter(user=student_user).exists()
    assert not member_view.get_queryset().filter(user=student_user).exists()
    assert not member_view.get_queryset().filter(user=teacher_user).exists()
    assert not staff_view.get_queryset().filter(user=teacher_user).exists()
    assert not batch_view.get_queryset().filter(student=student_user).exists()


from unittest.mock import patch

@patch("lms_core.email_utils.send_html_email_via_ses")
def test_deactivation_notifications_and_emails(mock_send_email):
    org = Organization.objects.create(name='OrgNotify', contact_email='notify@o.com')
    student_role, _ = Role.objects.get_or_create(name='student')
    teacher_role, _ = Role.objects.get_or_create(name='teacher')
    org_admin_role, _ = Role.objects.get_or_create(name='org_admin')

    # Create students, teachers, and admins
    student_user = User.objects.create_user(email='notify_student@org.com', password=TEST_PASSWORD)
    teacher_user = User.objects.create_user(email='notify_teacher@org.com', password=TEST_PASSWORD)
    admin_user = User.objects.create_user(email='notify_admin@org.com', password=TEST_PASSWORD)

    OrganizationMember.objects.create(organization=org, user=student_user, role=student_role)
    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=admin_user, role=org_admin_role)

    # Deactivate the student
    student_user.is_active = False
    student_user.save()

    # Check that emails were sent (at least the student deactivation emails)
    assert mock_send_email.call_count >= 3


def test_anonymous_user_permission_denied():
    from django.contrib.auth.models import AnonymousUser
    from organizations.views import BatchViewSet
    factory = APIRequestFactory()
    
    view = BatchViewSet.as_view({'get': 'list'})
    
    get_req = factory.get('/')
    get_req.user = AnonymousUser()
    
    resp = view(get_req, org_pk=5)
    assert resp.status_code in [401, 403]


@patch("lms_core.email_utils.send_html_email_via_ses")
def test_deactivation_additional_roles(mock_send_email):
    org = Organization.objects.create(name='OrgNotify2', contact_email='notify2@o.com')
    teacher_role, _ = Role.objects.get_or_create(name='teacher')
    org_admin_role, _ = Role.objects.get_or_create(name='org_admin')

    # Create teachers and admins
    teacher_user = User.objects.create_user(email='t_notify@org.com', password=TEST_PASSWORD)
    admin_user = User.objects.create_user(email='a_notify@org.com', password=TEST_PASSWORD)
    admin_user2 = User.objects.create_user(email='a2_notify@org.com', password=TEST_PASSWORD)

    OrganizationMember.objects.create(organization=org, user=teacher_user, role=teacher_role)
    OrganizationMember.objects.create(organization=org, user=admin_user, role=org_admin_role)
    OrganizationMember.objects.create(organization=org, user=admin_user2, role=org_admin_role)

    # 1. Deactivate teacher
    teacher_user.is_active = False
    teacher_user.save()

    # 2. Deactivate org admin
    admin_user.is_active = False
    admin_user.save()

    # 3. Test exception handling by forcing mock_send_email to raise Exception
    mock_send_email.side_effect = Exception("email error")

    admin_user2.is_active = False
    admin_user2.save() # should not crash


@patch("lms_core.email_utils.send_html_email_via_ses")
def test_organization_student_create_api(mock_send_email):
    from rest_framework.test import force_authenticate
    factory = APIRequestFactory()
    user = User.objects.create_superuser(email='admin@org.com', password=TEST_PASSWORD)
    org = Organization.objects.create(name='OrgStudentCreate', contact_email='student@create.com')
    
    import datetime
    batch1 = Batch.objects.create(organization=org, name='Batch 1', start_date=datetime.date.today(), end_date=datetime.date.today())
    
    # Ensure role student exists
    _, _ = Role.objects.get_or_create(name='student')
    
    from organizations.views import OrganizationStudentViewSet
    view_func = OrganizationStudentViewSet.as_view({'post': 'create'})
    
    # Test case 1: Create student without batch
    data1 = {
        'email': 'student_nobatch@org.com',
        'first_name': 'NoBatch',
        'last_name': 'Student',
        'phone_number': '1234567890',
        'student_id': 'STU_NO_BATCH'
    }
    post_req1 = factory.post('/', data=data1, format='json')
    force_authenticate(post_req1, user=user)
    resp1 = view_func(post_req1, org_pk=org.id)
    assert resp1.status_code == 201
    assert resp1.data['email'] == 'student_nobatch@org.com'
    assert resp1.data['first_name'] == 'NoBatch'
    
    # Verify student exists in OrganizationMember and User
    created_user = User.objects.get(email='student_nobatch@org.com')
    assert OrganizationMember.objects.filter(organization=org, user=created_user, role__name='student').exists()
    assert not BatchStudent.objects.filter(student=created_user).exists()

    # Test case 2: Create student with batch
    data2 = {
        'email': 'student_withbatch@org.com',
        'first_name': 'WithBatch',
        'last_name': 'Student',
        'student_id': 'STU_WITH_BATCH',
        'batch_ids': [batch1.id]
    }
    post_req2 = factory.post('/', data=data2, format='json')
    force_authenticate(post_req2, user=user)
    resp2 = view_func(post_req2, org_pk=org.id)
    assert resp2.status_code == 201
    
    # Verify student exists in BatchStudent enrollment
    created_user2 = User.objects.get(email='student_withbatch@org.com')
    assert BatchStudent.objects.filter(batch=batch1, student=created_user2, student_id_number='STU_WITH_BATCH').exists()
    
    # Test case 3: Try to create a duplicate student in organization
    post_req3 = factory.post('/', data=data2, format='json')
    force_authenticate(post_req3, user=user)
    resp3 = view_func(post_req3, org_pk=org.id)
    assert resp3.status_code == 400
    assert 'email' in resp3.data