// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Users,
  TrendingUp,
  ClipboardCheck,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import { getTeacherDashboardApi, type ApiTeacherDashboard } from '@/lib/api/organizations'
import { getStoredUser, getStoredOrganizations } from '@/lib/auth'

export default function InstructorHome() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const [dashboardData, setDashboardData] = useState<ApiTeacherDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const orgs = getStoredOrganizations()
  const orgId = orgs[0]?.id?.toString()

  const pendingGrading = dashboardData?.pending_evaluations_count ?? 0

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!orgId || !user?.id) {
        setIsLoading(false)
        return
      }
      try {
        const data = await getTeacherDashboardApi(orgId, user.id)
        setDashboardData(data)
      } catch (err) {
        console.error('Failed to fetch teacher dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [orgId, user?.id])

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Trainer Dashboard</h1>
        <p className="text-slate-600 mt-1">Personal snapshot of your training responsibilities</p>
      </div>

      {/* Metrics widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <button
          type="button"
          onClick={() => navigate('/trainer/learners')}
          className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-brand-green" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.student_count ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Student Count</p>
        </button>
        <div className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-brand-blue" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.batch_count ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Batch Count</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/trainer/courses')}
          className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-brand-teal" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.course_count ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Course Count</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/trainer/assessments')}
          className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left relative"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.pending_evaluations_count ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Pending Evaluations Count</p>
          {(dashboardData?.pending_evaluations_count ?? 0) > 0 && (
            <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {dashboardData?.pending_evaluations_count}
            </span>
          )}
        </button>
        <div className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-brand-lavender/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-brand-lavender" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.average_completion_percentage ?? 0)}%
          </p>
          <p className="text-sm text-slate-500">Average Completion Percentage</p>
        </div>
        <div className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
          <div className="h-10 w-10 rounded-xl bg-brand-orange/10 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-brand-orange" />
          </div>
          <p className="text-xl font-bold text-slate-800">
            {isLoading ? '...' : (dashboardData?.recent_submissions?.length ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Recent Submissions</p>
        </div>
      </div>

      {/* Select primary task */}
      <div className="mb-6">
        <h3 className="font-semibold text-slate-800 mb-3">Select primary task</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/trainer/courses')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-brand-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-brand-teal" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Prepare / Update Content</p>
              <p className="text-sm text-slate-500">Assigned courses</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/trainer/learners')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-brand-green/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-brand-green" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Student Interaction</p>
              <p className="text-sm text-slate-500">Progress & feedback</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/trainer/assessments')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-brand-orange/10 flex items-center justify-center group-hover:scale-110 transition-transform relative">
              <ClipboardCheck className="h-6 w-6 text-brand-orange" />
              {pendingGrading > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                  {pendingGrading}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-800">Grade Assessments</p>
              <p className="text-sm text-slate-500">{pendingGrading} pending review</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/trainer/profile')}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-teal/30 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">My Profile</p>
              <p className="text-sm text-slate-500">Update name, avatar, change password</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  )
}
