import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import People from '../People.jsx'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

const mockCreatePerson = vi.fn()
const mockDeletePerson = vi.fn()
const mockUpdatePerson = vi.fn()
vi.mock('../../lib/api.js', () => ({
  createPerson: (...a) => mockCreatePerson(...a),
  deletePerson: (...a) => mockDeletePerson(...a),
  updatePerson: (...a) => mockUpdatePerson(...a),
}))

function renderPeople() {
  return render(<MemoryRouter><People /></MemoryRouter>)
}

describe('People', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Test' },
      people: [],
      moments: [],
    })
  })

  it('рендерится без ошибок', () => {
    expect(() => renderPeople()).not.toThrow()
  })

  it('показывает заголовок "Мои люди"', () => {
    renderPeople()
    expect(screen.getByText('Мои люди')).toBeInTheDocument()
  })

  it('показывает существующих людей', () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Test' },
      people: [{ id: 'p1', name: 'Аня', avatar_color: '#D98B52', photo_url: null }],
      moments: [],
    })
    renderPeople()
    expect(screen.getByText('Аня')).toBeInTheDocument()
  })

  it('открывает шит добавления по кнопке "+"', () => {
    renderPeople()
    // Кнопка "+" в topbar
    const addBtns = screen.getAllByRole('button')
    const plusBtn = addBtns.find(b => b.textContent === '+')
    fireEvent.click(plusBtn)
    expect(screen.getByText('Добавить человека')).toBeInTheDocument()
  })

  // Хелпер: открывает шит и вводит имя
  async function openSheetAndType(name) {
    const plusBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === '+')
    fireEvent.click(plusBtn)
    const input = screen.getByPlaceholderText('Как зовут?')
    await userEvent.type(input, name)
  }

  // Хелпер: нажимает кнопку "Добавить" (именно button, не span)
  function clickAddButton() {
    const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Добавить')
    fireEvent.click(btn)
  }

  it('createPerson вызывается при добавлении человека (не crypto.randomUUID)', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'real-uuid-from-db', name: 'Коля', avatar_color: '#A05E2C', photo_url: null })
    renderPeople()
    await openSheetAndType('Коля')
    clickAddButton()
    await waitFor(() => {
      expect(mockCreatePerson).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', name: 'Коля' })
      )
    })
  })

  it('человек появляется в списке после создания', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'real-uuid', name: 'Миша', avatar_color: '#6B8F71', photo_url: null })
    renderPeople()
    await openSheetAndType('Миша')
    clickAddButton()
    await waitFor(() => expect(screen.getByText('Миша')).toBeInTheDocument())
  })

  it('добавленный человек имеет реальный id из Supabase (не crypto.randomUUID)', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'supabase-real-uuid', name: 'Лена', avatar_color: '#D98B52', photo_url: null })
    renderPeople()
    await openSheetAndType('Лена')
    clickAddButton()
    await waitFor(() => {
      const { people } = useAppStore.getState()
      const person = people.find(p => p.name === 'Лена')
      expect(person?.id).toBe('supabase-real-uuid')
    })
  })

  it('показывает ошибку если createPerson падает', async () => {
    mockCreatePerson.mockRejectedValue(new Error('DB error'))
    renderPeople()
    await openSheetAndType('Ошибка')
    clickAddButton()
    await waitFor(() => {
      expect(screen.getByText(/Не удалось сохранить/i)).toBeInTheDocument()
    })
  })
})
