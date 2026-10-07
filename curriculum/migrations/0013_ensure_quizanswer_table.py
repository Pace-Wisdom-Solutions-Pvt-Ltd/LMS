# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import migrations


class Migration(migrations.Migration):
    """
    Originally contained raw SQL to CREATE TABLE IF NOT EXISTS curriculum_quizanswer.
    This was redundant — the table is already created by migration 0009 via Django ORM.
    Replaced with a no-op to avoid conflicts on fresh databases while keeping
    backward compatibility for servers that already recorded this migration.
    """

    dependencies = [
        ("curriculum", "0012_tasksubmission_submission_file_and_more"),
    ]

    operations = []
