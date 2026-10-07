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
    Reorder all active nodes in a module based on their current sequence_order.
    Maintains a linear chain where each node's prerequisite_node is set to the
    node immediately preceding it in sequence_order.
    """
    from curriculum.models import Node

    nodes = list(Node.objects.filter(module_id=module_id, is_deleted=False).order_by('sequence_order', '-updated_at', 'id'))
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


