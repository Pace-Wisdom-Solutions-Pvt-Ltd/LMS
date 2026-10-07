# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_ses_client():
    with patch("lms_core.email_utils.ses_client") as mock_client:
        mock_client.send_email.return_value = {"MessageId": "mock-message-id"}
        yield mock_client
