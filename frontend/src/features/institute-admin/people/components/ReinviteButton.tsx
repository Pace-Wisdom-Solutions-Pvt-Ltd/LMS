// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { Loader2, MailCheck } from 'lucide-react'

/**
 * "Reinvite" action shown in a user's details modal when their invite has
 * expired. Shared by the trainer and student details modals.
 */
export default function ReinviteButton({
  onReinvite,
  reinviting,
}: Readonly<{ onReinvite: () => void; reinviting: boolean }>) {
  return (
    <button
      type="button"
      onClick={onReinvite}
      disabled={reinviting}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
    >
      {reinviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
      {reinviting ? 'Sending…' : 'Reinvite'}
    </button>
  )
}
