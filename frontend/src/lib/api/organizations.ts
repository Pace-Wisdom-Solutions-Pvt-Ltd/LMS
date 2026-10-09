// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import {
  apiGet,
  apiGetBlob,
  apiPost,
  apiPostFormData,
  apiPatchFormData,
  apiPut,
  apiPatch,
  apiDelete,
} from "./client";
import config from "@/config";
import type { ApiCertificate } from "./certificates";

const ep = config.api.endpoints.organizations;

/* ── Organization Types ── */

export interface ApiOrganization {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  contact_phone?: string;
  logo: string | null;
  is_active: boolean;
  org_admin_email: string;
  code?: string;
  industry?: string;
  location?: string;
  created_at?: string;
  primary_color?: string;
  accent_color?: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug?: string;
  contact_email: string;
  contact_phone?: string;
  logo?: File | string;
  is_active?: boolean;
  org_admin_email: string;
  code?: string;
  industry?: string;
  location?: string;
  custom_subdomain?: string;
  primary_color?: string;
  accent_color?: string;
}

/* ── Batch (Branch) Types ── */

export interface ApiBatch {
  id: string | number;
  organization?: number;
  name: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  is_org_level?: boolean;
  created_at?: string;
  courses?: number[];
  courses_detail?: Array<{ id: number; title: string }>;
}

export interface CreateBatchPayload {
  name: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  is_org_level?: boolean;
  courses?: number[];
}

/* ── Course Types ── */

export interface ApiCourse {
  id: number;
  organization?: number;
  title: string;
  description?: string;
  thumbnail?: string | null;
  status?: "Draft" | "Published" | "Archived";
  created_at?: string;
}

export interface ApiLearnerProgress {
  learner_name: string;
  course_title: string;
  completion_percentage: number;
  modules_progress: string;
  last_activity: string | null;
  pending_tasks_count: number;
  student_id: string;
  course_id: number;
}

export interface ApiTeacherDashboard {
  student_count: number;
  batch_count: number;
  course_count: number;
  pending_evaluations_count: number;
  average_completion_percentage: number;
  recent_submissions: unknown[]; // only the count is consumed today
}

export interface CreateCoursePayload {
  title: string;
  description?: string;
  status?: "Draft" | "Published" | "Archived";
  teachers?: string[];
  batches?: number[];
  thumbnail?: File | null;
}

/* ── Course Module (Level) Types ── */

