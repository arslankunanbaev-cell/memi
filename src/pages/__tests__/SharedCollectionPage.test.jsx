import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import SharedCollectionPage from '../SharedCollectionPage.jsx'

vi.mock('../../lib/api.js', () => ({
  addMomentToCollection: vi.fn(),
  deleteCollection: vi.fn(),
  getCollectionDetails: vi.fn(async () => ({
    id: 'c1',
    name: 'Trip',
    created_by: 'u1',
    invite_code: 'invite',
    cover_url: null,
    members: [{ user_id: 'u1', role: 'owner', user: { id: 'u1', name: 'Arslan' } }],
    moments: [],
  })),
  leaveCollection: vi.fn(),
  removeMomentFromCollection: vi.fn(),
  updateCollectionCover: vi.fn(),
  uploadPhoto: vi.fn(),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {},
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/shared-collection/c1']}>
      <Routes>
        <Route path="/shared-collection/:id" element={<SharedCollectionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SharedCollectionPage', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan' },
      moments: [],
      collections: [{ id: 'c1', name: 'Trip', momentCount: 0, memberCount: 1 }],
    })
  })

  it('renders an empty collection without crashing', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Trip')).toBeInTheDocument())
    expect(screen.getByText('Добавить момент')).toBeInTheDocument()
  })
})
