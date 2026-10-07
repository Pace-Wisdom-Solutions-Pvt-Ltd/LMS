# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_add_invite_token_and_reinvite_fields"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE accounts_user "
                        "ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active' NOT NULL;"
                    ),
                    reverse_sql="ALTER TABLE accounts_user DROP COLUMN IF EXISTS status;",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="user",
                    name="status",
                    field=models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("reinvited", "Reinvited"),
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("expired", "Expired"),
                            ("deleted", "Deleted"),
                        ],
                        default="active",
                        max_length=20,
                        help_text="Current lifecycle status for the user account.",
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE accounts_invitetoken "
                        "ADD COLUMN IF NOT EXISTS is_used boolean DEFAULT false NOT NULL;"
                    ),
                    reverse_sql="ALTER TABLE accounts_invitetoken DROP COLUMN IF EXISTS is_used;",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="invitetoken",
                    name="is_used",
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