export interface ApiCourseModule {
  id: number;
  title: string;
  description?: string | null;
  sequence_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCourseModulePayload {
  title: string;
  description?: string;
  sequence_order?: number;
}

export interface UpdateCourseModulePayload {
  title?: string;
  description?: string;
  sequence_order?: number;
}

/* ── Chapter Types ── */

/** A card inside a module (level) that groups curriculum items. */
export interface ApiChapter {
  id: number;
  module?: number;
  title: string;
  description?: string | null;
  sequence_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChapterPayload {
  title?: string;
  description?: string;
  sequence_order?: number;
}

/* ── Module Node (Phase) Types ── */

export interface ApiModuleNode {
  id: number;
  title: string;
  description?: string | null;
  sequence_order?: number;
  /** Chapter (card) this item belongs to; null for items outside any chapter. */
  chapter?: number | null;
  prerequisite_node?: number | null;
  // Learning material (API may return either `content_*` or `learning_material_*`)
  content_type?: string | null;
  content_url?: string | null;
  content_file?: string | null;
  content_text?: string | null;
  learning_material_content_type?: string | null;
  learning_material_content_url?: string | null;
  learning_material_content_file?: string | null;
  learning_material_content_text?: string | null;
  // Nested learning_material object (returned by detail endpoint)
  learning_material?: {
    content_type?: string | null;
    content_url?: string | null;
    content_file?: string | null;
    content_text?: string | null;
    focus_areas?: string | null;
    quick_outline?: string | null;
  } | null;
  // Optional extra fields returned by API
  focus_areas?: string | null;
  quick_outline?: string | null;
  task_title?: string | null;
  task_allow_link?: boolean | null;
  task_allow_paragraph?: boolean | null;
  task_allow_pdf?: boolean | null;
  task_allow_screenshot?: boolean | null;
  task_allow_code_block?: boolean | null;
  task_allow_file?: boolean | null;
  quiz_name?: string | null;
  questions_input?: unknown;
  created_at?: string;
  updated_at?: string;
}

/** Full multipart payload for POST .../modules/{id}/nodes/ (phases + curriculum items). */
export interface CreateModuleNodePayload {
  title: string;
  description?: string;
  sequence_order?: number;
  chapter?: number;
  prerequisite_node?: number;
  drip_delay_days?: number;
  focus_areas?: string;
  quick_outline?: string;
  learning_material_content_type?: string;
  learning_material_content_url?: string;
  learning_material_content_file?: File | Blob;
  learning_material_content_text?: string;
  task_title?: string;
  task_description?: string;
  task_attachment?: File | Blob | null;
  task_allow_link?: boolean;
  task_allow_paragraph?: boolean;
  task_allow_pdf?: boolean;
  task_allow_screenshot?: boolean;
  task_allow_code_block?: boolean;
  task_allow_file?: boolean;
  quiz_name?: string;
  quiz_timer_minutes?: number;
  quiz_allow_multiple_correct?: boolean;
  quiz_question_text?: string;
  quiz_option_a?: string;
  quiz_option_b?: string;
  quiz_option_c?: string;
  quiz_option_d?: string;
  /** Repeat same field name for array (Django/FastAPI style). */
  quiz_extra_options?: string[];
  quiz_correct_option?: string;
  /** JSON string: array of question objects for bulk quiz create. */
  questions_input?: string;
}

/* ── Member Types ── */

export interface ApiRoleDetail {
  id?: number;
  name: string;
  title?: string; // legacy API may return title
}

export interface ApiMember {
  id: number;
  organization: number;
  joined_at: string;
  is_active: boolean;
  user_detail: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
  role_detail: ApiRoleDetail;
}

export interface CreateMemberPayload {
  user_email: string;
  role_name: string;
  is_active?: boolean;
}

export interface UpdateMemberPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

/* ── Staff Types ── */

export interface ApiStaff {
  id: number;
  batches?: number[];
  batch_detail?: Array<{ id: number; name: string }>;
  assigned_courses?: number[] | null;
  assigned_courses_detail?: Array<{ id: number; title: string }> | null;
  phone_number?: string | null;
  user_detail: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    is_active: boolean;
    status?: string;
  };
  role_detail: ApiRoleDetail;
  /** A staff member may hold more than one role (e.g. org_admin + manager). */
  roles_detail?: ApiRoleDetail[];
  joined_at: string;
  is_active: boolean;
}

export interface CreateStaffPayload {
  user_email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role_name: string;
  batches?: number[];
  assigned_courses?: number[];
  is_active?: boolean;
}

export interface UpdateStaffPayload {
  user_email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active?: boolean;
  role_name?: string;
  batches?: number[];
  assigned_courses?: number[] | null;
}

/* ── Node Submission & Task Types ── */

export type TaskSubmissionStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Graded"
  | "Needs Manual Review";

export interface ApiTaskSubmission {
  id: number;
  task: number;
  student: string;
  payload: string | null;
  submission_file: string | null;
  status: TaskSubmissionStatus;
  feedback: string;
  awarded_score: number | null;
  submitted_at: string;
  graded_at: string | null;
}

export interface SubmitTaskPayload {
  payload?: string | null;
  submission_file?: File | null;
}

/* ── Student Types ── */

export interface ApiStudentDetail {
  id: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  student_id?: string | null;
  status?: string;
}

export interface ApiStudent {
  id: string | number;
  batch?: number;
  batch_ids?: number[];
  student?: string;
  user?: string;
  enrolled_at?: string;
  is_active?: boolean;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  student_id?: string | null;
  status?: string;
  joined_at?: string;
  batch_detail?: Array<{ id: number; name: string }>;
  course?: number | null;
  course_detail?: { id: number; title: string } | string | null;
  student_detail?: ApiStudentDetail;
  reporting_to?: string | null;
  reporting_to_detail?: ApiReportingManager | null;
}

export interface ApiReportingManager {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
}

export interface ApiEnrolledCourse {
  id: number;
  organization: number;
  title: string;
  description?: string;
  thumbnail?: string | null;
  status?: string;
  teachers_detail?: ApiTrainerListUser[];
  completion_percentage: string; // e.g. "45.50"
  created_at: string;
  updated_at: string;
}

export interface ApiRoadmapNode {
  id: number;
  title: string;
  description?: string | null;
  /** Chapter this node belongs to; null for nodes outside any chapter. */
  chapter?: number | null;
  chapter_title?: string | null;
  content_type?: string | null;
  content_url?: string | null;
  node_type?: string | null;
  is_completed?: boolean;
  progress?: {
    status: string;
    last_accessed: string | null;
    quiz_score?: number | null;
  };
  sequence_order?: number;
  /**
   * Capability flags returned by the roadmap list endpoint. The list no longer
   * embeds the full learning-material/task/quiz/assessment/coding-question
   * objects — it only reports which kinds of content a node has, so the UI can
   * render the node's category without the payload. Fetch the full content via
   * the node-detail endpoint when the student opens the node.
   */
  has_learning_material?: boolean;
  has_task?: boolean;
  has_quiz?: boolean;
  has_assessment?: boolean;
  has_coding_questions?: boolean;
  /** Whether the student may open this node (prerequisites satisfied). */
  is_accessible?: boolean;
}

export interface ApiRoadmapChapter {
  id: number;
  title: string;
  description?: string | null;
  sequence_order?: number;
}

export interface ApiRoadmapModule {
  id: number;
  title: string;
  description?: string | null;
  /** Whether the student may open this module (prerequisites satisfied). */
  is_accessible?: boolean;
  /** Chapters (cards) in display order; each node points at one via `chapter`. */
  chapters?: ApiRoadmapChapter[];
  nodes: ApiRoadmapNode[];
}

export interface ApiCourseRoadmap extends ApiEnrolledCourse {
  modules: ApiRoadmapModule[];
}

export interface AddStudentPayload {
  students: AddStudentEntry[];
}

export interface AddStudentEntry {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  student_id?: string;
  course_id?: number;
  batch_ids?: number[];
  reporting_to?: string | null;
}

/* ── Paginated wrapper ── */

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

/* ═══════════════════════ Super Admin Dashboard ═══════════════════════ */

export interface ApiAdminDashboard {
  total_organizations: number;
  total_active_organizations: number;
  total_new_organizations: number;
  total_students: number;
  total_org_admins: number;
  total_staff: number;
  total_users: number;
}

export async function getAdminDashboardApi(): Promise<ApiAdminDashboard> {
  return apiGet<ApiAdminDashboard>("/admin/dashboard/");
}

export interface ApiOrgRole {
  id: number;
  name: string;
}

export async function getOrgRolesApi(): Promise<ApiOrgRole[]> {
  const data = await apiGet<ApiOrgRole[] | { results: ApiOrgRole[] }>(
    config.api.endpoints.roles.list,
  );
  return Array.isArray(data) ? data : (data?.results ?? []);
}

/* ═══════════════════════ User Role Assignments ═══════════════════════ */

export interface ApiUserRoleAssignment {
  id: string;
  user_detail: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role_detail: { id: number; name: string };
  assigned_at: string;
}

/** GET /api/user-roles/?user={userUuid} — list role assignments for a user */
export async function listUserRolesApi(
  userUuid: string,
): Promise<ApiUserRoleAssignment[]> {
  const data = await apiGet<
    Paginated<ApiUserRoleAssignment> | ApiUserRoleAssignment[]
  >(config.api.endpoints.userRoles.list, { user: userUuid });
  return Array.isArray(data) ? data : (data?.results ?? []);
}

/** POST /api/user-roles/ — assign a role (by ID) to a user (by UUID) */
export function assignUserRoleApi(
  userUuid: string,
  roleId: number,
): Promise<ApiUserRoleAssignment> {
  return apiPost<ApiUserRoleAssignment>(config.api.endpoints.userRoles.assign, {
    user: userUuid,
    role: roleId,
  });
}

/** POST /api/user-roles/update-role/ — update a user's role assignment */
export function updateUserRoleApi(
  userUuid: string,
  newRole: string,
  oldRole: string,
): Promise<void> {
  return apiPost<void>(config.api.endpoints.userRoles.updateRole, {
    user: userUuid,
    new_role: newRole,
    old_role: oldRole,
  });
}

/** DELETE /api/user-roles/{assignmentId}/ — remove a role assignment */
export function deleteUserRoleApi(assignmentId: string): Promise<void> {
  return apiDelete<void>(config.api.endpoints.userRoles.detail(assignmentId));
}

/* ═══════════════════════ Organizations ═══════════════════════ */

export async function getOrganizationsApi(): Promise<ApiOrganization[]> {
  return unwrap(
    await apiGet<Paginated<ApiOrganization> | ApiOrganization[]>(ep.list),
  );
}

export async function getOrganizationsPaginatedApi(
  page = 1,
  search?: string,
  ordering?: string,
): Promise<Paginated<ApiOrganization>> {
  const data = await apiGet<Paginated<ApiOrganization> | ApiOrganization[]>(
    ep.list,
    { page, search, ordering },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function getOrganizationByIdApi(
  id: string,
): Promise<ApiOrganization> {
  return apiGet<ApiOrganization>(ep.detail(id));
}

export async function createOrganizationApi(
  payload: CreateOrganizationPayload,
): Promise<ApiOrganization> {
  if (payload.logo instanceof File) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    return apiPostFormData<ApiOrganization>(ep.list, fd);
  }
  return apiPost<ApiOrganization>(ep.list, payload);
}

export async function replaceOrganizationApi(
  id: string,
  payload: CreateOrganizationPayload,
): Promise<ApiOrganization> {
  return apiPut<ApiOrganization>(ep.detail(id), payload);
}

export async function updateOrganizationApi(
  id: string,
  payload: Partial<CreateOrganizationPayload>,
): Promise<ApiOrganization> {
  if (payload.logo instanceof File) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    return apiPatchFormData<ApiOrganization>(ep.detail(id), fd);
  }
  return apiPatch<ApiOrganization>(ep.detail(id), payload);
}

export async function deleteOrganizationApi(id: string): Promise<void> {
  return apiDelete(ep.detail(id));
}

export interface ApiAnalyticsOverview {
  total_users: number;
  total_staff: number;
  total_students: number;
  total_batches: number;
  total_courses: number;
}

export async function getAnalyticsOverviewApi(
  orgId: string,
): Promise<ApiAnalyticsOverview> {
  return apiGet<ApiAnalyticsOverview>(ep.analyticsOverview(orgId));
}

/**
 * Loosely-typed raw user record from the trainer-list endpoint — the endpoint
 * returns staff and students, so which fields are populated varies by role and
 * the caller has to fall back across them.
 */
export interface ApiTrainerListUser {
  id?: string | number;
  student?: string | number;
  user?: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  user_detail?: ApiTrainerListUser;
  student_detail?: ApiTrainerListUser;
}

export async function getTrainerListApi(
  orgId: string,
  params?: {
    search?: string;
    batch_id?: string | number;
    role?: string | number;
  },
): Promise<ApiTrainerListUser[]> {
  // The API returns either a paginated list or a bare array of users; unwrap handles both.
  return unwrap(
    await apiGet<Paginated<ApiTrainerListUser> | ApiTrainerListUser[]>(
      ep.trainerList(orgId),
      params,
    ),
  );
}

/* ═══════════════════════ Batches (Branches) ═══════════════════════ */

export async function getBatchesApi(
  orgId: string,
  search?: string,
  ordering?: string,
): Promise<ApiBatch[]> {
  return unwrap(
    await apiGet<Paginated<ApiBatch> | ApiBatch[]>(ep.batches.list(orgId), {
      ...(search ? { search } : {}),
      ...(ordering ? { ordering } : {}),
    }),
  );
}

export async function getBatchesPaginatedApi(
  orgId: string,
  page = 1,
  search?: string,
  ordering?: string,
): Promise<Paginated<ApiBatch>> {
  const data = await apiGet<Paginated<ApiBatch> | ApiBatch[]>(
    ep.batches.list(orgId),
    { page, search, ordering },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function getCoursesApi(
  orgId: string,
  status?: string,
): Promise<ApiCourse[]> {
  // swagger shows non-paginated array
  return unwrap(
    await apiGet<Paginated<ApiCourse> | ApiCourse[]>(
      ep.courses.list(orgId),
      status ? { status } : undefined,
    ),
  );
}

/** Fetch only Published courses — used for assignment dropdowns (batch, teacher, student) */
export async function getPublishedCoursesApi(
  orgId: string,
): Promise<ApiCourse[]> {
  return unwrap(
    await apiGet<Paginated<ApiCourse> | ApiCourse[]>(ep.courses.list(orgId), {
      status: "Published",
    }),
  );
}

export async function getCoursesPaginatedApi(
  orgId: string,
  page = 1,
  search?: string,
  ordering?: string,
  status?: string,
): Promise<Paginated<ApiCourse>> {
  const data = await apiGet<Paginated<ApiCourse> | ApiCourse[]>(
    ep.courses.list(orgId),
    { page, search, ordering, ...(status ? { status } : {}) },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function getLearnerProgressApi(
  orgId: string,
  teacherId?: string,
): Promise<ApiLearnerProgress[]> {
  const base = ep.learnerProgress(orgId);
  const url = teacherId
    ? `${base}?teacher_id=${encodeURIComponent(teacherId)}`
    : base;
  return unwrap(
    await apiGet<Paginated<ApiLearnerProgress> | ApiLearnerProgress[]>(url),
  );
}

export async function getLearnerProgressPaginatedApi(
  orgId: string,
  teacherId?: string,
  ordering?: string,
): Promise<Paginated<ApiLearnerProgress>> {
  const params: Record<string, string> = {};
  if (teacherId) params.teacher_id = teacherId;
  if (ordering) params.ordering = ordering;
  const data = await apiGet<
    Paginated<ApiLearnerProgress> | ApiLearnerProgress[]
  >(ep.learnerProgress(orgId), params);
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

/* ── Learner Progress Details ── */

export interface ApiQuizAnswerOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  is_selected: boolean;
}

export interface ApiQuizAnswerDetail {
  question_text: string;
  is_correct: boolean;
  selected_option?: string;
  correct_option?: string;
  options?: ApiQuizAnswerOption[];
  // legacy fields — may not always be returned
  selected_option_text?: string;
  correct_option_text?: string;
}

export interface ApiQuizSubmissionDetail {
  id: number;
  score: number | null;
  score_percentage?: number | null;
  total_questions: number;
  correct_answers: number;
  is_passed?: boolean;
  submitted_at: string;
  answers: ApiQuizAnswerDetail[];
  // optional fields
  quiz?: number;
  quiz_name?: string;
}

export interface ApiTaskSubmissionDetail {
  id: number;
  task?: number;
  student?: string;
  /** Can be any value (string, object, etc.) — always stringify before use */
  payload?: unknown;
  submission_file?: string | null;
  submission_file_url?: string | null;
  status: string;
  feedback?: string;
  awarded_score?: number | null;
  submitted_at: string;
  graded_at?: string | null;
}

export interface TaskReviewPayload {
  decision: "Approved" | "Rejected";
  awarded_score?: number | null;
  feedback?: string;
}

export interface ApiProgressNode {
  id: number;
  title: string;
  description?: string | null;
  /** "Empty" | "Material" | "Task" | "Quiz" */
  node_type: string;
  status: string;
  sequence_order?: number;
  learning_material?: {
    id?: number;
    content_type?: string | null;
    content_url?: string | null;
    content_file?: string | null;
    content_text?: string | null;
  } | null;
  task_submissions: ApiTaskSubmissionDetail[];
  quiz_submissions: ApiQuizSubmissionDetail[];
}

export interface ApiProgressModule {
  id: number;
  title: string;
  description?: string;
  sequence_order?: number;
  nodes: ApiProgressNode[];
}

export interface ApiLearnerProgressDetail {
  id: number;
  title: string;
  description?: string;
  learner_info: {
    id: string;
    email: string;
    full_name: string;
  };
  modules: ApiProgressModule[];
}

export async function getLearnerProgressDetailsApi(
  orgId: string,
  studentId: string,
  courseId: string | number,
): Promise<ApiLearnerProgressDetail> {
  const url = ep.learnerProgressDetails(orgId, studentId);
  return apiGet<ApiLearnerProgressDetail>(`${url}?course_id=${courseId}`);
}

export function exportLearnerProgressApi(
  orgId: string,
  studentId: string,
  courseId: string | number,
): Promise<Blob> {
  return apiGetBlob(
    `${ep.learnerProgressExport(orgId, studentId)}?course_id=${courseId}`,
  );
}

export interface ExportLearnerProgressParams {
  /** REQUIRED: Filter by Teacher/Admin UUID to only return assigned students. */
  teacherId: string;
  /** Filter by course ID. */
  courseId?: string | number;
  /** Sort by learner_name, completion_percentage, or last_activity. Prefix "-" for descending. */
  ordering?: string;
  /** Search by student name or email. */
  search?: string;
}

/** Bulk-export learner progress to a multi-tab Excel file, scoped to a teacher and the active filters. */
export function exportAllLearnerProgressApi(
  orgId: string,
  params: ExportLearnerProgressParams,
): Promise<Blob> {
  const qs = new URLSearchParams({ teacher_id: params.teacherId });
  if (params.courseId !== undefined && params.courseId !== "")
    qs.set("course_id", String(params.courseId));
  if (params.ordering) qs.set("ordering", params.ordering);
  if (params.search) qs.set("search", params.search);
  return apiGetBlob(`${ep.learnerProgressExportAll(orgId)}?${qs.toString()}`);
}

export async function getNodeSubmissionApi(
  orgId: string,
  studentId: string,
  courseId: string | number,
  nodeId: string | number,
): Promise<ApiTaskSubmissionDetail | null> {
  const url = ep.nodeSubmissionDetails(orgId);
  try {
    const raw = await apiGet<Record<string, unknown>>(
      `${url}?student_id=${studentId}&course_id=${courseId}&node_id=${nodeId}`,
    );
    if (!raw) return null;
    // Response: { node_title, task_submissions: [...] }
    const subs = raw["task_submissions"];
    if (Array.isArray(subs) && subs.length > 0) {
      return subs[0] as ApiTaskSubmissionDetail;
    }
    // Fallback: flat submission object with an id
    if (typeof raw["id"] === "number") {
      return raw as unknown as ApiTaskSubmissionDetail;
    }
    return null;
  } catch {
    return null;
  }
}

export async function reviewTaskSubmissionApi(
  orgId: string,
  submissionId: string | number,
  payload: TaskReviewPayload,
): Promise<ApiTaskSubmissionDetail> {
  return apiPost<ApiTaskSubmissionDetail>(
    ep.submissionsTaskReview(orgId, submissionId),
    payload,
  );
}

export async function getTeacherDashboardApi(
  orgId: string,
  teacherId: string,
): Promise<ApiTeacherDashboard> {
  return apiGet<ApiTeacherDashboard>(ep.teacherDashboard(orgId, teacherId));
}

export async function createCourseApi(
  orgId: string,
  payload: CreateCoursePayload,
): Promise<ApiCourse> {
  const { thumbnail, teachers, batches, ...rest } = payload;
  if (
    thumbnail ||
    (teachers && teachers.length > 0) ||
    (batches && batches.length > 0)
  ) {
    const fd = new FormData();
    if (rest.title) fd.append("title", rest.title);
    if (rest.description) fd.append("description", rest.description);
    if (rest.status) fd.append("status", rest.status);
    if (thumbnail) fd.append("thumbnail", thumbnail);
    teachers?.forEach((id) => fd.append("teachers", String(id)));
    batches?.forEach((id) => fd.append("batches", String(id)));
    return apiPostFormData<ApiCourse>(ep.courses.list(orgId), fd);
  }
  return apiPost<ApiCourse>(ep.courses.list(orgId), rest);
}

export async function getCourseByIdApi(
  orgId: string,
  courseId: string | number,
): Promise<ApiCourse> {
  return apiGet<ApiCourse>(ep.courses.detail(orgId, courseId));
}

export async function updateCourseApi(
  orgId: string,
  courseId: string | number,
  payload: Partial<CreateCoursePayload>,
): Promise<ApiCourse> {
  const { thumbnail, teachers, batches, ...rest } = payload;
  if (
    thumbnail ||
    (teachers && teachers.length > 0) ||
    (batches && batches.length > 0)
  ) {
    const fd = new FormData();
    if (rest.title) fd.append("title", rest.title);
    if (rest.description) fd.append("description", rest.description);
    if (rest.status) fd.append("status", rest.status);
    if (thumbnail) fd.append("thumbnail", thumbnail);
    teachers?.forEach((id) => fd.append("teachers", String(id)));
    batches?.forEach((id) => fd.append("batches", String(id)));
    return apiPatchFormData<ApiCourse>(ep.courses.detail(orgId, courseId), fd);
  }
  return apiPatch<ApiCourse>(ep.courses.detail(orgId, courseId), rest);
}

export async function replaceCourseApi(
  orgId: string,
  courseId: string | number,
  payload: CreateCoursePayload,
): Promise<ApiCourse> {
  return apiPut<ApiCourse>(ep.courses.detail(orgId, courseId), payload);
}

export async function deleteCourseApi(
  orgId: string,
  courseId: string | number,
): Promise<void> {
  await apiDelete(ep.courses.detail(orgId, courseId));
}

export async function createCourseModuleApi(
  orgId: string,
  courseId: string | number,
  payload: CreateCourseModulePayload,
): Promise<ApiCourseModule> {
  return apiPost<ApiCourseModule>(
    ep.courses.modules.list(orgId, courseId),
    payload,
  );
}

export async function getCourseModulesApi(
  orgId: string,
  courseId: string | number,
): Promise<ApiCourseModule[]> {
  return unwrap(
    await apiGet<Paginated<ApiCourseModule> | ApiCourseModule[]>(
      ep.courses.modules.list(orgId, courseId),
    ),
  );
}

export async function getCourseModuleByIdApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
): Promise<ApiCourseModule> {
  return apiGet<ApiCourseModule>(
    ep.courses.modules.detail(orgId, courseId, moduleId),
  );
}

export async function replaceCourseModuleApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  payload: CreateCourseModulePayload,
): Promise<ApiCourseModule> {
  return apiPut<ApiCourseModule>(
    ep.courses.modules.detail(orgId, courseId, moduleId),
    payload,
  );
}

export async function updateCourseModuleApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  payload: UpdateCourseModulePayload,
): Promise<ApiCourseModule> {
  return apiPatch<ApiCourseModule>(
    ep.courses.modules.detail(orgId, courseId, moduleId),
    payload,
  );
}

export async function deleteCourseModuleApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
): Promise<void> {
  await apiDelete(ep.courses.modules.detail(orgId, courseId, moduleId));
}

export async function getModuleNodesApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
): Promise<ApiModuleNode[]> {
  return unwrap(
    await apiGet<Paginated<ApiModuleNode> | ApiModuleNode[]>(
      ep.courses.modules.nodes.list(orgId, courseId, moduleId),
    ),
  );
}

