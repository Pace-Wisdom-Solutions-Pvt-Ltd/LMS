// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { addStudent } from '../store'

interface CreateStudentModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateStudentModal({
  onClose,
  onCreated,
}: CreateStudentModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    addStudent({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      employeeId: employeeId.trim() || undefined,
    })
    onCreated()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pr-8">
          Add Student
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="stu-first-name" className="block text-sm font-medium text-slate-700 mb-1">
                First name
              </label>
              <input
                id="stu-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="stu-last-name" className="block text-sm font-medium text-slate-700 mb-1">
                Last name
              </label>
              <input
                id="stu-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="stu-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="stu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="stu-emp-id" className="block text-sm font-medium text-slate-700 mb-1">
              Employee ID (optional)
            </label>
            <input
              id="stu-emp-id"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP001"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal outline-none transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-teal text-white font-medium hover:opacity-90 transition-opacity active:scale-[0.99]"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
