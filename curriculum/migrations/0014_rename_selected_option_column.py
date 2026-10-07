# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import migrations


class Migration(migrations.Migration):
    """
    Originally contained raw SQL to RENAME COLUMN selected_option → selected_option_id
    on curriculum_quizanswer. This was redundant — Django ORM already names FK columns
    with the _id suffix since migration 0009.
    Replaced with a no-op to avoid conflicts on fresh databases while keeping
    backward compatibility for servers that already recorded this migration.
    """

    dependencies = [
        ("curriculum", "0013_ensure_quizanswer_table"),
    ]

    operations = []
