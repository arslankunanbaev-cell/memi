import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useAppStore } from '../../store/useAppStore.js'
import MomentDetail from '../MomentDetail.jsx'

const mockNavigate = vi.fn()
const mockGetMomentDetails = vi.fn()
const mockLocation = {
  state: {
    previewMoment: {
      id: 'moment-public',
      title: 'Preview Memory',
      created_at: '2024-02-01T10:00:00Z',
      photo_url: null,
    },
    forceFetch: true,
  },
}

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'moment-public' }),
}))

vi.mock('../../lib/api.js', () => ({
  deleteCapsuleSlot: vi.fn(),
  deleteMoment: vi.fn(),
  getMomentDetails: (...args) => mockGetMomentDetails(...args),
  saveCapsuleSlot: vi.fn(),
}))

describe('MomentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.state = {
      previewMoment: {
        id: 'moment-public',
        title: 'Preview Memory',
        created_at: '2024-02-01T10:00:00Z',
        photo_url: null,
      },
      forceFetch: true,
    }
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      moments: [],
      friends: [],
      capsule: [null, null, null, null],
    })
  })

  it('loads full public moment details when opened from a profile preview', async () => {
    mockGetMomentDetails.mockResolvedValue({
      id: 'moment-public',
      user_id: 'user-2',
      title: 'Full Memory',
      description: 'Full description',
      created_at: '2024-02-01T10:00:00Z',
      photo_url: null,
      people: [],
      taggedFriends: [],
    })

    render(<MomentDetail />)

    expect(screen.getByText('Preview Memory')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockGetMomentDetails).toHaveBeenCalledWith('moment-public')
    })

    expect(await screen.findByText('Full Memory')).toBeInTheDocument()
    expect(screen.getByText('Full description')).toBeInTheDocument()
  })
})
