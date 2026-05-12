import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('opens profiles only from chips linked to real Telegram users', async () => {
    mockLocation.state = {}
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      moments: [{
        id: 'moment-public',
        user_id: 'user-1',
        title: 'People Memory',
        created_at: '2024-02-01T10:00:00Z',
        photo_url: null,
        people: [
          { id: 'person-1', name: 'Mila', linked_user_id: 'user-2', photo_url: null },
          { id: 'person-2', name: 'Local Person', linked_user_id: null, photo_url: null },
        ],
        taggedFriends: [
          { id: 'user-3', name: 'Tagged Friend', photo_url: null },
        ],
      }],
      friends: [{ id: 'user-2', name: 'Mila Friend', photo_url: null }],
      capsule: [null, null, null, null],
    })

    const user = userEvent.setup()

    render(<MomentDetail />)

    await user.click(screen.getByRole('button', { name: 'Открыть профиль Mila Friend' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/user-2', undefined)

    await user.click(screen.getByRole('button', { name: 'Открыть профиль Tagged Friend' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/user-3', undefined)

    expect(screen.getByText('Local Person').closest('button')).toBeNull()
  })

  it('navigates back from a left-edge swipe', () => {
    mockLocation.state = {}
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      moments: [{
        id: 'moment-public',
        user_id: 'user-1',
        title: 'Swipe Memory',
        created_at: '2024-02-01T10:00:00Z',
        photo_url: null,
        people: [],
        taggedFriends: [],
      }],
      friends: [],
      capsule: [null, null, null, null],
    })

    const { container } = render(<MomentDetail />)
    const page = container.firstChild

    fireEvent.touchStart(page, { touches: [{ clientX: 12, clientY: 220 }] })
    fireEvent.touchMove(page, { touches: [{ clientX: 64, clientY: 226 }] })
    fireEvent.touchEnd(page, { changedTouches: [{ clientX: 112, clientY: 228 }] })

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})
