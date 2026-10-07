# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from unittest.mock import patch

import pytest
from botocore.exceptions import ClientError

from lms_core.email_utils import (
    EmailDeliveryError,
    render_branded_email,
    resolve_from_email,
    send_html_email_via_ses,
)
from organizations.models import Organization


@pytest.mark.django_db
def test_resolve_from_email_uses_default_sender():
    """Always use DEFAULT_FROM_EMAIL; org name is display name only."""
    from django.conf import settings
    org = Organization(name="PaceWisdom", contact_email="contact@pacewisdom.com")

    expected = f"PaceWisdom <{settings.DEFAULT_FROM_EMAIL}>"
    assert resolve_from_email(org) == expected


@pytest.mark.django_db
def test_render_branded_email_includes_org_name():
    org = Organization(
        name="PaceWisdom",
        contact_email="contact@pacewisdom.com",
    )

    html = render_branded_email(
        title="Welcome",
        intro="Custom intro",
        cta_label="Accept",
        cta_url="https://example.com/invite",
        recipient_email="user@example.com",
        organization=org,
        footer_note="Footer text",
    )

    assert "PaceWisdom" in html
    assert "Accept" in html
    assert "https://example.com/invite" in html


@pytest.mark.django_db
@patch("lms_core.email_utils.ses_client.send_email")
def test_send_html_email_via_ses_builds_expected_payload(mock_send_email):
    from django.conf import settings
    mock_send_email.return_value = {"MessageId": "ses-123"}
    org = Organization(name="PaceWisdom", contact_email="contact@pacewisdom.com")

    response = send_html_email_via_ses(
        subject="Subject",
        text_body="Text body",
        html_body="<p>HTML body</p>",
        recipient_list=["user@example.com"],
        organization=org,
    )

    assert response["MessageId"] == "ses-123"
    mock_send_email.assert_called_once_with(
        Source=f"PaceWisdom <{settings.DEFAULT_FROM_EMAIL}>",
        Destination={"ToAddresses": ["user@example.com"]},
        Message={
            "Subject": {"Data": "Subject", "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": "Text body", "Charset": "UTF-8"},
                "Html": {"Data": "<p>HTML body</p>", "Charset": "UTF-8"},
            },
        },
        ReplyToAddresses=["contact@pacewisdom.com"],
    )


@patch("lms_core.email_utils.ses_client.send_email")
def test_send_html_email_via_ses_raises_api_exception_on_client_error(mock_send_email):
    mock_send_email.side_effect = ClientError(
        error_response={"Error": {"Code": "MessageRejected", "Message": "Rejected"}},
        operation_name="SendEmail",
    )

    with pytest.raises(EmailDeliveryError) as exc_info:
        send_html_email_via_ses(
            subject="Subject",
            text_body="Text body",
            html_body="<p>HTML body</p>",
            recipient_list=["user@example.com"],
        )

    assert "Rejected" in str(exc_info.value.detail)
