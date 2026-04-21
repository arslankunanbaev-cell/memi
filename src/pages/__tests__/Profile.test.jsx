import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import Profile from '../Profile.jsx'

vi.mock('../../lib/api.js', () => ({
  saveMoment: vi.fn().mockResolvedValue({ id: 'm1', title: 'Test' }),
  createPerson: vi.fn(),
  saveCapsuleSlot: vi.fn().mockResolvedValue({}),
  deleteCapsuleSlot: vi.fn().mockResolvedValue({}),
  updatePublicProfile: vi.fn().mockImplementation(async (_userId, payload) => ({
    id: 'u1',
    name: 'Arslan',
    created_at: '2024-01-15T00:00:00Z',
    public_profile_enabled: payload.publicProfileEnabled ?? false,
    bio: payload.bio?.trim() || null,
    featured_moment_id: payload.featuredMomentId ?? null,
  })),
}))

vi.mock('../AddMoment.jsx', () => ({
  default: ({ onClose, afterSave }) => (
    <div data-testid="add-moment-overlay">
      <button onClick={() => afterSave?.({ id: 'new-m', title: 'Новый момент' })}>
        Сохранить момент
      </button>
      <button onClick={onClose}>Закрыть</button>
    </div>
  ),
}))

vi.mock('../../components/BottomNav.jsx', () => ({
  default: () => <div data-testid="bottom-nav" />,
}))

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  )
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan', created_at: '2024-01-15T00:00:00Z' },
      moments: [],
      people: [{ id: 'p1', name: 'Аня' }],
      capsule: [null, null, null, null],
    })
  })

  it('shows the current user name', () => {
    renderProfile()
    expect(screen.getByText('Arslan')).toBeInTheDocument()
  })

  it('falls back to the default user name', () => {
    useAppStore.setState({ currentUser: { id: 'u1', name: '' } })
    renderProfile()
    expect(screen.getByText('Пользователь')).toBeInTheDocument()
  })

  it('shows moment stats', () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Test' },
      moments: [
        { id: 'm1', title: 'Первый', created_at: '2024-01-01', user_id: 'u1' },
        { id: 'm2', title: 'Второй', created_at: '2024-02-01', user_id: 'u1' },
      ],
    })

    renderProfile()
    const momentsStat = screen.getByText('момента').parentElement
    expect(momentsStat).toHaveTextContent('2')
  })

  it('renders 4 capsule slots', () => {
    renderProfile()
    expect(screen.getAllByText('Добавить')).toHaveLength(4)
  })

  it('opens PickMomentSheet on empty slot click', () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    expect(screen.getByText('В капсулу')).toBeInTheDocument()
  })

  it('shows the create moment action in PickMomentSheet', () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    expect(screen.getByText('Создать момент')).toBeInTheDocument()
  })

  it('opens AddMoment overlay from PickMomentSheet', async () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    fireEvent.click(screen.getByText('Создать момент'))

    await waitFor(() => {
      expect(screen.getByTestId('add-moment-overlay')).toBeInTheDocument()
    })
  })

  it('puts the saved moment into capsule', async () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    fireEvent.click(screen.getByText('Создать момент'))

    await waitFor(() => screen.getByTestId('add-moment-overlay'))
    fireEvent.click(screen.getByText('Сохранить момент'))

    await waitFor(() => {
      const { capsule } = useAppStore.getState()
      expect(capsule[0]).toMatchObject({ id: 'new-m', title: 'Новый момент' })
    })
  })

  it('closes AddMoment overlay after save', async () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    fireEvent.click(screen.getByText('Создать момент'))
    await waitFor(() => screen.getByTestId('add-moment-overlay'))
    fireEvent.click(screen.getByText('Сохранить момент'))

    await waitFor(() => {
      expect(screen.queryByTestId('add-moment-overlay')).not.toBeInTheDocument()
    })
  })

  it('does not show the "Мои люди" shortcut button', () => {
    renderProfile()
    expect(screen.queryByText('Мои люди')).not.toBeInTheDocument()
  })

  it('shows the public profile settings block', () => {
    renderProfile()
    expect(screen.getByText('Публичный профиль')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Показывать профиль другим' })).toBeInTheDocument()
    expect(screen.getByText('Редактировать')).toBeInTheDocument()
  })

  it('shows only public moments in the public profile editor and saves bio', async () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan', created_at: '2024-01-15T00:00:00Z' },
      moments: [
        { id: 'm-public', title: 'Open Moment', created_at: '2024-02-01', user_id: 'u1', visibility: 'public' },
        { id: 'm-private', title: 'Private Moment', created_at: '2024-02-02', user_id: 'u1', visibility: 'private' },
      ],
    })

    renderProfile()
    fireEvent.click(screen.getByText('Редактировать'))

    expect(screen.getByText('Open Moment')).toBeInTheDocument()
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