export async function getModuleNodeApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
): Promise<ApiModuleNode> {
  return apiGet<ApiModuleNode>(
    ep.courses.modules.nodes.detail(orgId, courseId, moduleId, nodeId),
  );
}

function appendNodeField(
  fd: FormData,
  key: string,
  value: string | number | boolean | undefined | null,
) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    fd.append(key, value ? "true" : "false");
    return;
  }
  fd.append(key, String(value));
}

function buildCreateNodeFormData(payload: CreateModuleNodePayload): FormData {
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("description", payload.description ?? "");
  appendNodeField(fd, "sequence_order", payload.sequence_order);
  appendNodeField(fd, "chapter", payload.chapter);
  const prn = payload.prerequisite_node;
  if (prn != null && Number(prn) > 0)
    fd.append("prerequisite_node", String(Number(prn)));
  appendNodeField(fd, "drip_delay_days", payload.drip_delay_days);

  const optionalStringFields = [
    "focus_areas",
    "quick_outline",
    "learning_material_content_type",
    "learning_material_content_url",
    "learning_material_content_text",
    "task_title",
    "task_description",
    "quiz_name",
    "quiz_question_text",
    "quiz_option_a",
    "quiz_option_b",
    "quiz_option_c",
    "quiz_option_d",
    "quiz_correct_option",
    "questions_input",
  ] as const;
  for (const key of optionalStringFields) {
    if (payload[key]) fd.append(key, payload[key] as string);
  }

  if (payload.learning_material_content_file) {
    fd.append(
      "learning_material_content_file",
      payload.learning_material_content_file,
    );
  }
  if (payload.task_attachment) {
    fd.append("task_attachment", payload.task_attachment);
  }
  appendNodeField(fd, "task_allow_link", payload.task_allow_link);
  appendNodeField(fd, "task_allow_paragraph", payload.task_allow_paragraph);
  appendNodeField(fd, "task_allow_pdf", payload.task_allow_pdf);
  appendNodeField(fd, "task_allow_screenshot", payload.task_allow_screenshot);
  appendNodeField(fd, "task_allow_code_block", payload.task_allow_code_block);
  appendNodeField(fd, "task_allow_file", payload.task_allow_file);
  for (const opt of payload.quiz_extra_options ?? []) {
    if (opt) fd.append("quiz_extra_options", opt);
  }
  if (payload.quiz_timer_minutes != null)
    fd.append("quiz_timer_minutes", String(payload.quiz_timer_minutes));
  if (payload.quiz_allow_multiple_correct != null)
    fd.append(
      "quiz_allow_multiple_correct",
      payload.quiz_allow_multiple_correct ? "true" : "false",
    );
  return fd;
}

