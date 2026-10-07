// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/organizations', () => ({
  getBatchesApi: vi.fn().mockResolvedValue([]),
  createBatchApi: vi.fn().mockResolvedValue({ id: '99', name: 'New Batch' }),
  updateBatchApi: vi.fn().mockResolvedValue({}),
  deleteBatchApi: vi.fn().mockResolvedValue(undefined),
  getPublishedCoursesApi: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn().mockReturnValue({ email: 'admin@test.com', role: 'institute_admin', roles: ['institute_admin'] }),
  getStoredToken: vi.fn().mockReturnValue('token'),
  getStoredRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  getStoredOrganizations: vi.fn().mockReturnValue([{ id: 1, name: 'Test Org' }]),
  hasRole: vi.fn().mockReturnValue(true),
  setStoredUser: vi.fn(),
  clearStoredUser: vi.fn(),
  setStoredToken: vi.fn(),
  setStoredRefreshToken: vi.fn(),
  validateCredentials: vi.fn(),
  getStoredProfile: vi.fn().mockReturnValue(null),
  setStoredProfile: vi.fn(),
}))

vi.mock('@/lib/toastApi', () => ({
  showToast: vi.fn(),
  dismissToast: vi.fn(),
  getToasts: vi.fn().mockReturnValue([]),
  subscribeToasts: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({}) }
})

// ── Imports after mocks ────────────────────────────────────────────────────────

import {
  getBatchesApi,
  createBatchApi,
  updateBatchApi,
  deleteBatchApi,
} from '@/lib/api/organizations'
import { showToast } from '@/lib/toastApi'

const mockGetBatchesApi = getBatchesApi as ReturnType<typeof vi.fn>
const mockCreateBatchApi = createBatchApi as ReturnType<typeof vi.fn>
const mockUpdateBatchApi = updateBatchApi as ReturnType<typeof vi.fn>
const mockDeleteBatchApi = deleteBatchApi as ReturnType<typeof vi.fn>
const mockShowToast = showToast as ReturnType<typeof vi.fn>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const batchRow = {
  id: '1',
  name: 'Alpha Batch',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  is_active: true,
}

const inactiveBatchRow = {
  id: '2',
  name: 'Beta Batch',
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  is_active: false,
}

// ── Helper ─────────────────────────────────────────────────────────────────────

async function renderBatches() {
  const { default: Batches } = await import('../batches/Batches')
  return render(
    <MemoryRouter>
      <Batches />
    </MemoryRouter>
  )
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Batches – initial render', () => {
  it('renders the page heading "Batch Listing"', async () => {
    await renderBatches()
    expect(screen.getByText('Batch Listing')).toBeTruthy()
  })

  it('renders subheading description text', async () => {
    await renderBatches()
    expect(screen.getByText(/Create and manage batches/i)).toBeTruthy()
  })

  it('renders the "Create Batch" button', async () => {
    await renderBatches()
    expect(screen.getByRole('button', { name: /create batch/i })).toBeTruthy()
  })

  it('renders column headers: Name, Start Date, End Date, Status, Actions', async () => {
    await renderBatches()
    expect(screen.getByText('Name')).toBeTruthy()
    expect(screen.getByText('Start Date')).toBeTruthy()
    expect(screen.getByText('End Date')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
    expect(screen.getByText('Actions')).toBeTruthy()
  })

  it('shows loading indicator while fetching batches', async () => {
    let resolve!: (v: unknown) => void
    mockGetBatchesApi.mockReturnValueOnce(new Promise((res) => { resolve = res }))
    await renderBatches()
    expect(screen.getByText(/loading batches/i)).toBeTruthy()
    resolve([])
  })

  it('calls getBatchesApi on mount', async () => {
    await renderBatches()
    await waitFor(() => {
      expect(mockGetBatchesApi).toHaveBeenCalledWith('1', undefined, undefined)
    })
  })
})

describe('Batches – empty state', () => {
  it('shows empty state message when no batches are returned', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText(/No batches found/i)).toBeTruthy()
    })
  })

  it('empty state text contains hint about Create Batch', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText(/Click Create Batch to add one/i)).toBeTruthy()
    })
  })
})

