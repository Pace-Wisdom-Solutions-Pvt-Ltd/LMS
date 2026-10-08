# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, OrganizationMember
from rbac.models import Role
from curriculum.models import Course, Module, Chapter, Node


class ChapterAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="admin@example.com", password="password")
        self.org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="contact@example.com")
        self.course = Course.objects.create(organization=self.org, title="101 Course", status="Published")
        self.module = Module.objects.create(course=self.course, title="Step 1", sequence_order=1)

        admin_role, _ = Role.objects.get_or_create(name='org_admin')
        OrganizationMember.objects.create(organization=self.org, user=self.user, role=admin_role)
        self.client.force_authenticate(user=self.user)

    def _kwargs(self, **extra):
        return {'org_id': self.org.id, 'course_id': self.course.id, 'module_id': self.module.id, **extra}

    def _create_chapter(self, title):
        response = self.client.post(
            reverse('chapter-list-create', kwargs=self._kwargs()),
            {'title': title, 'description': 'desc'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data['id']

    def _create_item(self, title, chapter_id):
        response = self.client.post(
            reverse('node-create', kwargs=self._kwargs()),
            {
                'title': title,
                'chapter': chapter_id,
                'learning_material_content_type': 'Video',
                'learning_material_content_url': 'https://example.com/v',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data['id']

    def _module_order(self):
        """(title, chapter_id) for the module's nodes in sequence order."""
        return [
            (n.title, n.chapter_id)
            for n in Node.objects.filter(module=self.module).order_by('sequence_order')
        ]

    def test_create_and_list_chapters(self):
        first = self._create_chapter("test")
        second = self._create_chapter("testhjk")

        response = self.client.get(reverse('chapter-list-create', kwargs=self._kwargs()))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([c['id'] for c in response.data], [first, second])
        self.assertEqual([c['sequence_order'] for c in response.data], [1, 2])

    def test_items_stay_in_their_chapter_when_added_out_of_order(self):
        # The old prerequisite-based grouping scrambled exactly this sequence.
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        self._create_item("a1", ch1)
        self._create_item("b1", ch2)
        self._create_item("a2", ch1)

        self.assertEqual(self._module_order(), [("a1", ch1), ("a2", ch1), ("b1", ch2)])
        nodes = list(Node.objects.filter(module=self.module).order_by('sequence_order'))
        self.assertIsNone(nodes[0].prerequisite_node_id)
        self.assertEqual(nodes[1].prerequisite_node_id, nodes[0].id)
        self.assertEqual(nodes[2].prerequisite_node_id, nodes[1].id)

    def test_update_chapter(self):
        ch = self._create_chapter("test")
        response = self.client.patch(
            reverse('chapter-detail', kwargs=self._kwargs(chapter_id=ch)),
            {'title': "renamed", 'description': "nssnj"}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        chapter = Chapter.objects.get(id=ch)
        self.assertEqual((chapter.title, chapter.description), ("renamed", "nssnj"))

    def test_delete_chapter_removes_its_items(self):
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        self._create_item("a1", ch1)
        self._create_item("b1", ch2)

        response = self.client.delete(reverse('chapter-detail', kwargs=self._kwargs(chapter_id=ch1)))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Chapter.objects.filter(id=ch1).exists())
        self.assertEqual(self._module_order(), [("b1", ch2)])
        self.assertIsNone(Node.objects.get(title="b1").prerequisite_node_id)

    def test_move_item_to_another_chapter_appends_it(self):
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        a1 = self._create_item("a1", ch1)
        self._create_item("b1", ch2)

        response = self.client.patch(
            reverse('node-detail', kwargs=self._kwargs(node_id=a1)),
            {'chapter': ch2}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._module_order(), [("b1", ch2), ("a1", ch2)])

    def test_chapter_from_another_module_is_rejected(self):
        other_module = Module.objects.create(course=self.course, title="Step 2", sequence_order=2)
        foreign = Chapter.objects.create(module=other_module, title="other")
        response = self.client.post(
            reverse('node-create', kwargs=self._kwargs()),
            {'title': "x", 'chapter': foreign.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('chapter', response.data)

    def test_reorder_items_in_chapter(self):
        ch = self._create_chapter("test")
        a1 = self._create_item("a1", ch)
        a2 = self._create_item("a2", ch)
        a3 = self._create_item("a3", ch)
        url = reverse('chapter-node-reorder', kwargs=self._kwargs(chapter_id=ch))

        response = self.client.post(url, {'node_ids': [a3, a1, a2]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([t for t, _ in self._module_order()], ["a3", "a1", "a2"])

        response = self.client.post(url, {'node_ids': [a3, a1]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_moving_a_chapter_moves_its_items(self):
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        self._create_item("a1", ch1)
        self._create_item("b1", ch2)

        self.client.patch(
            reverse('chapter-detail', kwargs=self._kwargs(chapter_id=ch2)),
            {'sequence_order': 0}, format='json',
        )
        self.assertEqual(self._module_order(), [("b1", ch2), ("a1", ch1)])

    def test_students_cannot_edit_nodes(self):
        ch = self._create_chapter("test")
        node_id = self._create_item("a1", ch)
        student = User.objects.create_user(email="student@example.com", password="password")
        student_role, _ = Role.objects.get_or_create(name='student')
        OrganizationMember.objects.create(organization=self.org, user=student, role=student_role)
        self.client.force_authenticate(user=student)
        url = reverse('node-detail', kwargs=self._kwargs(node_id=node_id))

        self.assertEqual(self.client.patch(url, {'title': "hacked"}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(reverse('chapter-list-create', kwargs=self._kwargs()), {'title': "x"}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(Node.objects.get(id=node_id).title, "a1")

    def test_drag_down_lands_exactly_where_dropped(self):
        # Moving the first item below the third must give y, s, x, z (not x, y, s, z).
        ch = self._create_chapter("test")
        x = self._create_item("x", ch)
        y = self._create_item("y", ch)
        s = self._create_item("s", ch)
        z = self._create_item("z", ch)
        response = self.client.post(
            reverse('chapter-node-reorder', kwargs=self._kwargs(chapter_id=ch)),
            {'node_ids': [y, s, x, z]}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([n['title'] for n in response.data], ["y", "s", "x", "z"])
        self.assertEqual([t for t, _ in self._module_order()], ["y", "s", "x", "z"])

    def test_new_item_without_order_goes_to_end_of_its_chapter(self):
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        self._create_item("a1", ch1)
        self._create_item("b1", ch2)
        self._create_item("a2", ch1)
        self.assertEqual(self._module_order(), [("a1", ch1), ("a2", ch1), ("b1", ch2)])

    def test_module_reorder_full_list_keeps_chapter_grouping(self):
        ch1 = self._create_chapter("test")
        ch2 = self._create_chapter("testhjk")
        a1 = self._create_item("a1", ch1)
        a2 = self._create_item("a2", ch1)
        b1 = self._create_item("b1", ch2)
        b2 = self._create_item("b2", ch2)
        url = reverse('module-node-reorder', kwargs=self._kwargs())

        response = self.client.post(url, {'node_ids': [a2, a1, b2, b1]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([t for t, _ in self._module_order()], ["a2", "a1", "b2", "b1"])
        nodes = list(Node.objects.filter(module=self.module).order_by('sequence_order'))
        self.assertIsNone(nodes[0].prerequisite_node_id)
        for prev, node in zip(nodes, nodes[1:]):
            self.assertEqual(node.prerequisite_node_id, prev.id)

    def test_module_reorder_subset_only_moves_listed_nodes(self):
        # Items outside any chapter are reordered without touching chapter items.
        loose1 = self._create_item("loose1", None)
        loose2 = self._create_item("loose2", None)
        ch = self._create_chapter("test")
        self._create_item("a1", ch)
        response = self.client.post(
            reverse('module-node-reorder', kwargs=self._kwargs()),
            {'node_ids': [loose2, loose1]}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([t for t, _ in self._module_order()], ["loose2", "loose1", "a1"])

    def test_module_reorder_rejects_bad_ids(self):
        a1 = self._create_item("a1", None)
        other_module = Module.objects.create(course=self.course, title="Step 2", sequence_order=2)
        foreign = Node.objects.create(module=other_module, title="foreign")
        url = reverse('module-node-reorder', kwargs=self._kwargs())
        for payload in ({'node_ids': [a1, foreign.id]}, {'node_ids': [a1, a1]}, {'node_ids': []}, {}):
            self.assertEqual(self.client.post(url, payload, format='json').status_code, status.HTTP_400_BAD_REQUEST)
