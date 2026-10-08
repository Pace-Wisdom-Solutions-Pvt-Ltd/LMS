// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export function computeBaseUrl(envValue: unknown): string {
  if (typeof envValue === 'string' && envValue.length > 0) return envValue.replace(/\/$/, '')
  return ''
}

const BASE_URL = computeBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const config = {
  api: {
    baseUrl: BASE_URL,
    endpoints: {
      /*  Auth  */
      auth: {
        login: '/auth/login/',
        logout: '/auth/logout/',
        refresh: '/auth/refresh/',
        acceptInvite: '/auth/accept-invite/',
        forgotPassword: '/auth/forgot-password/',
        resetPassword: '/auth/reset-password/',
        changePassword: '/auth/change-password/',
      },

      /*  Users  */
      users: {
        list: '/users/',
        detail: (id: string) => `/users/${id}/`,
        reinvite: (identifier: string) => `/users/${identifier}/reinvite/`,
      },

      /*  Roles  */
      roles: {
        list: '/roles/org-roles/',
      },

      /*  User Role Assignments  */
      userRoles: {
        list: '/user-roles/',
        detail: (id: string) => `/user-roles/${id}/`,
        assign: '/user-roles/',
        deleteRole: '/user-roles/delete-role/',
        updateRole: '/user-roles/update-role/',
      },

      /*  Organizations  */
      organizations: {
        list: '/organizations/',
        detail: (orgId: string) => `/organizations/${orgId}/`,
        analyticsOverview: (orgId: string) => `/organizations/${orgId}/analytics/overview/`,
        trainerList: (orgId: string) => `/organizations/${orgId}/trainer-list/`,
        teacherDashboard: (orgId: string, teacherId: string) => `/organizations/${orgId}/teacher-dashboard/${teacherId}/`,
        learnerProgress: (orgId: string) => `/organizations/${orgId}/learner-progress/`,
        learnerProgressDetails: (orgId: string, studentId: string) =>
          `/organizations/${orgId}/learner-progress/${studentId}/details/`,
        learnerProgressExport: (orgId: string, studentId: string) =>
          `/organizations/${orgId}/learner-progress/${studentId}/export/`,
        learnerProgressExportAll: (orgId: string) =>
          `/organizations/${orgId}/learner-progress/export/`,
        nodeSubmissionDetails: (orgId: string) =>
          `/organizations/${orgId}/node-submission-details/`,
        submissionsTaskReview: (orgId: string, submissionId: string | number) =>
          `/organizations/${orgId}/submissions/tasks/${submissionId}/review/`,
        pendingEvaluations: (orgId: string) => `/organizations/${orgId}/pending-evaluations/`,
        batchesOverview: (orgId: string) => `/organizations/${orgId}/batches-overview/`,

        /*  Batches (Branches)  */
        batches: {
          list: (orgId: string) => `/organizations/${orgId}/batches/`,
          detail: (orgId: string, batchId: string) =>
            `/organizations/${orgId}/batches/${batchId}/`,
        },

        /*  Courses  */
        courses: {
          list: (orgId: string) => `/organizations/${orgId}/courses/`,
          detail: (orgId: string, courseId: string | number) =>
            `/organizations/${orgId}/courses/${courseId}/`,
          modules: {
            list: (orgId: string, courseId: string | number) =>
              `/organizations/${orgId}/courses/${courseId}/modules/`,
            detail: (orgId: string, courseId: string | number, moduleId: string | number) =>
              `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/`,
            nodes: {
              list: (orgId: string, courseId: string | number, moduleId: string | number) =>
                `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/`,
              reorder: (orgId: string, courseId: string | number, moduleId: string | number) =>
                `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/reorder/`,
              detail: (
                orgId: string,
                courseId: string | number,
                moduleId: string | number,
                nodeId: string | number
              ) => `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/nodes/${nodeId}/`,
            },
            chapters: {
              list: (orgId: string, courseId: string | number, moduleId: string | number) =>
                `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/chapters/`,
              detail: (
                orgId: string,
                courseId: string | number,
                moduleId: string | number,
                chapterId: string | number
              ) => `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/`,
              reorder: (
                orgId: string,
                courseId: string | number,
                moduleId: string | number,
                chapterId: string | number
              ) => `/organizations/${orgId}/courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/nodes/reorder/`,
            },
          },
          roadmap: (orgId: string, courseId: string | number) =>
            `/organizations/${orgId}/courses/${courseId}/roadmap/`,
        },

        /* -- Modules (Levels) -> Nodes (Phases) -- */
        modules: {
          nodes: {
            list: (orgId: string, moduleId: string | number) =>
              `/organizations/${orgId}/modules/${moduleId}/nodes/`,
            detail: (orgId: string, moduleId: string | number, nodeId: string | number) =>
              `/organizations/${orgId}/modules/${moduleId}/nodes/${nodeId}/`,
          },
        },


        /* -- Students (under a batch) -- */
        students: {
          // All students in an organization
          orgList: (orgId: string) => `/organizations/${orgId}/students/`,
          orgDetail: (orgId: string, studentId: string) => `/organizations/${orgId}/students/${studentId}/`,
          list: (orgId: string, batchId: string) =>
            `/organizations/${orgId}/batches/${batchId}/students/`,
          detail: (orgId: string, batchId: string, studentId: string) =>
            `/organizations/${orgId}/batches/${batchId}/students/${studentId}/`,
          bulkUploadFile: (orgId: string, batchId: string) =>
            `/organizations/${orgId}/batches/${batchId}/students/bulk-upload-file/`,
          downloadTemplate: (orgId: string, batchId: string) =>
            `/organizations/${orgId}/batches/${batchId}/students/download-template/`,
          dashboard: (orgId: string) => `/organizations/${orgId}/students/me/dashboard/`,
        },

        /* -- Members -- */
        members: {
          list: (orgId: string) => `/organizations/${orgId}/members/`,
          detail: (orgId: string, memberId: string) =>
            `/organizations/${orgId}/members/${memberId}/`,
        },

        /* -- Staff -- */
        staff: {
          list: (orgId: string) => `/organizations/${orgId}/staff/`,
          detail: (orgId: string, staffId: string) =>
            `/organizations/${orgId}/staff/${staffId}/`,
          bulkUpload: (orgId: string) => `/organizations/${orgId}/staff/bulk-upload-file/`,
        },

        /* -- Student Specific -- */
        myCourses: (orgId: string) => `/organizations/${orgId}/my-courses/`,
        myProgress: (orgId: string) => `/organizations/${orgId}/my-progress/`,
      },

      /* -- Tenant (public, no auth) -- */
      tenant: (slug: string) => `/tenant/${slug}/`,

      /* -- Nodes -- */
      nodes: {
        complete: (nodeId: string | number) => `/nodes/${nodeId}/complete/`,
        submit: (nodeId: string | number) => `/nodes/${nodeId}/submit/`,
        allSubmissions: (nodeId: string | number) => `/nodes/${nodeId}/task/all-submissions/`,
        taskSubmissions: (nodeId: string | number) => `/nodes/${nodeId}/task/submit/`,
      },

      /* -- Quizzes -- */
      quizzes: {
        submit: (quizId: string | number) => `/quizzes/${quizId}/submit/`,
      },
    },
  },
}

export default config
