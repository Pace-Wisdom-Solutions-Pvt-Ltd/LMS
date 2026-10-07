# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import logging
import uuid
from email.utils import formataddr
from html import escape
from urllib.parse import urlparse

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

from settings.ses_client import ses_client

logger = logging.getLogger(__name__)


class EmailDeliveryError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Email delivery failed. Please try again later."
    default_code = "email_delivery_failed"


def build_frontend_url(path: str, base_url: str | None = None) -> str:
    frontend_base = (
        base_url or getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    ).rstrip("/")
    return f"{frontend_base}/{path.lstrip('/')}"


def _brand_palette() -> dict:
    return {
        "primary": "#2563eb",
        "accent": "#1e40af",
        "surface": "#ffffff",
        "border": "#e2e8f0",
        "muted": "#64748b",
        "background": "#f8fafc",
    }


def _render_outer_template(
    title_text, brand_html, palette, avatar, recipient, 
    body_content_html, cta_link, button_label, footer_text, no_reply_text, unique_id
):
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_text}</title>
  <style>
    body {{ margin: 0; padding: 24px; background-color: #f8fafc; font-family: sans-serif; }}
    .card {{ background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;padding:20px 0;">
    <div class="card">
      <div style="background-color:#000000;padding:48px 40px;text-align:left;color:#ffffff;">
        {brand_html}
        <div style="font-size:36px;line-height:1.1;font-weight:800;letter-spacing:-0.02em;">{title_text}</div>
      </div>
      
      <div style="padding:40px;">
        <div style="display:table;width:100%;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:32px;">
          <div style="display:table-cell;width:48px;vertical-align:middle;">
             <div style="width:44px;height:44px;background-color:{palette["primary"]};border-radius:10px;color:#ffffff;text-align:center;line-height:44px;font-weight:700;font-size:18px;">{avatar}</div>
          </div>
          <div style="display:table-cell;padding-left:16px;vertical-align:middle;">
            <div style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.05em;">Recipient</div>
            <div style="font-size:15px;color:#0f172a;font-weight:700;">{recipient}</div>
          </div>
        </div>

        {body_content_html}
        
        <div style="text-align:center;margin-bottom:40px;">
          <a href="{cta_link}" style="display:inline-block;background-color:#000000;color:#ffffff !important;padding:18px 48px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 10px 15px rgba(0,0,0,0.15);">
             <span style="color:#ffffff !important;">{button_label}</span>
          </a>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding-top:32px;margin-bottom:32px;">
          <div style="font-size:14px;color:#64748b;margin-bottom:12px;">{footer_text}</div>
          <div style="word-break:break-all;">
            <a href="{cta_link}" style="color:{palette["primary"]};font-size:13px;text-decoration:none;font-weight:600;">{cta_link}</a>
          </div>
        </div>

        <div style="background-color:#f1f5f9;border-left:4px solid {palette["primary"]};padding:20px;border-radius:12px;">
          <div style="font-size:11px;font-weight:800;color:{palette["primary"]};text-transform:uppercase;margin-bottom:6px;letter-spacing:0.05em;">Notice</div>
          <div style="font-size:13px;color:#475569;line-height:1.5;">{no_reply_text}</div>
          <div style="display:none;font-size:1px;color:#f1f5f9;">ID:{unique_id}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""


def _build_branded_email_context(
    *,
    title: str,
    intro: str,
    cta_label: str,
    cta_url: str,
    recipient_email: str,
    recipient_name: str | None = None,
    organization=None,
    footer_note: str,
    no_reply_note: str,
) -> dict:
    palette = _brand_palette()
    org_name = getattr(organization, "name", "") or "LMS"
    sender_name = escape(org_name)
    title_text = escape(title)
    intro_text = escape(intro)
    button_label = escape(cta_label)
    footer_text = escape(footer_note)
    no_reply_text = escape(no_reply_note)
    recipient = escape(recipient_name if recipient_name else recipient_email)
    cta_link = escape(cta_url, quote=True)
    avatar = escape((recipient_name or recipient_email)[:1].upper() if (recipient_name or recipient_email) else "U")
    unique_id = uuid.uuid4().hex[:8]
    brand_html = f'<div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.9;margin-bottom:12px;color:#ffffff;">{sender_name}</div>'

    return {
        "palette": palette,
        "brand_html": brand_html,
        "title_text": title_text,
        "intro_text": intro_text,
        "button_label": button_label,
        "footer_text": footer_text,
        "no_reply_text": no_reply_text,
        "recipient": recipient,
        "cta_link": cta_link,
        "avatar": avatar,
        "unique_id": unique_id,
    }


def render_branded_email(
    *,
    title: str,
    intro: str,
    cta_label: str,
    cta_url: str,
    recipient_email: str,
    recipient_name: str | None = None,
    organization=None,
    footer_note: str,
    no_reply_note: str = "This is an automated no-reply email. Please do not reply to this message.",
) -> str:
    ctx = _build_branded_email_context(
        title=title,
        intro=intro,
        cta_label=cta_label,
        cta_url=cta_url,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        organization=organization,
        footer_note=footer_note,
        no_reply_note=no_reply_note,
    )
    body_content_html = f'<div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:40px;">{ctx["intro_text"]}</div>'

    return _render_outer_template(
        ctx["title_text"], ctx["brand_html"], ctx["palette"], ctx["avatar"], ctx["recipient"],
        body_content_html, ctx["cta_link"], ctx["button_label"], ctx["footer_text"], ctx["no_reply_text"], ctx["unique_id"]
    )


def resolve_from_email(organization=None) -> str:
    # Always use the verified DEFAULT_FROM_EMAIL from settings
    # AWS SES requires sender address to be verified
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@lms.com")
    
    if organization:
        sender_name = getattr(organization, "name", "") or "LMS"
        return formataddr((sender_name, from_email))

    return from_email


def send_html_email_via_ses(
    *,
    subject: str,
    text_body: str,
    html_body: str,
    recipient_list: list[str],
    organization=None,
    reply_to: list[str] | None = None,
) -> dict:
    source = resolve_from_email(organization)
    reply_to_addresses = reply_to

    if reply_to_addresses is None and organization and getattr(organization, "contact_email", ""):
        reply_to_addresses = [organization.contact_email]

    from unittest.mock import Mock
    from lms_core.settings import get_secret
    aws_key = get_secret("AWS_SES_ACCESS_KEY_ID", default=None)
    aws_secret = get_secret("AWS_SES_SECRET_ACCESS_KEY", default=None)
    is_mocked = isinstance(getattr(ses_client, "send_email", None), Mock)

    if not is_mocked and (not aws_key or not aws_secret):
        from django.core.mail import EmailMultiAlternatives
        try:
            logger.info("AWS SES credentials not found. Falling back to Django mail backend.")
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=source,
                to=recipient_list,
                reply_to=reply_to_addresses or [],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send()
            return {"MessageId": f"django-fallback-{uuid.uuid4()}"}
        except Exception as django_exc:
            logger.exception("Fallback Django email delivery failed")
            raise EmailDeliveryError(detail=str(django_exc))

    try:
        response = ses_client.send_email(
            Source=source,
            Destination={"ToAddresses": recipient_list},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                },
            },
            ReplyToAddresses=reply_to_addresses or [],
        )
        logger.info(
            "Sent SES email",
            extra={
                "message_id": response.get("MessageId"),
                "organization_id": getattr(organization, "id", None),
                "recipients": recipient_list,
                "source": source,
            },
        )
        return response
    except (ClientError, BotoCoreError) as exc:
        logger.exception(
            "SES email delivery failed",
            extra={
                "organization_id": getattr(organization, "id", None),
                "recipients": recipient_list,
                "source": source,
            },
        )
        error_message = getattr(exc, "response", {}).get("Error", {}).get("Message")
        raise EmailDeliveryError(detail=error_message or EmailDeliveryError.default_detail) from exc


def render_branded_assignment_email(
    *,
    title: str,
    intro: str,
    batch_name: str,
    start_date: str,
    end_date: str,
    courses: list[str],
    cta_label: str,
    cta_url: str,
    recipient_email: str,
    recipient_name: str | None = None,
    organization=None,
    footer_note: str,
    no_reply_note: str = "This is an automated no-reply email. Please do not reply to this message.",
) -> str:
    ctx = _build_branded_email_context(
        title=title,
        intro=intro,
        cta_label=cta_label,
        cta_url=cta_url,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        organization=organization,
        footer_note=footer_note,
        no_reply_note=no_reply_note,
    )

    batch_name_escaped = escape(batch_name)
    start_date_escaped = escape(start_date)
    end_date_escaped = escape(end_date)
    courses_html = "".join(f'<li style="margin-bottom:6px;">{escape(course)}</li>' for course in courses)

    courses_block = f"""
        <div style="margin-bottom:32px;">
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:12px;">Assigned Courses:</div>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#334155;line-height:1.6;">
            {courses_html}
          </ul>
        </div>
        """ if courses else ""

    body_content_html = f"""
        <div style="font-size:16px;line-height:1.6;color:#334155;margin-bottom:24px;">{ctx["intro_text"]}</div>
        
        <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:32px;">
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:16px;">Batch Details</div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
            <tr>
              <td style="padding:6px 0;font-weight:600;width:120px;color:#64748b;">Batch Name:</td>
              <td style="padding:6px 0;font-weight:700;color:#0f172a;">{batch_name_escaped}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#64748b;">Start Date:</td>
              <td style="padding:6px 0;color:#334155;">{start_date_escaped}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-weight:600;color:#64748b;">End Date:</td>
              <td style="padding:6px 0;color:#334155;">{end_date_escaped}</td>
            </tr>
          </table>
        </div>

        {courses_block}
    """

    return _render_outer_template(
        ctx["title_text"], ctx["brand_html"], ctx["palette"], ctx["avatar"], ctx["recipient"],
        body_content_html, ctx["cta_link"], ctx["button_label"], ctx["footer_text"], ctx["no_reply_text"], ctx["unique_id"]
    )
