import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/useAppStore.js'
import PublicProfile from '../PublicProfile.jsx'

const mockNavigate = vi.fn()
const mockGetUserProfile = vi.fn()

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ userId: 'user-2' }),
}))

vi.mock('../../lib/api.js', () => ({
  getUserProfile: (...args) => mockGetUserProfile(...args),
  linkPersonToUser: vi.fn(),
  removeFriend: vi.fn(),
  sendFriendRequest: vi.fn(),
}))

function renderPublicProfile() {
  return render(<PublicProfile />)
}

describe('PublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [],
      people: [],
    })
  })

  it('shows a closed state when the public profile is disabled', async () => {
    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: false,
        bio: 'Hidden bio',
        featured_moment_id: 'm1',
      },
      moments: [
        { id: 'm1', title: 'Open Memory', created_at: '2024-02-01T00:00:00Z', photo_url: null },
      ],
      total: 1,
    })

    renderPublicProfile()

    expect(await screen.findByText('Профиль закрыт')).toBeInTheDocument()
    expect(screen.queryByText('Hidden bio')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Memory')).not.toBeInTheDocument()
  })

  it('shows bio and featured moment when the public profile is enabled', async () => {
    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: 'Warm bio',
        featured_moment_id: 'm1',
      },
      moments: [
        { id: 'm1', title: 'Featured Memory', created_at: '2024-02-01T00:00:00Z', photo_url: null },
        { id: 'm2', title: 'Another Memory', created_at: '2024-03-01T00:00:00Z', photo_url: null },
      ],
      total: 2,
    })

    renderPublicProfile()

    expect(await screen.findByText('Warm bio')).toBeInTheDocument()
    expect(screen.getAllByText('Главное воспоминание').length).toBeGreaterThan(0)
    expect(screen.getByText('Featured Memory')).toBeInTheDocument()
    expect(screen.getByText('Another Memory')).toBeInTheDocument()
  })
})
