# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

# Generated manually to deduplicate existing enrollments and enforce uniqueness.
from django.db import migrations, models


def dedupe_batch_students(apps, schema_editor):
    batch_student_model = apps.get_model("organizations", "BatchStudent")
    duplicates = (
        batch_student_model.objects.values("batch_id", "student_id")
        .annotate(total=models.Count("id"))
        .filter(total__gt=1)
    )
    for dup in duplicates:
        dup_qs = batch_student_model.objects.filter(
            batch_id=dup["batch_id"], student_id=dup["student_id"]
        ).order_by("enrolled_at", "pk")
        keeper = dup_qs.first()
        if keeper:
            dup_qs.exclude(pk=keeper.pk).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0009_batch_course"),
    ]

    operations = [
        migrations.RunPython(dedupe_batch_students, reverse_code=migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="batchstudent",
            constraint=models.UniqueConstraint(
                fields=["batch", "student"], name="unique_batch_student"
            ),
        ),
    ]
