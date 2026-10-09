# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db.models import Q
from curriculum.models import Node, Task, TaskSubmission, StudentNodeProgress
from gamification.models import Certificate, CertificateTemplate


def is_course_completed_for_student(user, course):
    """
    Evaluates whether a student has completed a course.
    Requirements:
    1. The course must contain completable nodes (nodes with learning material, task, assessment, or quiz).
    2. Every Task in the course must have an Approved or Graded submission by this student.
    3. Every interactive node in the course must have a StudentNodeProgress record with status='Completed'.
    """
    # Nodes with actual interactive content
    nodes_with_content = Node.objects.filter(
        module__course=course,
        module__is_deleted=False,
        is_deleted=False
    ).filter(
        Q(learning_material__isnull=False) |
        Q(task__isnull=False) |
        Q(assessment__isnull=False) |
        Q(quizzes__isnull=False)
    ).distinct()

    total_nodes_count = nodes_with_content.count()
    if total_nodes_count == 0:
        return False, "Course has no completable modules or nodes."

    # Verify all tasks have approved or graded submissions
    tasks = Task.objects.filter(node__in=nodes_with_content, is_deleted=False)
    for task in tasks:
        submission = TaskSubmission.objects.filter(
            Q(student__user=user) | Q(student=user),
            task=task,
            is_deleted=False
        ).order_by('-submitted_at').first()

        if not submission:
            return False, f"Task '{task.title}' has not been submitted."
        if submission.status not in ['Approved', 'Graded']:
            return False, f"Task '{task.title}' is pending trainer review."

    # Check student node progress records
    completed_nodes_count = StudentNodeProgress.objects.filter(
        Q(student__user=user) | Q(student=user),
        node__in=nodes_with_content,
        status='Completed',
        is_deleted=False
    ).values('node_id').distinct().count()

    if completed_nodes_count < total_nodes_count:
        remaining = total_nodes_count - completed_nodes_count
        return False, f"{remaining} item(s) remaining to complete in this course."

    return True, "Course is fully completed."


def get_or_create_course_certificate(user, course, organization=None):
    """
    Retrieves or generates a certificate for the student upon course completion.
    Returns (certificate, created, message/reason).
    """
    if organization is None:
        organization = course.organization

    # Check if certificate already exists
    existing = Certificate.objects.filter(
        student=user,
        course=course,
        is_deleted=False
    ).first()
    if existing:
        return existing, False, None

    # Check eligibility
    is_completed, reason = is_course_completed_for_student(user, course)
    if not is_completed:
        return None, False, reason

    # Find default template for organization if available
    template = CertificateTemplate.objects.filter(
        Q(organization=organization) | Q(organization__isnull=True),
        is_deleted=False,
        is_default=True
    ).order_by('-organization_id').first()

    cert_code = Certificate.generate_certificate_code(course.id, user.id)
    certificate, created = Certificate.objects.get_or_create(
        student=user,
        course=course,
        organization=organization,
        is_deleted=False,
        defaults={
            'certificate_id': cert_code,
            'template': template,
            'certificate_type': 'Course'
        }
    )
    return certificate, created, None


PNG_MIME_TYPE = 'image/png'


def _process_image_to_data_uri(raw_bytes, mime_type=PNG_MIME_TYPE):
    """
    Safely scales down large logos to certificate dimensions (max 360x70)
    to prevent xhtml2pdf from blowing up unconstrained images and keep PDF size small.
    """
    import base64
    from io import BytesIO
    from PIL import Image

    try:
        im = Image.open(BytesIO(raw_bytes))
        max_w, max_h = 360, 70
        if im.width > max_w or im.height > max_h:
            im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            out_buf = BytesIO()
            im.save(out_buf, format='PNG')
            raw_bytes = out_buf.getvalue()
            mime_type = PNG_MIME_TYPE
    except Exception:
        pass

    b64 = base64.b64encode(raw_bytes).decode('utf-8')
    return f"data:{mime_type};base64,{b64}"


def get_organization_logo_data_uri(organization):
    """
    Returns a data URI (base64) for the organization's logo or default LMS logo.
    Works seamlessly in both browser HTML preview and xhtml2pdf PDF generation without external requests.
    """
    import os
    from django.conf import settings

    if organization and organization.logo:
        try:
            with organization.logo.open('rb') as f:
                content = f.read()
                mime = PNG_MIME_TYPE
                name_lower = organization.logo.name.lower()
                if name_lower.endswith(('.jpg', '.jpeg')):
                    mime = 'image/jpeg'
                elif name_lower.endswith('.webp'):
                    mime = 'image/webp'
                elif name_lower.endswith('.svg'):
                    import base64
                    b64 = base64.b64encode(content).decode('utf-8')
                    return f"data:image/svg+xml;base64,{b64}"
                return _process_image_to_data_uri(content, mime)
        except Exception:
            pass

    # Default fallback logo
    default_logo_path = os.path.join(settings.BASE_DIR, "gamification", "static", "gamification", "default_logo.png")
    if os.path.exists(default_logo_path):
        try:
            with open(default_logo_path, "rb") as f:
                return _process_image_to_data_uri(f.read(), PNG_MIME_TYPE)
        except Exception:
            pass

    return ""


def format_certificate_date(date_obj):
    """
    Formats datetime/date as '8 October 2026'.
    """
    if not date_obj:
        return ""
    return f"{date_obj.day} {date_obj.strftime('%B %Y')}"


def render_certificate_html(certificate, request=None, is_pdf=False):
    """
    Renders the unified backend HTML template for a certificate.
    """
    from django.template.loader import render_to_string

    student_name = certificate.student.get_full_name()
    course_title = certificate.course.title if certificate.course else ""
    org_name = certificate.organization.name.upper() if certificate.organization else "WISDOM PACE"
    formatted_date = format_certificate_date(certificate.issued_at)
    logo_data_uri = get_organization_logo_data_uri(certificate.organization)

    context = {
        "certificate": certificate,
        "certificate_id": certificate.certificate_id,
        "student_name": student_name,
        "course_title": course_title,
        "organization_name": org_name,
        "formatted_date": formatted_date,
        "logo_data_uri": logo_data_uri,
        "template": certificate.template,
        "is_pdf": is_pdf,
    }
    return render_to_string("certificates/certificate_template.html", context, request=request)


def generate_certificate_pdf(certificate, request=None):
    """
    Generates an A4 landscape PDF from the unified backend HTML template.
    Returns bytes of the generated PDF.
    """
    from io import BytesIO
    from xhtml2pdf import pisa

    html_content = render_certificate_html(certificate, request=request, is_pdf=True)
    pdf_buffer = BytesIO()
    status = pisa.CreatePDF(html_content, dest=pdf_buffer)
    if status.err:
        raise RuntimeError(f"Failed to generate certificate PDF for {certificate.certificate_id}: status {status.err}")
    return pdf_buffer.getvalue()