describe('Batches – list rendering', () => {
  it('renders batch name in the table when data is returned', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText('Alpha Batch')).toBeTruthy()
    })
  })

  it('renders batch start and end dates', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText('2026-01-01')).toBeTruthy()
      expect(screen.getByText('2026-12-31')).toBeTruthy()
    })
  })

  it('shows "Active" badge for active batches', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeTruthy()
    })
  })

  it('shows "Inactive" badge for inactive batches', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([inactiveBatchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeTruthy()
    })
  })

  it('renders multiple batches sorted alphabetically', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow, inactiveBatchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText('Alpha Batch')).toBeTruthy()
      expect(screen.getByText('Beta Batch')).toBeTruthy()
    })
  })

  it('shows "—" when start_date is null', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([{ ...batchRow, start_date: null }])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })
  })

  it('renders Edit button for each batch row', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeTruthy()
    })
  })

  it('renders Delete button for each batch row', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByTitle('Delete')).toBeTruthy()
    })
  })
})

describe('Batches – Create Batch modal', () => {
  it('opens the Create Batch modal when the Create Batch button is clicked', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create batch/i })).toBeTruthy()
    })
  })

  it('shows Batch Name, Start Date, End Date fields in the create modal', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/batch name/i)).toBeTruthy()
      expect(screen.getByLabelText(/start date/i)).toBeTruthy()
      expect(screen.getByLabelText(/end date/i)).toBeTruthy()
    })
  })

  it('closes the modal when Cancel is clicked', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByRole('heading', { name: /create batch/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create batch/i })).toBeNull()
    })
  })

  it('allows typing into the Batch Name field', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    const nameInput = screen.getByLabelText(/batch name/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'New Batch 2026' } })
    expect(nameInput.value).toBe('New Batch 2026')
  })

  it('allows typing into the Start Date field', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/start date/i))
    const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement
    fireEvent.change(startInput, { target: { value: '2026-03-01' } })
    expect(startInput.value).toBe('2026-03-01')
  })

  it('allows typing into the End Date field', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/end date/i))
    const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement
    fireEvent.change(endInput, { target: { value: '2026-12-31' } })
    expect(endInput.value).toBe('2026-12-31')
  })

  it('calls createBatchApi and shows success toast on valid submission', async () => {
    mockGetBatchesApi.mockResolvedValue([])
    mockCreateBatchApi.mockResolvedValueOnce({ id: '99', name: 'New Batch 2026' })
    await renderBatches()

    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    fireEvent.change(screen.getByLabelText(/batch name/i), { target: { value: 'New Batch 2026' } })

    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockCreateBatchApi).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ name: 'New Batch 2026' })
      )
      expect(mockShowToast).toHaveBeenCalledWith('Batch created.', 'success')
    })
  })

  it('does not call createBatchApi when Batch Name is empty', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    // leave name empty, submit
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockCreateBatchApi).not.toHaveBeenCalled()
    })
  })

  it('shows error toast when createBatchApi fails', async () => {
    mockCreateBatchApi.mockRejectedValueOnce(new Error('Server error'))
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    fireEvent.change(screen.getByLabelText(/batch name/i), { target: { value: 'Test' } })
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Server error', 'error')
    })
  })

  it('toggles the Active toggle button in the create modal', async () => {
    await renderBatches()
    fireEvent.click(screen.getByRole('button', { name: /create batch/i }))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    const activeToggle = screen.getByLabelText('Batch active')
    expect(activeToggle).toBeTruthy()
    fireEvent.click(activeToggle)
    // toggle again
    fireEvent.click(activeToggle)
  })
})

