import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import AddMoment from '../AddMoment.jsx'

// ── Моки ─────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

const mockSaveMoment = vi.fn()
vi.mock('../../lib/api.js', () => ({
  saveMoment:    (...args) => mockSaveMoment(...args),
  createPerson:  vi.fn(),
  addMomentParticipants: vi.fn(),
}))

// ── Хелпер ───────────────────────────────────────────────────────────────────
function renderAddMoment(props = {}) {
  return render(
    <MemoryRouter>
      <AddMoment onClose={vi.fn()} {...props} />
    </MemoryRouter>
  )
}

// ── Тесты ────────────────────────────────────────────────────────────────────
describe('AddMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'user-uuid-1', name: 'Test User' },
      people: [],
      friends: [],
      moments: [],
    })
  })

  it('рендерится без ошибок', () => {
    expect(() => renderAddMoment()).not.toThrow()
  })

  it('показывает заголовок "Новый момент"', () => {
    renderAddMoment()
    expect(screen.getByText('Новый момент')).toBeInTheDocument()
  })

  it('кнопка "Сохранить" задизейблена если заголовок пустой', () => {
    renderAddMoment()
    const btn = screen.getByText('Сохранить')
    expect(btn).toBeDisabled()
  })

  it('кнопка "Сохранить" активна после ввода заголовка', async () => {
    renderAddMoment()
    const input = screen.getByPlaceholderText('Название момента...')
    await userEvent.type(input, 'Летний вечер')
    const btn = screen.getByText('Сохранить')
    expect(btn).not.toBeDisabled()
  })

  it('вызывает saveMoment с правильными данными', async () => {
    const saved = { id: 'moment-1', title: 'Тест', user_id: 'user-uuid-1' }
    mockSaveMoment.mockResolvedValue(saved)

    renderAddMoment()
    const input = screen.getByPlaceholderText('Название момента...')
    await userEvent.type(input, 'Тест момент')
    fireEvent.click(screen.getByText('Сохранить'))

    await waitFor(() => {
      expect(mockSaveMoment).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          fields: expect.objectContaining({ title: 'Тест момент' }),
          photoFile: null,
          peopleIds: [],
        })
      )
    })
    expect(mockSaveMoment.mock.calls[0][0].fields.visibility).toBe('friends')
  })

  it('после сохранения переходит на /moment-saved (обычный режим)', async () => {
    mockSaveMoment.mockResolvedValue({ id: 'm1', title: 'X', user_id: 'u1' })
    renderAddMoment()
    await userEvent.type(screen.getByPlaceholderText('Название момента...'), 'X')
    fireEvent.click(screen.getByText('Сохранить'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/moment-saved', expect.anything()))
  })

  it('в режиме капсулы вызывает afterSave вместо navigate', async () => {
    const afterSave = vi.fn()
    mockSaveMoment.mockResolvedValue({ id: 'm2', title: 'Y', user_id: 'u1' })
    renderAddMoment({ afterSave })
    await userEvent.type(screen.getByPlaceholderText('Название момента...'), 'Y')
    fireEvent.click(screen.getByText('Сохранить'))
    await waitFor(() => {
      expect(afterSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'm2' }))
      expect(mockNavigate).not.toHaveBeenCalledWith('/moment-saved', expect.anything())
    })
  })

  it('показывает ошибку если saveMoment бросает исключение', async () => {
    mockSaveMoment.mockRejectedValue(new Error('Network error'))
    renderAddMoment()
    await userEvent.type(screen.getByPlaceholderText('Название момента...'), 'Fail test')
    fireEvent.click(screen.getByText('Сохранить'))
    await waitFor(() => {
      expect(screen.getByText(/Не удалось сохранить/i)).toBeInTheDocument()
    })
  })

  it('показывает ошибку если currentUser = null', async () => {
    useAppStore.setState({ currentUser: null })
    renderAddMoment()
    await userEvent.type(screen.getByPlaceholderText('Название момента...'), 'No user')
    fireEvent.click(screen.getByText('Сохранить'))
    await waitFor(() => {
      expect(screen.getByText(/Не удалось сохранить/i)).toBeInTheDocument()
    })
  })

  it('всегда показывает секцию "С кем" (даже без людей)', () => {
    renderAddMoment()
    expect(screen.getByText('С кем')).toBeInTheDocument()
  })

  it('показывает кнопку "Добавить человека" когда список людей пуст', () => {
    renderAddMoment()
    expect(screen.getByText('Добавить человека')).toBeInTheDocument()
  })

  it('показывает существующих людей как чипы', () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Test' },
      people: [
        { id: 'p1', name: 'Аня', avatar_color: '#D98B52' },
        { id: 'p2', name: 'Вася', avatar_color: '#A05E2C' },
      ],
    })
    renderAddMoment()
    expect(screen.getByText('Аня')).toBeInTheDocument()
    expect(screen.getByText('Вася')).toBeInTheDocument()
  })

  it('показывает режим видимости "Друзья"', () => {
    renderAddMoment()
    expect(screen.getByText(/Друзья/i)).toBeInTheDocument()
  })

  it('кнопка "Отмена" вызывает onClose', () => {
    const onClose = vi.fn()
    renderAddMoment({ onClose })
    fireEvent.click(screen.getByText('Отмена'))
    expect(onClose).toHaveBeenCalled()
  })
})
