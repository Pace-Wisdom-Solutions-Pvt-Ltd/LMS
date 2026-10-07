# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import migrations
import uuid

def seed_existing_membership_uuids(apps, schema_editor):
    org_member_model = apps.get_model('organizations', 'OrganizationMember')
    
    seen_uuids = set()
    
    # 1. First pass: seed active memberships (is_deleted=False)
    # We sort by id so the first/oldest active membership of a user gets their User UUID.
    active_members = org_member_model.objects.filter(is_deleted=False).order_by('id')
    for member in active_members:
        if member.user_id and str(member.user_id) not in seen_uuids:
            member.uuid = member.user_id
            seen_uuids.add(str(member.user_id))
        else:
            member.uuid = uuid.uuid4()
            seen_uuids.add(str(member.uuid))
        member.save(update_fields=['uuid'])
        
    # 2. Second pass: seed soft-deleted/remaining memberships with a fresh random UUID
    remaining_members = org_member_model.objects.filter(uuid__isnull=True)
    for member in remaining_members:
        new_uuid = uuid.uuid4()
        while str(new_uuid) in seen_uuids:
            new_uuid = uuid.uuid4()
        member.uuid = new_uuid
        seen_uuids.add(str(new_uuid))
        member.save(update_fields=['uuid'])

class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0020_organizationmember_uuid'),
    ]

    operations = [
        migrations.RunPython(seed_existing_membership_uuids, reverse_code=migrations.RunPython.noop),
    ]
