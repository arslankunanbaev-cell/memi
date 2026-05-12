import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import People from '../People.jsx'

const mockNavigate = vi.fn()
const mockOpenTelegramLink = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => mockNavigate,
}))

const mockCreatePerson = vi.fn()
const mockFindUserByTelegramUsername = vi.fn()
const mockSendFriendRequest = vi.fn()
vi.mock('../../lib/api.js', () => ({
  createPerson: (...args) => mockCreatePerson(...args),
  findUserByTelegramUsername: (...args) => mockFindUserByTelegramUsername(...args),
  getFriendships: vi.fn().mockResolvedValue([]),
  acceptFriendRequest: vi.fn(),
  linkPersonToUser: vi.fn(),
  sendFriendRequest: (...args) => mockSendFriendRequest(...args),
}))

function renderPeople() {
  return render(
    <MemoryRouter>
      <People />
    </MemoryRouter>,
  )
}

describe('People', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.Telegram = { WebApp: { openTelegramLink: mockOpenTelegramLink } }
    useAppStore.setState({
      currentUser: { id: 'user-1', name: 'Test', public_code: 'test-code' },
      people: [],
      moments: [],
      friends: [],
      incomingRequests: [],
    })
  })

  it('рендерится без ошибок', () => {
    expect(() => renderPeople()).not.toThrow()
  })

  it('показывает заголовок "Люди"', () => {
    renderPeople()
    expect(screen.getAllByText('Люди')[0]).toBeInTheDocument()
  })

  it('показывает существующих людей', () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Test', public_code: 'test-code' },
      people: [{ id: 'p1', name: 'Аня', avatar_color: '#D98B52', photo_url: null }],
      moments: [],
      friends: [],
      incomingRequests: [],
    })

    renderPeople()
    expect(screen.getByText('Аня')).toBeInTheDocument()
  })

  it('открывает шит добавления по кнопке в хедере', () => {
    renderPeople()
    fireEvent.click(screen.getByLabelText('Добавить человека'))
    expect(screen.getByText('Как зовут?')).toBeInTheDocument()
  })

  it('opens invite sharing from the friends header button', () => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Test', public_code: 'test-code' },
      people: [],
      moments: [],
      friends: [{ id: 'friend-1', name: 'РђРЅСЏ', photo_url: null }],
      incomingRequests: [],
    })

    renderPeople()
    fireEvent.click(screen.getByRole('button', { name: 'Пригласить друга' }))

    expect(mockOpenTelegramLink).toHaveBeenCalledWith(expect.stringContaining('https%3A%2F%2Ft.me%2Fmemimntbot%2Fapp'))
    expect(mockOpenTelegramLink).toHaveBeenCalledWith(expect.stringContaining('startapp%3Dref_test-code'))
  })

  it('finds a registered user by Telegram username and sends a friend request', async () => {
    mockFindUserByTelegramUsername.mockResolvedValue({
      id: 'user-2',
      name: 'Mila',
      photo_url: null,
      telegram_username: 'mila',
    })
    mockSendFriendRequest.mockResolvedValue({
      id: 'friendship-1',
      requester_id: 'user-1',
      receiver_id: 'user-2',
      status: 'pending',
    })

    renderPeople()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить человека' }))
    await userEvent.type(screen.getByPlaceholderText('@username'), '@Mila')
    fireEvent.click(screen.getByText('Найти'))

    await waitFor(() => expect(screen.getByText('Mila')).toBeInTheDocument())
    const addTelegramUserButton = screen
      .getAllByRole('button', { name: 'Добавить' })
      .find((button) => !button.disabled)
    fireEvent.click(addTelegramUserButton)

    await waitFor(() => {
      expect(mockFindUserByTelegramUsername).toHaveBeenCalledWith('mila')
      expect(mockSendFriendRequest).toHaveBeenCalledWith('user-1', 'user-2', { notifyRequester: true })
      expect(screen.getByText('Отправлено')).toBeInTheDocument()
    })
  })

  it('offers invite when Telegram username is not registered in memi', async () => {
    mockFindUserByTelegramUsername.mockResolvedValue(null)

    renderPeople()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить человека' }))
    await userEvent.type(screen.getByPlaceholderText('@username'), '@missing_user')
    fireEvent.click(screen.getByText('Найти'))

    await waitFor(() => expect(screen.getByText('Пригласить')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Пригласить'))

    expect(mockOpenTelegramLink).toHaveBeenCalledWith(expect.stringContaining('startapp%3Dref_test-code'))
  })

  async function openSheetAndType(name) {
    fireEvent.click(screen.getByLabelText('Добавить человека'))
    const input = screen.getByPlaceholderText('Введите имя')
    await userEvent.type(input, name)
  }

  function clickAddButton() {
    const button = screen.getAllByRole('button').find((entry) => entry.textContent.trim() === 'Добавить')
    fireEvent.click(button)
  }

  it('createPerson вызывается при добавлении человека', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'real-uuid-from-db', name: 'Коля', avatar_color: '#A05E2C', photo_url: null })

    renderPeople()
    await openSheetAndType('Коля')
    clickAddButton()

    await waitFor(() => {
      expect(mockCreatePerson).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', name: 'Коля' }),
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

  it('добавленный человек имеет реальный id из Supabase', async () => {
    mockCreatePerson.mockResolvedValue({ id: 'supabase-real-uuid', name: 'Лена', avatar_color: '#D98B52', photo_url: null })

    renderPeople()
    await openSheetAndType('Лена')
    clickAddButton()

    await waitFor(() => {
      const { people } = useAppStore.getState()
      const person = people.find((entry) => entry.name === 'Лена')
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
