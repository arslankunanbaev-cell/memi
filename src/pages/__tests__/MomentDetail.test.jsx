import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '../../store/useAppStore.js'
import MomentDetail from '../MomentDetail.jsx'

const mockNavigate = vi.fn()
const mockGetMomentDetails = vi.fn()
const mockGetMomentReactions = vi.fn()
const mockUpsertMomentReaction = vi.fn()
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
  getMomentReactions: (...args) => mockGetMomentReactions(...args),
  saveCapsuleSlot: vi.fn(),
  upsertMomentReaction: (...args) => mockUpsertMomentReaction(...args),
}))

describe('MomentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMomentReactions.mockResolvedValue([])
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

  it('renders reactions and updates the current user selection', async () => {
    mockLocation.state = {}
    mockGetMomentReactions.mockResolvedValue([
      {
        id: 'reaction-1',
        moment_id: 'moment-public',
        user_id: 'user-3',
        emoji: '🔥',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
    ])
    mockUpsertMomentReaction.mockResolvedValue({
      reaction: {
        id: 'reaction-2',
        moment_id: 'moment-public',
        user_id: 'user-1',
        emoji: '🔥',
        created_at: '2026-04-23T10:05:00.000Z',
        updated_at: '2026-04-23T10:05:00.000Z',
      },
      isNew: true,
    })

    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      moments: [{
        id: 'moment-public',
        user_id: 'user-2',
        title: 'Stored Memory',
        created_at: '2024-02-01T10:00:00Z',
        photo_url: null,
        people: [],
        taggedFriends: [],
      }],
      friends: [],
      capsule: [null, null, null, null],
    })

    render(<MomentDetail />)

    await waitFor(() => {
      expect(mockGetMomentReactions).toHaveBeenCalledWith('moment-public')
    })

    const fireReaction = await screen.findByRole('button', { name: 'Реакция 🔥' })
    expect(fireReaction).toHaveTextContent('1')

    await userEvent.click(fireReaction)

    expect(mockUpsertMomentReaction).toHaveBeenCalledWith({
      momentId: 'moment-public',
      userId: 'user-1',
      emoji: '🔥',
      momentOwnerId: 'user-2',
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Реакция 🔥' })).toHaveAttribute('aria-pressed', 'true')
    })

    expect(screen.getByRole('button', { name: 'Реакция 🔥' })).toHaveTextContent('2')
  })
})
