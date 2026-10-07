# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import pytest
from unittest.mock import MagicMock
from lms_core.utils_storage import _get_org_slug_from_instance, organization_directory_path

class SimpleObject:
    pass

def test_get_org_slug_direct():
    instance = SimpleObject()
    instance.organization = SimpleObject()
    instance.organization.slug = "org-slug"
    assert _get_org_slug_from_instance(instance) == "org-slug"

def test_get_org_slug_direct_id():
    instance = SimpleObject()
    instance.organization = SimpleObject()
    instance.organization.slug = None
    instance.organization.id = 123
    assert _get_org_slug_from_instance(instance) == "123"

def test_get_org_slug_through_assessment():
    instance = SimpleObject()
    instance.assessment = SimpleObject()
    instance.assessment.organization = SimpleObject()
    instance.assessment.organization.slug = "assess-org"
    assert _get_org_slug_from_instance(instance) == "assess-org"

def test_get_org_slug_through_course():
    instance = SimpleObject()
    instance.course = SimpleObject()
    instance.course.organization = SimpleObject()
    instance.course.organization.slug = "course-org"
    assert _get_org_slug_from_instance(instance) == "course-org"

def test_get_org_slug_through_node():
    instance = SimpleObject()
    instance.node = SimpleObject()
    instance.node.module = SimpleObject()
    instance.node.module.course = SimpleObject()
    instance.node.module.course.organization = SimpleObject()
    instance.node.module.course.organization.slug = "node-org"
    assert _get_org_slug_from_instance(instance) == "node-org"

def test_get_org_slug_through_task():
    instance = SimpleObject()
    instance.task = SimpleObject()
    instance.task.node = SimpleObject()
    instance.task.node.module = SimpleObject()
    instance.task.node.module.course = SimpleObject()
    instance.task.node.module.course.organization = SimpleObject()
    instance.task.node.module.course.organization.slug = "task-org"
    assert _get_org_slug_from_instance(instance) == "task-org"

def test_get_org_slug_global():
    instance = SimpleObject()
    assert _get_org_slug_from_instance(instance) == "global"

def test_organization_directory_path():
    instance = MagicMock()
    instance.organization.slug = "my-org"
    instance._meta.app_label = "my_app"
    instance._meta.model_name = "my_model"
    
    path = organization_directory_path(instance, "test.txt")
    assert path == "orgs/my-org/my_app/my_m/test.txt"
