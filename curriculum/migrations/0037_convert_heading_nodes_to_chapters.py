# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

"""
Chapters used to be stored as empty Nodes (no material, task, quiz or
assessment) that the course builder treated as card headings. Turn each one
into a Chapter, assign the content nodes that follow it to that chapter, and
re-chain prerequisites in the new (chapter, sequence) order.
"""

from django.db import migrations
from django.db.models import F
from django.utils import timezone


def _has_content(apps, node):
    for model_name in ('LearningMaterial', 'Task', 'Assessment', 'Quiz'):
        if apps.get_model('curriculum', model_name).objects.filter(node=node).exists():
            return True
    return False


def forwards(apps, schema_editor):
    module_model = apps.get_model('curriculum', 'Module')
    chapter_model = apps.get_model('curriculum', 'Chapter')
    node_model = apps.get_model('curriculum', 'Node')

    for module in module_model.objects.all():
        nodes = node_model.objects.filter(module=module, is_deleted=False).order_by('sequence_order', 'id')
        current_chapter = None
        chapter_order = 0
        for node in nodes:
            if not _has_content(apps, node):
                chapter_order += 1
                current_chapter = chapter_model.objects.create(
                    module=module,
                    title=node.title,
                    description=node.description,
                    sequence_order=chapter_order,
                )
                node.is_deleted = True
                node.deleted_at = timezone.now()
                node.save(update_fields=['is_deleted', 'deleted_at'])
            elif current_chapter is not None:
                node.chapter = current_chapter
                node.save(update_fields=['chapter'])

        # Same ordering as curriculum.utils.reorder_nodes.
        remaining = node_model.objects.filter(module=module, is_deleted=False).order_by(
            F('chapter__sequence_order').asc(nulls_first=True), 'chapter_id', 'sequence_order', 'id',
        )
        prev_id = None
        for i, node in enumerate(remaining, start=1):
            node.sequence_order = i
            node.prerequisite_node_id = prev_id
            node.save(update_fields=['sequence_order', 'prerequisite_node'])
            prev_id = node.id


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0036_chapter'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
