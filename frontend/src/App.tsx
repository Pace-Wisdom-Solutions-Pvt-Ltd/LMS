// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TenantProvider } from '@/context/TenantContext'
import ToastContainer from '@/components/ui/Toast'
import ThemeManager from '@/components/ThemeManager'
import ProtectedRoute from '@/features/auth/ProtectedRoute'
import Login from '@/features/auth/pages/Login'
import ForgotPassword from '@/features/auth/pages/ForgotPassword'
import ResetPassword from '@/features/auth/pages/ResetPassword'
import SetPassword from '@/features/auth/pages/SetPassword'
import InstituteAdminLayout from '@/layouts/InstituteAdminLayout'
import InstructorLayout from '@/layouts/InstructorLayout'
import StudentLayout from '@/layouts/StudentLayout'
import BatchDetail from '@/features/institute-admin/batches/BatchDetail'
import InstituteAdminDashboard from '@/features/institute-admin/dashboard/Dashboard'
import InstituteAdminManageUsers from '@/features/institute-admin/people/ManageUsers'
import InstituteAdminBatches from '@/features/institute-admin/batches/Batches'
import InstituteAdminCourseProgress from '@/features/institute-admin/courses/CourseProgress'
import InstituteAdminContent from '@/features/institute-admin/content/Content'
import InstituteAdminCourseBuilder from '@/features/institute-admin/course-builder/CourseBuilder'
import InstructorHome from '@/features/instructor/dashboard/Home'
import InstructorAssignedCourses from '@/features/instructor/courses/AssignedCourses'
import InstructorLearnerProgress from '@/features/instructor/progress/LearnerProgress'
import InstructorStudents from '@/features/instructor/students/Students'
import CourseDetail from '@/features/instructor/courses/CourseDetail'
import CreateTask from '@/features/instructor/modals/CreateTask'
import StudentHome from '@/features/student/dashboard/Home'
import StudentMyCourses from '@/features/student/courses/MyCourses'
import StudentProgress from '@/features/student/progress/Progress'
import Profile from '@/features/shared/Profile'
import ChangePassword from '@/features/shared/ChangePassword'

function App() {
  return (
    <TenantProvider>
      <ToastContainer />
      <BrowserRouter>
      <ThemeManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route
          path="/org-admin"
          element={
            <ProtectedRoute allowedRoles={['institute_admin']}>
              <InstituteAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/org-admin/home" replace />} />
          <Route path="home" element={<InstituteAdminDashboard />} />
          <Route path="academic-setup" element={<Navigate to="/org-admin/home" replace />} />
          <Route path="users" element={<InstituteAdminManageUsers />} />
          {/* Legacy paths — redirect to the merged Manage Users screen. */}
          <Route path="teachers" element={<Navigate to="/org-admin/users" replace />} />
          <Route path="students" element={<Navigate to="/org-admin/users?tab=students" replace />} />
          <Route path="batches" element={<InstituteAdminBatches />} />
          <Route path="batches/:batchId" element={<BatchDetail />} />
          <Route path="course-progress" element={<InstituteAdminCourseProgress />} />
          <Route path="reporting" element={<Navigate to="/org-admin/home" replace />} />
          <Route path="content" element={<InstituteAdminContent />} />
          <Route path="content/new" element={<InstituteAdminCourseBuilder />} />
          <Route path="content/:courseId" element={<InstituteAdminCourseBuilder />} />
          <Route path="notifications" element={<Navigate to="/org-admin/home" replace />} />
          <Route path="audit-logs" element={<Navigate to="/org-admin/home" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="account-settings" element={<Navigate to="/org-admin/home" replace />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        <Route
          path="/trainer"
          element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <InstructorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/trainer/home" replace />} />
          <Route path="home" element={<InstructorHome />} />
          <Route path="courses" element={<InstructorAssignedCourses />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="courses/:courseId/create-task" element={<CreateTask />} />
          <Route path="learners" element={<InstructorLearnerProgress />} />
          <Route path="engage" element={<Navigate to="/trainer/home" replace />} />
          <Route path="reports" element={<Navigate to="/trainer/home" replace />} />
          <Route path="notifications" element={<Navigate to="/trainer/home" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="interns" element={<InstructorStudents />} />
          <Route path="projects" element={<Navigate to="/trainer/courses" replace />} />
          <Route path="projects/:courseId" element={<CourseDetail />} />
          <Route path="projects/:courseId/create-task" element={<CreateTask />} />
          <Route path="submissions" element={<Navigate to="/trainer/home" replace />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/home" replace />} />
          <Route path="home" element={<StudentHome />} />
          <Route path="my-courses" element={<StudentMyCourses />} />
          <Route path="my-courses/:courseId" element={<StudentMyCourses />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="engage" element={<Navigate to="/student/home" replace />} />
          <Route path="notifications" element={<Navigate to="/student/home" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </TenantProvider>
  )
}

export default App
