import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MomentCard from '../MomentCard.jsx'
import { useAppStore } from '../../store/useAppStore.js'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

describe('MomentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Me' },
      friends: [],
    })
  })

  it('opens linked Telegram participant profile without opening the moment', async () => {
    const user = userEvent.setup()

    render(
      <MomentCard
        moment={{
          id: 'moment-1',
          user_id: 'user-1',
          title: 'Memory',
          created_at: '2024-02-01T10:00:00Z',
          people: [
            { id: 'person-1', name: 'Local Person', linked_user_id: null },
            { id: 'person-2', name: 'Mila', linked_user_id: 'user-2' },
          ],
          taggedFriends: [
            { id: 'user-3', name: 'Tagged Friend', photo_url: null },
          ],
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Открыть профиль Mila' }))

    expect(mockNavigate).toHaveBeenCalledWith('/profile/user-2', undefined)
    expect(mockNavigate).not.toHaveBeenCalledWith('/moment/moment-1', undefined)
    expect(screen.getByText('Local Person').closest('[role="button"]')).toBeNull()
  })
})
