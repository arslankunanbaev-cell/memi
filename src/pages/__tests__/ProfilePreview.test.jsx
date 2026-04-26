import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import ProfilePreview from '../ProfilePreview.jsx'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

vi.mock('../../lib/api.js', () => ({
  updatePublicProfile: vi.fn().mockImplementation(async (_userId, payload) => ({
    id: 'u1',
    name: 'Arslan',
    created_at: '2024-01-15T00:00:00Z',
    public_profile_enabled: payload.publicProfileEnabled ?? false,
    bio: payload.bio?.trim() || null,
    featured_moment_id: payload.featuredMomentId ?? null,
  })),
}))

function renderPreview() {
  return render(
    <MemoryRouter>
      <ProfilePreview />
    </MemoryRouter>,
  )
}

describe('ProfilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan', created_at: '2024-01-15T00:00:00Z' },
      moments: [],
      friends: [],
      isPremium: false,
    })
  })

  it('renders the preview screen container', () => {
    renderPreview()
    expect(screen.getByTestId('profile-preview-screen')).toBeInTheDocument()
  })

  it('shows the visibility toggle', () => {
    renderPreview()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('shows the more button', () => {
    renderPreview()
    expect(screen.getByTestId('public-profile-more-button')).toBeInTheDocument()
  })

  it('navigates back when back button is clicked', () => {
    renderPreview()
    fireEvent.click(screen.getByText('Профиль'))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('shows only friend-visible moments and hides private ones', () => {
    useAppStore.setState({
      currentUser: {
        id: 'u1',
        name: 'Arslan',
        created_at: '2024-01-15T00:00:00Z',
        public_profile_enabled: true,
        bio: 'Short bio',
        featured_moment_id: 'm-friends',
      },
      moments: [
        { id: 'm-friends', title: 'Friends Moment', created_at: '2024-02-01', user_id: 'u1', visibility: 'friends' },
        { id: 'm-private', title: 'Private Moment', created_at: '2024-02-02', user_id: 'u1', visibility: 'private' },
      ],
      friends: [],
      isPremium: false,
    })

    renderPreview()

    const previewScreen = screen.getByTestId('profile-preview-screen')
    const preview = within(previewScreen)
    expect(preview.getByText('Short bio')).toBeInTheDocument()
    expect(preview.getByText('Friends Moment')).toBeInTheDocument()
    expect(preview.queryByText('Private Moment')).not.toBeInTheDocument()
  })

  it('opens the edit sheet via more menu', () => {
    renderPreview()
    expect(screen.queryByTestId('public-profile-edit-button')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('public-profile-more-button'))
    expect(screen.getByTestId('public-profile-edit-button')).toBeInTheDocument()
  })

  it('shows only friend-visible moments in the editor and saves bio', async () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan', created_at: '2024-01-15T00:00:00Z' },
      moments: [
        { id: 'm-friends', title: 'Friends Moment', created_at: '2024-02-01', user_id: 'u1', visibility: 'friends' },
        { id: 'm-private', title: 'Private Moment', created_at: '2024-02-02', user_id: 'u1', visibility: 'private' },
      ],
      friends: [],
      isPremium: false,
    })

    renderPreview()
    fireEvent.click(screen.getByTestId('public-profile-more-button'))

    await waitFor(() => screen.getByTestId('public-profile-edit-button'))
    fireEvent.click(screen.getByTestId('public-profile-edit-button'))

    expect(screen.getByText('Friends Moment')).toBeInTheDocument()
    expect(screen.queryByText('Private Moment')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Пара слов о себе'), {
      target: { value: 'Short bio' },
    })
    fireEvent.click(screen.getByText('Сохранить'))

    await waitFor(() => {
      expect(screen.getByText('Short bio')).toBeInTheDocument()
    })
  })
})
