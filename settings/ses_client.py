# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import os

import boto3
from botocore.config import Config
from lms_core.settings import get_secret


ses_client = boto3.client(
    "ses",
    region_name=get_secret("AWS_SES_REGION", default="ap-south-1"),
    aws_access_key_id=get_secret("AWS_SES_ACCESS_KEY_ID", default=None),
    aws_secret_access_key=get_secret("AWS_SES_SECRET_ACCESS_KEY", default=None),
    config=Config(
        connect_timeout=3,
        read_timeout=5,
        retries={"max_attempts": 1, "mode": "standard"},
    ),
)
