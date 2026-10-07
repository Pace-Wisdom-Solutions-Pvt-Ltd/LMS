# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization
from curriculum.models import Course, Module, Node, Quiz, QuizQuestion, QuizOption


class QuizTimerTests(APITestCase):
    """Tests for quiz timer_minutes and multiple quizzes (quizzes_input)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@test.com", password="password", is_superuser=True
        )
        self.org = Organization.objects.create(name="Org", slug="org")
        self.course = Course.objects.create(organization=self.org, title="Course")
        self.module = Module.objects.create(course=self.course, title="Module")
        self.client.force_authenticate(user=self.user)
        self.node_list_url = reverse(
            "node-create",
            kwargs={
                "org_id": self.org.id,
                "course_id": self.course.id,
                "module_id": self.module.id,
            },
        )

    # ── Model ────────────────────────────────────────────────────────────

    def test_quiz_timer_minutes_default_null(self):
        node = Node.objects.create(module=self.module, title="N")
        quiz = Quiz.objects.create(node=node, name="Q")
        self.assertIsNone(quiz.timer_minutes)

    def test_quiz_timer_minutes_set(self):
        node = Node.objects.create(module=self.module, title="N")
        quiz = Quiz.objects.create(node=node, name="Q", timer_minutes=30)
        self.assertEqual(quiz.timer_minutes, 30)

    # ── POST: flat fields with timer ─────────────────────────────────────

    def test_create_node_quiz_with_timer_flat_fields(self):
        data = {
            "title": "Node With Timer",
            "sequence_order": 1,
            "quiz_name": "Timed Quiz",
            "quiz_timer_minutes": 15,
            "quiz_question_text": "Q1?",
            "quiz_option_a": "A",
            "quiz_option_b": "B",
            "quiz_correct_option": "a",
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        quizzes = resp.data["quizzes"]
        self.assertEqual(len(quizzes), 1)
        self.assertEqual(quizzes[0]["name"], "Timed Quiz")
        self.assertEqual(quizzes[0]["timer_minutes"], 15)

    def test_create_node_quiz_without_timer(self):
        data = {
            "title": "Node No Timer",
            "sequence_order": 2,
            "quiz_name": "No Timer Quiz",
            "quiz_question_text": "Q?",
            "quiz_option_a": "A",
            "quiz_option_b": "B",
            "quiz_correct_option": "b",
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data["quizzes"][0]["timer_minutes"])

    # ── POST: quizzes_input with timer ───────────────────────────────────

    def test_create_node_multiple_quizzes_with_timer(self):
        data = {
            "title": "Multi Quiz Node",
            "sequence_order": 3,
            "quizzes_input": [
                {
                    "name": "Quiz A",
                    "timer_minutes": 10,
                    "questions": [
                        {
                            "question_text": "Q1?",
                            "option_a": "X",
                            "option_b": "Y",
                            "correct_option": "a",
                        }
                    ],
                },
                {
                    "name": "Quiz B",
                    "timer_minutes": 20,
                    "questions": [
                        {
                            "question_text": "Q2?",
                            "option_a": "M",
                            "option_b": "N",
                            "correct_option": "b",
                        }
                    ],
                },
            ],
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        quizzes = resp.data["quizzes"]
        self.assertEqual(len(quizzes), 2)
        self.assertEqual(quizzes[0]["name"], "Quiz A")
        self.assertEqual(quizzes[0]["timer_minutes"], 10)
        self.assertEqual(quizzes[1]["name"], "Quiz B")
        self.assertEqual(quizzes[1]["timer_minutes"], 20)

    def test_create_node_quizzes_input_without_timer(self):
        data = {
            "title": "Multi Quiz No Timer",
            "sequence_order": 4,
            "quizzes_input": [
                {
                    "name": "Quiz C",
                    "questions": [
                        {
                            "question_text": "Q?",
                            "option_a": "A",
                            "option_b": "B",
                            "correct_option": "a",
                        }
                    ],
                }
            ],
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data["quizzes"][0]["timer_minutes"])

    # ── POST: flat + quizzes_input together ──────────────────────────────

    def test_create_node_flat_and_quizzes_input_together(self):
        data = {
            "title": "Combined Node",
            "sequence_order": 5,
            "quiz_name": "Flat Quiz",
            "quiz_timer_minutes": 5,
            "quiz_question_text": "Flat Q?",
            "quiz_option_a": "A",
            "quiz_option_b": "B",
            "quiz_correct_option": "a",
            "quizzes_input": [
                {
                    "name": "Extra Quiz",
                    "timer_minutes": 25,
                    "questions": [
                        {
                            "question_text": "Extra Q?",
                            "option_a": "X",
                            "option_b": "Y",
                            "correct_option": "b",
                        }
                    ],
                }
            ],
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        quizzes = resp.data["quizzes"]
        self.assertEqual(len(quizzes), 2)
        self.assertEqual(quizzes[0]["timer_minutes"], 5)
        self.assertEqual(quizzes[1]["timer_minutes"], 25)

    # ── PUT: content update with timer ───────────────────────────────────

    def test_update_quiz_with_timer(self):
        node = Node.objects.create(module=self.module, title="Update Node")
        url = reverse(
            "node-content-update",
            kwargs={"org_id": self.org.id, "node_id": node.id},
        )
        data = {
            "content_type": "Quiz",
            "quiz_name": "Updated Quiz",
            "quiz_timer_minutes": 45,
            "quiz_question_text": "UQ?",
            "quiz_option_a": "A",
            "quiz_option_b": "B",
            "quiz_correct_option": "a",
        }
        resp = self.client.put(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        quiz = Quiz.objects.get(node=node, name="Updated Quiz")
        self.assertEqual(quiz.timer_minutes, 45)

    def test_update_quiz_quizzes_input_with_timer(self):
        node = Node.objects.create(module=self.module, title="Update Node 2")
        url = reverse(
            "node-content-update",
            kwargs={"org_id": self.org.id, "node_id": node.id},
        )
        data = {
            "content_type": "Quiz",
            "quizzes_input": [
                {
                    "name": "New Quiz",
                    "timer_minutes": 60,
                    "questions": [
                        {
                            "question_text": "NQ?",
                            "option_a": "A",
                            "option_b": "B",
                            "correct_option": "a",
                        }
                    ],
                }
            ],
        }
        resp = self.client.put(url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        quiz = Quiz.objects.get(node=node, name="New Quiz")
        self.assertEqual(quiz.timer_minutes, 60)

    # ── Response shape ───────────────────────────────────────────────────

    def test_timer_minutes_in_get_response(self):
        node = Node.objects.create(module=self.module, title="GET Node")
        Quiz.objects.create(node=node, name="Q", timer_minutes=10)
        url = reverse(
            "node-detail",
            kwargs={
                "org_id": self.org.id,
                "course_id": self.course.id,
                "module_id": self.module.id,
                "node_id": node.id,
            },
        )
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["quizzes"][0]["timer_minutes"], 10)

    # ── Multiple questions per quiz ──────────────────────────────────────

    def test_quizzes_input_multiple_questions(self):
        data = {
            "title": "Multi Q Node",
            "sequence_order": 6,
            "quizzes_input": [
                {
                    "name": "Big Quiz",
                    "timer_minutes": 30,
                    "questions": [
                        {
                            "question_text": "Q1?",
                            "option_a": "A",
                            "option_b": "B",
                            "correct_option": "a",
                        },
                        {
                            "question_text": "Q2?",
                            "option_a": "C",
                            "option_b": "D",
                            "option_c": "E",
                            "correct_option": "c",
                        },
                    ],
                }
            ],
        }
        resp = self.client.post(self.node_list_url, data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        quiz = resp.data["quizzes"][0]
        self.assertEqual(len(quiz["questions"]), 2)
        self.assertEqual(quiz["timer_minutes"], 30)
        # Verify correct option is set
        q2_options = quiz["questions"][1]["options"]
        correct_opts = [o for o in q2_options if o["is_correct"]]
        self.assertEqual(len(correct_opts), 1)
        self.assertEqual(correct_opts[0]["option_text"], "E")