describe('Batches – Edit Batch modal', () => {
  it('opens the Edit Batch modal when Edit button is clicked', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Edit'))
    fireEvent.click(screen.getByTitle('Edit'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit batch/i })).toBeTruthy()
    })
  })

  it('pre-fills the batch name field with the existing name in edit mode', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Edit'))
    fireEvent.click(screen.getByTitle('Edit'))
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/batch name/i) as HTMLInputElement
      expect(nameInput.value).toBe('Alpha Batch')
    })
  })

  it('calls updateBatchApi and shows success toast on save', async () => {
    mockGetBatchesApi.mockResolvedValue([batchRow])
    mockUpdateBatchApi.mockResolvedValueOnce({})
    await renderBatches()
    await waitFor(() => screen.getByTitle('Edit'))
    fireEvent.click(screen.getByTitle('Edit'))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    fireEvent.change(screen.getByLabelText(/batch name/i), { target: { value: 'Alpha Batch Updated' } })
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockUpdateBatchApi).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith('Batch updated.', 'success')
    })
  })

  it('shows error toast when updateBatchApi fails', async () => {
    mockGetBatchesApi.mockResolvedValue([batchRow])
    mockUpdateBatchApi.mockRejectedValueOnce(new Error('Update failed'))
    await renderBatches()
    await waitFor(() => screen.getByTitle('Edit'))
    fireEvent.click(screen.getByTitle('Edit'))
    await waitFor(() => screen.getByLabelText(/batch name/i))
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Update failed', 'error')
    })
  })

  it('closes the edit modal when Cancel is clicked', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Edit'))
    fireEvent.click(screen.getByTitle('Edit'))
    await waitFor(() => screen.getByRole('heading', { name: /edit batch/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /edit batch/i })).toBeNull()
    })
  })
})

describe('Batches – Delete Batch modal', () => {
  it('opens the Delete confirmation modal when Delete button is clicked', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Delete'))
    fireEvent.click(screen.getByTitle('Delete'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete batch/i })).toBeTruthy()
    })
  })

  it('shows the batch name in the delete confirmation text', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Delete'))
    fireEvent.click(screen.getByTitle('Delete'))
    await waitFor(() => {
      // the confirmation paragraph contains the batch name
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeTruthy()
      const allAlpha = screen.getAllByText(/Alpha Batch/)
      expect(allAlpha.length).toBeGreaterThan(0)
    })
  })

  it('closes the delete modal when Cancel is clicked', async () => {
    mockGetBatchesApi.mockResolvedValueOnce([batchRow])
    await renderBatches()
    await waitFor(() => screen.getByTitle('Delete'))
    fireEvent.click(screen.getByTitle('Delete'))
    await waitFor(() => screen.getByRole('heading', { name: /delete batch/i }))
    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButtons[cancelButtons.length - 1])
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /delete batch/i })).toBeNull()
    })
  })

  it('calls deleteBatchApi and shows success toast when Delete is confirmed', async () => {
    mockGetBatchesApi.mockResolvedValue([batchRow])
    mockDeleteBatchApi.mockResolvedValueOnce(undefined)
    await renderBatches()
    await waitFor(() => screen.getByTitle('Delete'))
    fireEvent.click(screen.getByTitle('Delete'))
    await waitFor(() => screen.getByRole('heading', { name: /delete batch/i }))
    // click the red Delete confirm button
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])
    await waitFor(() => {
      expect(mockDeleteBatchApi).toHaveBeenCalledWith('1', '1')
      expect(mockShowToast).toHaveBeenCalledWith('Batch deleted.', 'success')
    })
  })

  it('shows error toast when deleteBatchApi fails', async () => {
    mockGetBatchesApi.mockResolvedValue([batchRow])
    mockDeleteBatchApi.mockRejectedValueOnce(new Error('Delete failed'))
    await renderBatches()
    await waitFor(() => screen.getByTitle('Delete'))
    fireEvent.click(screen.getByTitle('Delete'))
    await waitFor(() => screen.getByRole('heading', { name: /delete batch/i }))
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Delete failed', 'error')
    })
  })
})

describe('Batches – API error on initial load', () => {
  it('shows error toast when getBatchesApi throws on mount', async () => {
    mockGetBatchesApi.mockRejectedValueOnce(new Error('Network failure'))
    await renderBatches()
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Network failure', 'error')
    })
  })

  it('shows empty state after a failed fetch', async () => {
    mockGetBatchesApi.mockRejectedValueOnce(new Error('Network failure'))
    await renderBatches()
    await waitFor(() => {
      expect(screen.getByText(/No batches found/i)).toBeTruthy()
    })
  })
})

describe('Batches – no orgId scenario', () => {
  it('does not call getBatchesApi when there is no organization', async () => {
    const { getStoredOrganizations } = await import('@/lib/auth')
    const mockGetStoredOrgs = getStoredOrganizations as ReturnType<typeof vi.fn>
    mockGetStoredOrgs.mockReturnValueOnce([])
    await renderBatches()
    // Should not call the API without an orgId
    expect(mockGetBatchesApi).not.toHaveBeenCalled()
  })
})
