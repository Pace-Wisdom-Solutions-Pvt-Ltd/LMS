# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import os

def _get_org_slug_from_instance(instance):
    """Helper to find organization slug from various model instances."""
    # Paths to explore: sequences of attributes to traverse to find an 'organization'
    paths = [
        ('organization',),
        ('assessment', 'organization'),
        ('course', 'organization'),
        ('node', 'module', 'course', 'organization'),
        ('task', 'node', 'module', 'course', 'organization'),
    ]
    
    for path in paths:
        curr = instance
        for attr in path:
            curr = getattr(curr, attr, None)
            if curr is None:
                break
        else:
            # Successfully reached the end of a valid path to an organization
            slug = getattr(curr, 'slug', None)
            return slug if slug else str(curr.id)
            
    return "global"

def organization_directory_path(instance, filename):
    """
    Generates a dynamic upload path for organization-based file isolation.
    Path structure: orgs/{org_slug}/{app_label}/{model_name}/{filename}
    Shortened to fit within 100 characters safely.
    """
    org_slug = _get_org_slug_from_instance(instance)
    # Truncate organization slug to 20 chars max
    if len(org_slug) > 20:
        org_slug = org_slug[:20].rstrip('-')

    app_label = instance._meta.app_label
    # Shorten common app labels to keep paths short
    app_mapping = {
        'assessment_certification': 'assess',
        'curriculum': 'curr',
        'gamification': 'gami',
        'notifications': 'notif',
        'organizations': 'orgs',
    }
    short_app = app_mapping.get(app_label, app_label[:6])

    model_name = instance._meta.model_name
    # Shorten common model names
    model_mapping = {
        'certificatetemplate': 'tpl',
        'assessmenttask': 'task',
        'studentnodeprogress': 'prog',
        'organizationmember': 'mbr',
    }
    short_model = model_mapping.get(model_name, model_name[:4])

    # Truncate filename if too long
    name, ext = os.path.splitext(filename)
    if len(name) > 15:
        name = name[:15]
    short_filename = f"{name}{ext}"

    return f"orgs/{org_slug}/{short_app}/{short_model}/{short_filename}"
