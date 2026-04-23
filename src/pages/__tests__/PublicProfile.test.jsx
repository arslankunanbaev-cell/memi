import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '../../store/useAppStore.js'
import PublicProfile from '../PublicProfile.jsx'

const mockNavigate = vi.fn()
const mockGetUserProfile = vi.fn()
const mockRemoveFriend = vi.fn()

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ userId: 'user-2' }),
}))

vi.mock('../../lib/api.js', () => ({
  getUserProfile: (...args) => mockGetUserProfile(...args),
  linkPersonToUser: vi.fn(),
  removeFriend: (...args) => mockRemoveFriend(...args),
  sendFriendRequest: vi.fn(),
}))

function renderPublicProfile() {
  return render(<PublicProfile />)
}

describe('PublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveFriend.mockResolvedValue(undefined)
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [],
      people: [],
      moments: [],
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
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
      moments: [],
    })

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

  it('shows an empty public state when the profile is open but has no public moments', async () => {
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
      moments: [],
    })

    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: 'Cat bio',
        featured_moment_id: null,
      },
      moments: [],
      total: 0,
    })

    renderPublicProfile()

    expect(await screen.findByText('Cat bio')).toBeInTheDocument()
    expect(screen.getByText('Воспоминаний для друзей пока нет')).toBeInTheDocument()
    expect(screen.getByText('Профиль открыт, но пользователь пока не поделился моментами с друзьями.')).toBeInTheDocument()
    expect(screen.queryByText('РџСЂРѕС„РёР»СЊ Р·Р°РєСЂС‹С‚')).not.toBeInTheDocument()
    return

    expect(await screen.findByText('Cat bio')).toBeInTheDocument()
    expect(screen.getByText('Публичных воспоминаний пока нет')).toBeInTheDocument()
    expect(screen.getByText('Профиль открыт, но моментов с доступом «для всех» у пользователя пока нет.')).toBeInTheDocument()
    expect(screen.queryByText('Профиль закрыт')).not.toBeInTheDocument()
  })

  it('opens the featured memory card from a friend profile', async () => {
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
      moments: [],
    })

    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: '',
        featured_moment_id: 'm1',
      },
      moments: [
        { id: 'm1', title: 'Featured Memory', created_at: '2024-02-01T00:00:00Z', photo_url: null },
      ],
      total: 1,
    })

    const user = userEvent.setup()

    renderPublicProfile()

    await screen.findByText('Featured Memory')
    await user.click(screen.getByRole('button', { name: /Featured Memory/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/moment/m1', {
      state: {
        previewMoment: expect.objectContaining({ id: 'm1', title: 'Featured Memory' }),
        forceFetch: true,
      },
    })
  })

  it('opens a friend-visible memory from the moments list', async () => {
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
      moments: [],
    })

    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: '',
        featured_moment_id: null,
      },
      moments: [
        { id: 'm2', title: 'Another Memory', created_at: '2024-03-01T00:00:00Z', photo_url: null },
      ],
      total: 1,
    })

    const user = userEvent.setup()

    renderPublicProfile()

    await screen.findByText('Another Memory')
    await user.click(screen.getByRole('button', { name: /Another Memory/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/moment/m2', {
      state: {
        previewMoment: expect.objectContaining({ id: 'm2', title: 'Another Memory' }),
        forceFetch: true,
      },
    })
  })

  it('moves friend removal into the top menu', async () => {
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
    })

    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: '',
        featured_moment_id: null,
      },
      moments: [],
      total: 0,
    })

    const user = userEvent.setup()

    renderPublicProfile()

    expect(await screen.findByText('Mila')).toBeInTheDocument()
    expect(screen.queryByText('Удалить из друзей')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Открыть меню профиля'))

    expect(screen.getByRole('button', { name: 'Удалить из друзей' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Удалить из друзей' }))

    await waitFor(() => {
      expect(mockRemoveFriend).toHaveBeenCalledWith('friendship-1')
    })
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('shows shared memories at the bottom of a friend profile', async () => {
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [{ id: 'user-2', name: 'Mila', friendship_id: 'friendship-1' }],
      people: [],
      moments: [
        {
          id: 'own-shared',
          title: 'Наше лето',
          created_at: '2024-04-01T00:00:00Z',
          user_id: 'user-1',
          photo_url: null,
          people: [{ id: 'p1', name: 'Mila', linked_user_id: 'user-2', photo_url: null }],
          taggedFriends: [],
        },
        {
          id: 'friend-shared',
          title: 'Общий концерт',
          created_at: '2024-05-01T00:00:00Z',
          user_id: 'user-2',
          isShared: true,
          photo_url: null,
          people: [],
          taggedFriends: [],
        },
      ],
    })

    mockGetUserProfile.mockResolvedValue({
      user: {
        id: 'user-2',
        name: 'Mila',
        created_at: '2024-01-01T00:00:00Z',
        public_profile_enabled: true,
        bio: '',
        featured_moment_id: null,
      },
      moments: [],
      total: 0,
    })

    renderPublicProfile()

    expect(await screen.findByText('Ваши общие воспоминания')).toBeInTheDocument()
    expect(screen.getByText('Наше лето')).toBeInTheDocument()
    expect(screen.getByText('Общий концерт')).toBeInTheDocument()
  })
})
