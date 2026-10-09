// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { apiGet } from './client'
import config from '@/config'

export interface ApiCertificate {
  id: number
  certificate_id: string
  certificate_type: 'Course' | 'Assessment'
  issued_at: string
  course: {
    id: number
    title: string
    description?: string
  }
  student: {
    id: string
    email: string
    first_name: string
    last_name: string
    full_name: string
  }
  organization: {
    id: number
    name: string
    slug: string
    logo: string | null
    logo_url: string | null
  }
  template?: {
    id?: number
    name?: string
    title?: string
    subtitle?: string
    completion_text?: string
    signatory_title?: string
    signatory_name?: string
  }
  html_content?: string
  download_url?: string
  preview_url?: string
}

export function getCertificateDownloadUrl(certificateId: string): string {
  return `${config.api.baseUrl}/certificates/${certificateId}/download/`
}

export function getCertificatePreviewUrl(certificateId: string): string {
  return `${config.api.baseUrl}/certificates/${certificateId}/html/`
}

export async function getCertificatesApi(
  orgId: string,
  type?: string
): Promise<ApiCertificate[]> {
  const base = config.api.endpoints.organizations.certificates.list(orgId)
  const url = type ? `${base}?type=${encodeURIComponent(type)}` : base
  return apiGet<ApiCertificate[]>(url)
}

export async function getUserCertificatesApi(
  userUuid: string,
  orgId?: string
): Promise<ApiCertificate[]> {
  const base = config.api.endpoints.users.certificates(userUuid)
  const url = orgId ? `${base}?org_id=${encodeURIComponent(orgId)}` : base
  return apiGet<ApiCertificate[]>(url)
}

export async function getCourseCertificateApi(
  orgId: string,
  courseId: string | number
): Promise<ApiCertificate> {
  const url = config.api.endpoints.organizations.certificates.courseCertificate(orgId, courseId)
  return apiGet<ApiCertificate>(url)
}
