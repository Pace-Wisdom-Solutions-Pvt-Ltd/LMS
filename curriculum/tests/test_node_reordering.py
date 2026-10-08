# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.test import TestCase
from organizations.models import Organization
from curriculum.models import Course, Module, Node
from curriculum.utils import apply_node_order

class NodeReorderingTestCase(TestCase):
    def setUp(self):
        # Create common fixtures
        self.org = Organization.objects.create(name="Test Org", slug="test-org", contact_email="contact@example.com")
        self.course = Course.objects.create(organization=self.org, title="101 Course", status="Published")
        self.module = Module.objects.create(course=self.course, title="Module 1", sequence_order=1)

    def test_initial_reordering_on_creation(self):
        # Create Nodes. The utility should automatically assign sequence orders sequentially (1, 2, 3, 4)
        # and set prerequisites to the immediately preceding node.
        node_a = Node.objects.create(module=self.module, title="Node A", sequence_order=1)
        node_b = Node.objects.create(module=self.module, title="Node B", sequence_order=2)
        node_c = Node.objects.create(module=self.module, title="Node C", sequence_order=9)
        node_d = Node.objects.create(module=self.module, title="Node D", sequence_order=10)

        # Refresh all from DB
        node_a.refresh_from_db()
        node_b.refresh_from_db()
        node_c.refresh_from_db()
        node_d.refresh_from_db()

        # Check sequence orders (should be normalized to 1, 2, 3, 4)
        self.assertEqual(node_a.sequence_order, 1)
        self.assertEqual(node_b.sequence_order, 2)
        self.assertEqual(node_c.sequence_order, 3)
        self.assertEqual(node_d.sequence_order, 4)

        # Check prerequisites (should be sequential)
        self.assertIsNone(node_a.prerequisite_node)
        self.assertEqual(node_b.prerequisite_node, node_a)
        self.assertEqual(node_c.prerequisite_node, node_b)
        self.assertEqual(node_d.prerequisite_node, node_c)

        # Create new node Node E with sequence_order 18 (placed at the end)
        node_e = Node.objects.create(module=self.module, title="Node E Quiz", sequence_order=18)

        # Refresh all
        node_a.refresh_from_db()
        node_b.refresh_from_db()
        node_c.refresh_from_db()
        node_d.refresh_from_db()
        node_e.refresh_from_db()

        self.assertEqual(node_a.sequence_order, 1)
        self.assertEqual(node_b.sequence_order, 2)
        self.assertEqual(node_c.sequence_order, 3)
        self.assertEqual(node_d.sequence_order, 4)
        self.assertEqual(node_e.sequence_order, 5)

        self.assertIsNone(node_a.prerequisite_node)
        self.assertEqual(node_b.prerequisite_node, node_a)
        self.assertEqual(node_c.prerequisite_node, node_b)
        self.assertEqual(node_d.prerequisite_node, node_c)
        self.assertEqual(node_e.prerequisite_node, node_d)

    def test_reordering_on_manual_drag(self):
        # Create Nodes A, B, C, D
        node_a = Node.objects.create(module=self.module, title="Node A", sequence_order=1)
        node_b = Node.objects.create(module=self.module, title="Node B", sequence_order=2)
        node_c = Node.objects.create(module=self.module, title="Node C", sequence_order=3)
        node_d = Node.objects.create(module=self.module, title="Node D", sequence_order=4)

        # Drag Node D to position 2 (after Node A, before Node B). The frontend
        # sends the whole new order in one atomic request; prerequisites follow:
        # Node A (prereq: None), Node D (prereq: A), Node B (prereq: D), Node C (prereq: B)
        self.assertTrue(apply_node_order(self.module.id, [node_a.id, node_d.id, node_b.id, node_c.id]))

        # Refresh all
        node_a.refresh_from_db()
        node_b.refresh_from_db()
        node_c.refresh_from_db()
        node_d.refresh_from_db()

        self.assertEqual(node_a.sequence_order, 1)
        self.assertEqual(node_d.sequence_order, 2)
        self.assertEqual(node_b.sequence_order, 3)
        self.assertEqual(node_c.sequence_order, 4)

        self.assertIsNone(node_a.prerequisite_node)
        self.assertEqual(node_d.prerequisite_node, node_a)
        self.assertEqual(node_b.prerequisite_node, node_d)
        self.assertEqual(node_c.prerequisite_node, node_b)

    def test_equal_sequence_orders_tie_break_by_id(self):
        # Ordering is deterministic: when two nodes claim the same position the
        # older (lower id) one comes first, regardless of which was saved last.
        node_a = Node.objects.create(module=self.module, title="Node A", sequence_order=1)
        node_b = Node.objects.create(module=self.module, title="Node B", sequence_order=2)
        node_b.sequence_order = 1
        node_b.save()
        node_a.save()

        node_a.refresh_from_db()
        node_b.refresh_from_db()
        self.assertEqual((node_a.sequence_order, node_b.sequence_order), (1, 2))
        self.assertEqual(node_b.prerequisite_node, node_a)

    def test_reordering_on_soft_delete(self):
        node_a = Node.objects.create(module=self.module, title="Node A", sequence_order=1)
        node_b = Node.objects.create(module=self.module, title="Node B", sequence_order=2)
        node_c = Node.objects.create(module=self.module, title="Node C", sequence_order=3)

        # Soft delete Node B
        node_b.delete()

        # Refresh
        node_a.refresh_from_db()
        node_c.refresh_from_db()

        # Node B is soft deleted. Node C should shift up to sequence_order 2
        # and its prerequisite should automatically update to Node A.
        self.assertEqual(node_a.sequence_order, 1)
        self.assertEqual(node_c.sequence_order, 2)

        self.assertIsNone(node_a.prerequisite_node)
        self.assertEqual(node_c.prerequisite_node, node_a)
