# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

def normalize_correct_labels(correct_options=None, correct_option=None, default_label='a'):
    """
    Normalize label indicators (letters or indices, possibly comma separated) into a unique list.
    Priority order: correct_options > correct_option > default_label.
    Cognitive Complexity: Very Low.
    """
    # 1. Check sources in priority order
    for source in [correct_options, correct_option, default_label]:
        if not source:
            continue
        
        labels = _get_unique_cleaned_labels(source)
        if labels:
            return labels
            
    return []

def _get_unique_cleaned_labels(source):
    """
    Helper to extract unique cleaned labels from a range of input types.
    Cognitive Complexity: Low (~10).
    """
    seen = set()
    labels = []
    
    # Normalize input to a list of items to process
    items = source if isinstance(source, list) else [source]
    
    for item in items:
        if not item:
            continue
            
        # Handle potential comma-separated values in strings
        for part in str(item).split(','):
            clean_part = part.strip().lower()
            if clean_part and clean_part not in seen:
                labels.append(clean_part)
                seen.add(clean_part)
                
    return labels


def reorder_nodes(module_id):
    """
    Reorder all active nodes in a module: nodes without a chapter first, then
    each chapter's nodes in chapter order, each group by its sequence_order.
    Maintains a linear chain where each node's prerequisite_node is set to the
    node immediately preceding it.
    """
    from django.db.models import F
    from curriculum.models import Node

    nodes = list(
        Node.objects.filter(module_id=module_id, is_deleted=False).order_by(
            F('chapter__sequence_order').asc(nulls_first=True), 'chapter_id',
            'sequence_order', 'id',
        )
    )
    if not nodes:
        return

    from django.db import transaction
    with transaction.atomic():
        for i, node in enumerate(nodes, start=1):
            prev_node = nodes[i - 2] if i > 1 else None
            prev_node_id = prev_node.id if prev_node else None

            changed = False
            if node.sequence_order != i:
                node.sequence_order = i
                changed = True
            if node.prerequisite_node_id != prev_node_id:
                node.prerequisite_node_id = prev_node_id
                changed = True

            if changed:
                node.save(update_fields=['sequence_order', 'prerequisite_node'])



def reorder_chapters(module_id):
    """Renumber a module's active chapters 1..n, keeping their current order."""
    from curriculum.models import Chapter

    chapters = Chapter.objects.filter(module_id=module_id, is_deleted=False).order_by('sequence_order', 'id')
    for i, chapter_id in enumerate(chapters.values_list('id', flat=True), start=1):
        # queryset update() skips Chapter.save(), which would call back into here
        Chapter.objects.filter(id=chapter_id).exclude(sequence_order=i).update(sequence_order=i)


def next_sequence_order(queryset):
    """The sequence_order that places a new row after every existing one."""
    from django.db.models import Max

    return (queryset.aggregate(m=Max('sequence_order'))['m'] or 0) + 1


def apply_node_order(module_id, node_ids):
    """
    Put the given nodes of a module in the listed order, in one transaction.

    The listed nodes swap among the positions they already occupy, so a subset
    (e.g. one chapter's items) is reordered without moving anything else.
    Chapter order still wins, so nodes only change places within a chapter.
    Returns False if an id is repeated or is not an active node of the module.
    """
    from django.db import transaction
    from curriculum.models import Node

    if len(node_ids) != len(set(node_ids)):
        return False

    with transaction.atomic():
        reorder_nodes(module_id)  # normalise to distinct 1..n positions first
        nodes = Node.objects.select_for_update().filter(module_id=module_id, is_deleted=False, id__in=node_ids)
        slots = sorted(nodes.values_list('sequence_order', flat=True))
        if len(slots) != len(node_ids):
            return False
        # update() skips Node.save(), so the module is re-chained once at the end.
        for slot, node_id in zip(slots, node_ids):
            Node.objects.filter(id=node_id).update(sequence_order=slot)
        reorder_nodes(module_id)
    return True