export async function createModuleNodeApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  payload: CreateModuleNodePayload,
): Promise<ApiModuleNode> {
  const fd = buildCreateNodeFormData(payload);
  return apiPostFormData<ApiModuleNode>(
    ep.courses.modules.nodes.list(orgId, courseId, moduleId),
    fd,
  );
}

function appendDefinedField(
  fd: FormData,
  key: string,
  value: string | undefined | null,
) {
  if (value !== undefined) fd.append(key, value ?? "");
}

function appendDefinedBool(
  fd: FormData,
  key: string,
  value: boolean | undefined,
) {
  if (value !== undefined) fd.append(key, value ? "true" : "false");
}

function buildUpdateNodeFormData(
  payload: Partial<CreateModuleNodePayload>,
): FormData {
  const fd = new FormData();
  appendDefinedField(fd, "title", payload.title);
  appendDefinedField(fd, "description", payload.description);
  const prn = payload.prerequisite_node;
  if ("prerequisite_node" in payload) {
    // null/0/undefined means "make this the first node" — send empty string to clear
    fd.append(
      "prerequisite_node",
      prn != null && Number(prn) > 0 ? String(Number(prn)) : "",
    );
  }
  if (payload.sequence_order !== undefined)
    fd.append("sequence_order", String(payload.sequence_order));
  if (payload.chapter !== undefined)
    fd.append("chapter", String(payload.chapter));
  if (payload.drip_delay_days !== undefined)
    fd.append("drip_delay_days", String(payload.drip_delay_days));
  appendDefinedField(fd, "focus_areas", payload.focus_areas);
  appendDefinedField(fd, "quick_outline", payload.quick_outline);
  appendDefinedField(
    fd,
    "learning_material_content_type",
    payload.learning_material_content_type,
  );
  appendDefinedField(
    fd,
    "learning_material_content_url",
    payload.learning_material_content_url,
  );
  if (
    payload.learning_material_content_file !== undefined &&
    payload.learning_material_content_file != null
  ) {
    fd.append(
      "learning_material_content_file",
      payload.learning_material_content_file,
    );
  }
  appendDefinedField(
    fd,
    "learning_material_content_text",
    payload.learning_material_content_text,
  );
  appendDefinedField(fd, "task_title", payload.task_title);
  appendDefinedBool(fd, "task_allow_link", payload.task_allow_link);
  appendDefinedBool(fd, "task_allow_paragraph", payload.task_allow_paragraph);
  appendDefinedBool(fd, "task_allow_pdf", payload.task_allow_pdf);
  appendDefinedBool(fd, "task_allow_screenshot", payload.task_allow_screenshot);
  appendDefinedBool(fd, "task_allow_code_block", payload.task_allow_code_block);
  appendDefinedBool(fd, "task_allow_file", payload.task_allow_file);
  appendDefinedField(fd, "task_description", payload.task_description);
  if (
    payload.task_attachment !== undefined &&
    payload.task_attachment != null
  ) {
    fd.append("task_attachment", payload.task_attachment);
  }
  appendDefinedField(fd, "quiz_name", payload.quiz_name);
  appendDefinedField(fd, "questions_input", payload.questions_input);
  if (payload.quiz_timer_minutes !== undefined)
    fd.append("quiz_timer_minutes", String(payload.quiz_timer_minutes));
  if (payload.quiz_allow_multiple_correct !== undefined)
    fd.append(
      "quiz_allow_multiple_correct",
      payload.quiz_allow_multiple_correct ? "true" : "false",
    );
  return fd;
}

