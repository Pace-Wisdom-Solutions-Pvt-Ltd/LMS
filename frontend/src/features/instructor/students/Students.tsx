// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { getStudents } from '../store'
import CreateStudentModal from '../modals/CreateStudentModal'

export default function Students() {
  const [students, setStudents] = useState(getStudents())
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = () => setStudents(getStudents())

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-teal" />
            My Students
          </h2>
          <p className="text-sm text-slate-500 mt-1">List and monitor students</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 transition-opacity shrink-0 active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" />
          Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-slate-200 bg-slate-50/50">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">No students yet</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90"
          >
            Add your first student
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student, i) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-teal/20 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal font-semibold">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-slate-500">{student.email}</p>
                  {student.employeeId && (
                    <p className="text-xs text-slate-400">
                      {student.employeeId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateStudentModal
          onClose={() => setCreateOpen(false)}
          onCreated={refresh}
        />
      )}
    </div>
  )
}
