import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import Profile from '../Profile.jsx'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

vi.mock('../../lib/api.js', () => ({
  saveMoment: vi.fn().mockResolvedValue({ id: 'm1', title: 'Test' }),
  createPerson: vi.fn(),
  saveCapsuleSlot: vi.fn().mockResolvedValue({}),
  deleteCapsuleSlot: vi.fn().mockResolvedValue({}),
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

  it('показывает имя пользователя из currentUser', () => {
    renderProfile()
    expect(screen.getByText('Arslan')).toBeInTheDocument()
  })

  it('показывает "Пользователь" если имя не задано', () => {
    useAppStore.setState({ currentUser: { id: 'u1', name: '' } })
    renderProfile()
    expect(screen.getByText('Пользователь')).toBeInTheDocument()
  })

  it('показывает статистику моментов', () => {
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

  it('рендерит 4 слота капсулы', () => {
    renderProfile()
    expect(screen.getAllByText('Добавить')).toHaveLength(4)
  })

  it('открывает PickMomentSheet при нажатии на пустой слот', () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    expect(screen.getByText('В капсулу')).toBeInTheDocument()
  })

  it('в PickMomentSheet есть кнопка "Создать момент"', () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    expect(screen.getByText('Создать момент')).toBeInTheDocument()
  })

  it('нажатие "Создать момент" открывает AddMoment оверлей', async () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    fireEvent.click(screen.getByText('Создать момент'))

    await waitFor(() => {
      expect(screen.getByTestId('add-moment-overlay')).toBeInTheDocument()
    })
  })

  it('после сохранения момент попадает в капсулу', async () => {
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

  it('после сохранения AddMoment оверлей закрывается', async () => {
    renderProfile()
    fireEvent.click(screen.getAllByText('Добавить')[0])
    fireEvent.click(screen.getByText('Создать момент'))
    await waitFor(() => screen.getByTestId('add-moment-overlay'))
    fireEvent.click(screen.getByText('Сохранить момент'))

    await waitFor(() => {
      expect(screen.queryByTestId('add-moment-overlay')).not.toBeInTheDocument()
    })
  })

  it('ссылка "Мои люди" ведёт на /people', () => {
    renderProfile()
    fireEvent.click(screen.getByText('Мои люди'))
    expect(mockNavigate).toHaveBeenCalledWith('/people')
  })
})