export async function updateModuleNodeApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
  payload: Partial<CreateModuleNodePayload>,
): Promise<ApiModuleNode> {
  const fd = buildUpdateNodeFormData(payload);
  return apiPatchFormData<ApiModuleNode>(
    ep.courses.modules.nodes.detail(orgId, courseId, moduleId, nodeId),
    fd,
  );
}

/** Full node replacement (Swagger: PUT Update Node (Full), application/json). */
export type ReplaceModuleNodePayload = Partial<
  Omit<CreateModuleNodePayload, "learning_material_content_file">
> & {
  // PUT usually wants stored filenames/urls; allow string/null for file fields.
  learning_material_content_file?: string | null;
};

export async function replaceModuleNodeApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
  payload: ReplaceModuleNodePayload,
): Promise<ApiModuleNode> {
  return apiPut<ApiModuleNode>(
    ep.courses.modules.nodes.detail(orgId, courseId, moduleId, nodeId),
    payload,
  );
}

export async function deleteModuleNodeApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
): Promise<void> {
  await apiDelete(
    ep.courses.modules.nodes.detail(orgId, courseId, moduleId, nodeId),
  );
}

export async function getModuleChaptersApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
): Promise<ApiChapter[]> {
  return unwrap(
    await apiGet<Paginated<ApiChapter> | ApiChapter[]>(
      ep.courses.modules.chapters.list(orgId, courseId, moduleId),
    ),
  );
}

export async function createChapterApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  payload: ChapterPayload & { title: string },
): Promise<ApiChapter> {
  return apiPost<ApiChapter>(
    ep.courses.modules.chapters.list(orgId, courseId, moduleId),
    payload,
  );
}

export async function updateChapterApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  chapterId: string | number,
  payload: ChapterPayload,
): Promise<ApiChapter> {
  return apiPatch<ApiChapter>(
    ep.courses.modules.chapters.detail(orgId, courseId, moduleId, chapterId),
    payload,
  );
}

/** Deletes the chapter and every item in it. */
export async function deleteChapterApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  chapterId: string | number,
): Promise<void> {
  await apiDelete(
    ep.courses.modules.chapters.detail(orgId, courseId, moduleId, chapterId),
  );
}

/** Sets the order of the items in a chapter; `nodeIds` must list all of them. */
export async function reorderChapterNodesApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  chapterId: string | number,
  nodeIds: number[],
): Promise<ApiModuleNode[]> {
  return apiPost<ApiModuleNode[]>(
    ep.courses.modules.chapters.reorder(orgId, courseId, moduleId, chapterId),
    { node_ids: nodeIds },
  );
}

/**
 * Reorders nodes of a module in one atomic request. The listed nodes swap
 * among the positions they already hold, so a subset is fine.
 */
export async function reorderModuleNodesApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeIds: number[],
): Promise<ApiModuleNode[]> {
  return apiPost<ApiModuleNode[]>(
    ep.courses.modules.nodes.reorder(orgId, courseId, moduleId),
    { node_ids: nodeIds },
  );
}

export async function getBatchByIdApi(
  orgId: string,
  batchId: string,
): Promise<ApiBatch> {
  return apiGet<ApiBatch>(ep.batches.detail(orgId, batchId));
}

export async function createBatchApi(
  orgId: string,
  payload: CreateBatchPayload,
): Promise<ApiBatch> {
  return apiPost<ApiBatch>(ep.batches.list(orgId), payload);
}

export async function replaceBatchApi(
  orgId: string,
  batchId: string,
  payload: CreateBatchPayload,
): Promise<ApiBatch> {
  return apiPut<ApiBatch>(ep.batches.detail(orgId, batchId), payload);
}

export async function updateBatchApi(
  orgId: string,
  batchId: string,
  payload: Partial<CreateBatchPayload>,
): Promise<ApiBatch> {
  return apiPatch<ApiBatch>(ep.batches.detail(orgId, batchId), payload);
}

export async function deleteBatchApi(
  orgId: string,
  batchId: string,
): Promise<void> {
  return apiDelete(ep.batches.detail(orgId, batchId));
}

/* ═══════════════════════ Members ═══════════════════════ */

export async function getMembersApi(orgId: string): Promise<ApiMember[]> {
  return unwrap(
    await apiGet<Paginated<ApiMember> | ApiMember[]>(ep.members.list(orgId)),
  );
}

export async function getMembersPaginatedApi(
  orgId: string,
  page = 1,
  search?: string,
): Promise<Paginated<ApiMember>> {
  const data = await apiGet<Paginated<ApiMember> | ApiMember[]>(
    ep.members.list(orgId),
    { page, search },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function getOrgStudentsPaginatedApi(
  orgId: string,
  page = 1,
  search?: string,
  ordering?: string,
): Promise<Paginated<ApiStudent>> {
  const data = await apiGet<Paginated<ApiStudent> | ApiStudent[]>(
    ep.students.orgList(orgId),
    { page, search, ordering },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data as Paginated<ApiStudent>;
}

export async function getMemberByIdApi(
  orgId: string,
  memberId: string,
): Promise<ApiMember> {
  return apiGet<ApiMember>(ep.members.detail(orgId, memberId));
}

export async function createMemberApi(
  orgId: string,
  payload: CreateMemberPayload,
): Promise<ApiMember> {
  return apiPost<ApiMember>(ep.members.list(orgId), payload);
}

export async function replaceMemberApi(
  orgId: string,
  memberId: string,
  payload: CreateMemberPayload,
): Promise<ApiMember> {
  return apiPut<ApiMember>(ep.members.detail(orgId, memberId), payload);
}

export async function updateMemberApi(
  orgId: string,
  memberId: string,
  payload: UpdateMemberPayload,
): Promise<ApiMember> {
  return apiPatch<ApiMember>(ep.members.detail(orgId, memberId), payload);
}

export async function deleteMemberApi(
  orgId: string,
  memberId: string,
): Promise<void> {
  return apiDelete(ep.members.detail(orgId, memberId));
}

/* ═══════════════════════ Staff ═══════════════════════ */

export async function getStaffApi(
  orgId: string,
  role?: string,
  search?: string,
  ordering?: string,
): Promise<ApiStaff[]> {
  return unwrap(
    await apiGet<Paginated<ApiStaff> | ApiStaff[]>(ep.staff.list(orgId), {
      role,
      search,
      ordering,
    }),
  );
}

export async function getStaffPaginatedApi(
  orgId: string,
  page = 1,
  search?: string,
  ordering?: string,
): Promise<Paginated<ApiStaff>> {
  const data = await apiGet<Paginated<ApiStaff> | ApiStaff[]>(
    ep.staff.list(orgId),
    { page, search, ordering },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function getStaffByIdApi(
  orgId: string,
  staffId: string,
): Promise<ApiStaff> {
  return apiGet<ApiStaff>(ep.staff.detail(orgId, staffId));
}

export async function createStaffApi(
  orgId: string,
  payload: CreateStaffPayload,
): Promise<ApiStaff> {
  const fd = new FormData();
  fd.append("user_email", payload.user_email);
  fd.append("first_name", payload.first_name);
  fd.append("last_name", payload.last_name);
  if (payload.phone_number) fd.append("phone_number", payload.phone_number);
  fd.append("role_name", payload.role_name);
  payload.batches?.forEach((id) => fd.append("batches", String(id)));
  if (
    payload.assigned_courses !== undefined &&
    payload.assigned_courses.length > 0
  ) {
    payload.assigned_courses.forEach((id) =>
      fd.append("assigned_courses", String(id)),
    );
  }
  fd.append("is_active", String(payload.is_active ?? true));
  return apiPostFormData<ApiStaff>(ep.staff.list(orgId), fd);
}

export async function updateStaffApi(
  orgId: string,
  staffId: string,
  payload: UpdateStaffPayload,
): Promise<ApiStaff> {
  return apiPatch<ApiStaff>(ep.staff.detail(orgId, staffId), payload);
}

export async function replaceStaffApi(
  orgId: string,
  staffId: string,
  payload: Required<
    Pick<
      UpdateStaffPayload,
      | "user_email"
      | "first_name"
      | "last_name"
      | "phone_number"
      | "role_name"
      | "is_active"
    >
  > & { batches?: number[] },
): Promise<ApiStaff> {
  return apiPut<ApiStaff>(ep.staff.detail(orgId, staffId), payload);
}

export async function deleteStaffApi(
  orgId: string,
  staffId: string,
): Promise<void> {
  return apiDelete(ep.staff.detail(orgId, staffId));
}

export async function bulkUploadStaffApi(
  orgId: string,
  file: File,
  roleName: string,
  batchId?: number,
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("role_name", roleName);
  if (batchId !== undefined) fd.append("batch_id", String(batchId));
  return apiPostFormData(ep.staff.bulkUpload(orgId), fd);
}

/* ═══════════════════════ Students ═══════════════════════ */

export interface PaginatedStudents {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiStudent[];
}

export async function getStudentsApi(
  orgId: string,
  batchId: string,
  page = 1,
  search?: string,
): Promise<PaginatedStudents> {
  const data = await apiGet<Paginated<ApiStudent> | ApiStudent[]>(
    ep.students.list(orgId, batchId),
    { page, search },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data as PaginatedStudents;
}

export async function getOrgStudentsApi(
  orgId: string,
  page = 1,
  search?: string,
): Promise<PaginatedStudents> {
  const data = await apiGet<Paginated<ApiStudent> | ApiStudent[]>(
    ep.students.orgList(orgId),
    { page, search },
  );
  if (Array.isArray(data))
    return { count: data.length, next: null, previous: null, results: data };
  return data as PaginatedStudents;
}

export async function getStudentByIdApi(
  orgId: string,
  batchId: string,
  studentId: string,
): Promise<ApiStudent> {
  return apiGet<ApiStudent>(ep.students.detail(orgId, batchId, studentId));
}

export async function getOrgStudentByIdApi(
  orgId: string,
  studentId: string,
): Promise<ApiStudent> {
  return apiGet<ApiStudent>(ep.students.orgDetail(orgId, studentId));
}

/**
 * Create / invite students under an organization or a specific batch.
 *
 * - Batch endpoint (`batchId` provided): the API expects the wrapped
 *   `{ students: [...] }` collection body.
 * - Org endpoint (no `batchId`): the API expects a single flat student object
 *   per request, with the target batches carried in `batch_ids`. Multiple
 *   entries are sent as one request each and resolved together.
 */
export async function addStudentApi(
  orgId: string,
  payload: AddStudentPayload,
  batchId?: string,
): Promise<ApiStudent> {
  if (batchId) {
    return apiPost<ApiStudent>(ep.students.list(orgId, batchId), payload);
  }
  const results = await Promise.all(
    payload.students.map((student) =>
      apiPost<ApiStudent>(ep.students.orgList(orgId), student),
    ),
  );
  return results[0];
}

/** Assign existing students to a batch by uploading a filled Excel/CSV file. */
export function bulkUploadStudentsFileApi(
  orgId: string,
  batchId: string,
  file: File,
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  return apiPostFormData(ep.students.bulkUploadFile(orgId, batchId), fd);
}

/** Download the Excel template used for bulk-assigning students to a batch. */
export function downloadStudentBulkUploadTemplateApi(
  orgId: string,
  batchId: string,
): Promise<Blob> {
  return apiGetBlob(ep.students.downloadTemplate(orgId, batchId));
}

export async function removeStudentApi(
  orgId: string,
  batchId: string,
  studentId: string,
): Promise<void> {
  return apiDelete(ep.students.detail(orgId, batchId, studentId));
}

export interface UpdateStudentPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  student_id?: string;
  course_id?: number;
  batch_ids?: number[];
  is_active?: boolean;
  /** Student UUID; required by the API when toggling active state. */
  student?: string;
  reporting_to?: string | null;
}

export async function updateStudentApi(
  orgId: string,
  batchId: string,
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<ApiStudent> {
  return apiPatch<ApiStudent>(
    ep.students.detail(orgId, batchId, studentId),
    payload,
  );
}

export async function updateOrgStudentApi(
  orgId: string,
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<ApiStudent> {
  return apiPatch<ApiStudent>(ep.students.orgDetail(orgId, studentId), payload);
}

export async function deleteOrgStudentApi(
  orgId: string,
  studentId: string,
): Promise<void> {
  return apiDelete(ep.students.orgDetail(orgId, studentId));
}

export async function replaceStudentApi(
  orgId: string,
  batchId: string,
  studentId: string,
  payload: Required<
    Pick<
      UpdateStudentPayload,
      | "email"
      | "first_name"
      | "last_name"
      | "phone_number"
      | "student_id"
      | "course_id"
      | "batch_ids"
      | "is_active"
    >
  >,
): Promise<ApiStudent> {
  return apiPut<ApiStudent>(
    ep.students.detail(orgId, batchId, studentId),
    payload,
  );
}

/* ═══════════════════════ Student Specific ═══════════════════════ */

export interface ApiStudentDashboard {
  cards: {
    enrolled_courses: number;
    upcoming_mandatory_due_dates: number;
    overall_completion_percentage: number;
    pending_assessments: number;
    certificates_earned: number;
    learning_hours_this_month: number | null;
  };
  // These lists are returned by the API but not rendered yet — only `cards` is consumed.
  upcoming_mandatory_due_dates: unknown[];
  progress: unknown[];
  resume_learning_node_id: string | number | null;
  gamification: {
    points: number;
    level: string;
    badges: unknown[];
  };
  certificates: ApiCertificate[];
}

export * from './certificates';

export async function getStudentDashboardApi(
  orgId: string,
): Promise<ApiStudentDashboard> {
  return apiGet<ApiStudentDashboard>(ep.students.dashboard(orgId));
}

export async function getMyCoursesApi(
  orgId: string,
): Promise<ApiEnrolledCourse[]> {
  return unwrap(
    await apiGet<Paginated<ApiEnrolledCourse> | ApiEnrolledCourse[]>(
      ep.myCourses(orgId),
    ),
  );
}

export interface ApiMyProgressCourse {
  id: number;
  title: string;
  completed_nodes: number;
  total_nodes: number;
  completion_percentage: number;
}

export interface ApiMyProgressBatch {
  id: number;
  name: string;
  courses: ApiMyProgressCourse[];
}

export interface ApiMyProgress {
  overall_completion_percentage: number;
  total_nodes: number;
  completed_nodes: number;
  batches: ApiMyProgressBatch[];
}

export function getMyProgressApi(orgId: string): Promise<ApiMyProgress> {
  return apiGet<ApiMyProgress>(ep.myProgress(orgId));
}

export async function getCourseRoadmapApi(
  orgId: string | number,
  courseId: string | number,
): Promise<ApiCourseRoadmap> {
  // Roadmap returns a Course object with modules: []
  return apiGet<ApiCourseRoadmap>(ep.courses.roadmap(String(orgId), courseId));
}

/**
 * The full node payload returned by the node-detail endpoint. The roadmap list
 * only exposes capability flags, so the actual content (video/task/quiz/coding)
 * is fetched here when the student opens a node. Structurally a superset of the
 * roadmap node — assignable to the UI's loose `RoadmapNodeData` shape. If the
 * student has not completed the prerequisite node, the endpoint returns 403 and
 * this call rejects.
 */
export interface ApiStudentNodeDetail {
  id: number;
  title?: string;
  description?: string | null;
  content_type?: string | null;
  content_url?: string | null;
  content_file?: string | null;
  node_type?: string | null;
  attachment?: string | null;
  learning_material?: {
    content_type?: string | null;
    content_url?: string | null;
    content_file?: string | null;
    attachment?: string | null;
  } | null;
  task?: {
    title?: string;
    description?: string | null;
    attachment?: string | null;
    allow_pdf?: boolean;
    allow_code_block?: boolean;
    allow_link?: boolean;
    allow_paragraph?: boolean;
    allow_screenshot?: boolean;
    allow_file?: boolean;
  } | null;
  quizzes?: {
    id: number;
    name?: string;
    questions?: unknown[];
    pass_percentage?: number | null;
    must_pass_to_continue?: boolean;
    [key: string]: unknown;
  }[];
  coding_questions?: unknown[];
  is_completed?: boolean;
  progress?: {
    status?: string;
    last_accessed?: string | null;
    quiz_score?: number | null;
  };
  task_submission?: { status?: string; can_resubmit?: boolean } | null;
  quick_outline?: { id: number | string; text: string }[];
  focus_areas?: { id: number | string; text: string }[];
}

/**
 * Fetch a single node's full content. Now open to students once they have
 * unlocked the node (prerequisites complete); otherwise the API returns 403.
 */
export async function getStudentNodeDetailApi(
  orgId: string | number,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
): Promise<ApiStudentNodeDetail> {
  return apiGet<ApiStudentNodeDetail>(
    ep.courses.modules.nodes.detail(String(orgId), courseId, moduleId, nodeId),
  );
}

export async function completeModuleNodeApi(
  nodeId: string | number,
): Promise<void> {
  // Config has endpoints.nodes.complete
  const url = config.api.endpoints.nodes.complete(nodeId);
  await apiPost(url, {});
}

export async function submitModuleNodeApi(
  nodeId: string | number,
): Promise<void> {
  const url = config.api.endpoints.nodes.submit(nodeId);
  await apiPost(url, {});
}

export async function getTaskAllSubmissionsApi(
  nodeId: string | number,
): Promise<ApiTaskSubmission[]> {
  const url = config.api.endpoints.nodes.allSubmissions(nodeId);
  return unwrap(
    await apiGet<Paginated<ApiTaskSubmission> | ApiTaskSubmission[]>(url),
  );
}

export async function getTaskSubmissionsApi(
  nodeId: string | number,
): Promise<ApiTaskSubmission[]> {
  const url = config.api.endpoints.nodes.taskSubmissions(nodeId);
  return unwrap(
    await apiGet<Paginated<ApiTaskSubmission> | ApiTaskSubmission[]>(url),
  );
}

export async function submitTaskApi(
  nodeId: string | number,
  payload: SubmitTaskPayload,
): Promise<ApiTaskSubmission> {
  const url = config.api.endpoints.nodes.taskSubmissions(nodeId);

  // Use FormData for file uploads
  const formData = new FormData();
  // payload must be valid JSON when provided; omit when submitting file only
  if (payload.payload) {
    // already JSON-stringified by caller (buildPayload); pass through as-is
    formData.append("payload", payload.payload);
  }
  if (payload.submission_file) {
    formData.append("submission_file", payload.submission_file);
  }

  return apiPostFormData<ApiTaskSubmission>(url, formData);
}

/* ── Quiz Submit ── */

export interface ApiQuizAnswer {
  question: number;
  selected_option?: number;
  selected_options?: number[];
}

export interface ApiQuizSubmissionResult {
  id: number;
  quiz: number;
  score: number | null;
  total_questions: number;
  correct_answers: number;
  /** Whether this attempt met the quiz's pass_percentage. */
  passed?: boolean;
  /** Human-readable status, e.g. "Passed" / "Failed". */
  status?: string;
  attempt_number?: number;
  submitted_at: string;
  answers: ApiQuizAnswer[];
}

export async function submitQuizApi(
  quizId: number,
  answers: ApiQuizAnswer[],
): Promise<ApiQuizSubmissionResult> {
  const url = config.api.endpoints.quizzes.submit(quizId);
  return apiPost<ApiQuizSubmissionResult>(url, { answers });
}

/* ── Node Detail: quiz answer review ── */

/**
 * A quiz option as returned by the node-detail endpoint. `is_correct` is only
 * present once the student has passed the quiz (the backend hides it otherwise
 * to prevent inspecting the response for answers).
 */
export interface ApiNodeQuizReviewOption {
  id: number;
  option_text: string;
  is_correct?: boolean;
  is_selected?: boolean;
}

export interface ApiNodeQuizReviewQuestion {
  id: number;
  question_text: string;
  allow_multiple_correct?: boolean;
  options?: ApiNodeQuizReviewOption[];
  /**
   * Option ids the student selected for this question. The backend returns this
   * per-question array (supports multi-select); older payloads instead flagged
   * `is_selected` on each option, so review reads whichever is present.
   */
  selected_options?: number[];
}

export interface ApiNodeQuizReview {
  id: number;
  name?: string;
  questions?: ApiNodeQuizReviewQuestion[];
}

interface ApiNodeDetailWithQuizzes {
  id: number;
  quizzes?: ApiNodeQuizReview[];
}

/**
 * Fetch a single node's detail and return its quizzes. Once the student has
 * passed, each option carries `is_correct`, enabling answer review. The roadmap
 * endpoint does NOT include this field, so review must go through node detail.
 */
export async function getNodeQuizReviewApi(
  orgId: string,
  courseId: string | number,
  moduleId: string | number,
  nodeId: string | number,
): Promise<ApiNodeQuizReview[]> {
  const res = await apiGet<ApiNodeDetailWithQuizzes>(
    ep.courses.modules.nodes.detail(orgId, courseId, moduleId, nodeId),
  );
  return res.quizzes ?? [];
}

/* ═══════════════════════ Pending Evaluations ═══════════════════════ */

export interface ApiAssessmentEvaluation {
  /** Task submission id — pass this to {@link reviewTaskSubmissionApi}. */
  id: number;
  student_id: string;
  student_name: string;
  student_email: string;
  task_title: string;
  node_id: number;
  node_title: string;
  module_id: number;
  module_title: string;
  submitted_at: string;
  status: string;
  file_url?: string | null;
  feedback?: string | null;
  /** Present once the submission has been graded. */
  awarded_score?: number | null;
  graded_at?: string | null;
  /** Raw text/link submission — can be any shape, always stringify before use. */
  payload?: unknown;
}

export interface ApiQuizEvaluation {
  id: number;
  student_id: string;
  student_name: string;
  student_email: string;
  quiz_name: string;
  node_id: number;
  node_title: string;
  module_id: number;
  module_title: string;
  score?: number | null;
  passed?: boolean | null;
  submitted_at: string;
}

export interface PendingEvaluationsParams {
  type?: "assessment" | "quiz";
  status?: "pending" | "completed";
  /** Restrict to a single student (UUID). */
  student_id?: string;
  /** Restrict to a single course. */
  course_id?: string | number;
  search?: string;
  ordering?: string;
  page?: number;
}

export async function getPendingEvaluationsApi(
  orgId: string,
  params: PendingEvaluationsParams = {},
): Promise<Paginated<ApiAssessmentEvaluation | ApiQuizEvaluation>> {
  const ep = config.api.endpoints.organizations;
  return apiGet<Paginated<ApiAssessmentEvaluation | ApiQuizEvaluation>>(
    ep.pendingEvaluations(orgId),
    { type: "assessment", status: "pending", ...params },
  );
}

/* ═══════════════════════ Batches Overview ═══════════════════════ */

export interface ApiBatchOverview {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  courses_count: number;
  students_count: number;
  overdue_reviews_count: number;
  courses: Array<{ id: number; title: string; description?: string }>;
}

export interface ApiBatchCourseOverview {
  id: number;
  title: string;
  description?: string;
  status?: string;
  trainer_name?: string;
  students_enrolled_count: number;
  overdue_reviews_count: number;
  review_status?: string;
}

export interface ApiBatchCoursesResponse {
  batch_id: number;
  batch_name: string;
  courses: ApiBatchCourseOverview[];
}

export interface ApiBatchStudentOverview {
  student_id: string;
  email: string;
  name: string;
  course_title: string;
  trainer_name: string;
  total_tasks: number;
  evaluated_tasks: number;
  progress: string;
  evaluation_percentage: number;
  review_status: string;
}

export interface ApiBatchStudentsResponse {
  batch_id: number;
  batch_name: string;
  course_id: number;
  course_title: string;
  teachers: Array<{ id: number; email: string; name: string }>;
  students: ApiBatchStudentOverview[];
}

export interface ApiBatchRoadmapNode {
  id: number;
  title: string;
  node_type: string;
  status: string;
  completed_at?: string | null;
  submission_id?: number | null;
  submitted_at?: string | null;
}

export interface ApiBatchRoadmapModule {
  id: number;
  title: string;
  nodes: ApiBatchRoadmapNode[];
}

export interface ApiBatchRoadmapResponse {
  id: number;
  title: string;
  modules: ApiBatchRoadmapModule[];
}

/** Level 1 — GET /batches-overview/ */
export async function getBatchesOverviewApi(
  orgId: string,
): Promise<ApiBatchOverview[]> {
  const url = config.api.endpoints.organizations.batchesOverview(orgId);
  const data = await apiGet<ApiBatchOverview[] | Paginated<ApiBatchOverview>>(
    url,
  );
  return Array.isArray(data) ? data : (data?.results ?? []);
}

/** Level 2 — GET /batches-overview/?batch_id=X */
export async function getBatchCoursesOverviewApi(
  orgId: string,
  batchId: number,
): Promise<ApiBatchCoursesResponse> {
  const url = config.api.endpoints.organizations.batchesOverview(orgId);
  return apiGet<ApiBatchCoursesResponse>(url, { batch_id: batchId });
}

/** Level 3 — GET /batches-overview/?batch_id=X&course_id=Y */
export async function getBatchCourseStudentsApi(
  orgId: string,
  batchId: number,
  courseId: number,
): Promise<ApiBatchStudentsResponse> {
  const url = config.api.endpoints.organizations.batchesOverview(orgId);
  return apiGet<ApiBatchStudentsResponse>(url, {
    batch_id: batchId,
    course_id: courseId,
  });
}

/** Level 4 — GET /batches-overview/?batch_id=X&course_id=Y&student_id=Z */
export async function getBatchStudentRoadmapApi(
  orgId: string,
  batchId: number,
  courseId: number,
  studentId: string,
): Promise<ApiBatchRoadmapResponse> {
  const url = config.api.endpoints.organizations.batchesOverview(orgId);
  return apiGet<ApiBatchRoadmapResponse>(url, {
    batch_id: batchId,
    course_id: courseId,
    student_id: studentId,
  });
}
