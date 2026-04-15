import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Мок Supabase ──────────────────────────────────────────────────────────────
// Создаём полную mock-цепочку .from().select().eq()...
const mockMaybeSingle = vi.fn()
const mockSingle      = vi.fn()
const mockSelect      = vi.fn()
const mockInsert      = vi.fn()
const mockUpsert      = vi.fn()
const mockUpdate      = vi.fn()
const mockDelete      = vi.fn()
const mockEq          = vi.fn()
const mockOrder       = vi.fn()
const mockUpload      = vi.fn()
const mockGetPublicUrl = vi.fn()

const mockFrom = vi.fn(() => ({
  select:     mockSelect,
  insert:     mockInsert,
  upsert:     mockUpsert,
  update:     mockUpdate,
  delete:     mockDelete,
}))

// Цепочки возвращают себя для fluent API
mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, maybeSingle: mockMaybeSingle, single: mockSingle })
mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
mockUpsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: mockSingle }) }) })
mockDelete.mockReturnValue({ eq: () => ({ data: null, error: null }) })
mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockSingle, order: mockOrder, select: mockSelect })
mockOrder.mockReturnValue({ data: [], error: null })

const mockStorageFrom = vi.fn(() => ({
  upload:      mockUpload,
  getPublicUrl: mockGetPublicUrl,
}))

vi.mock('../supabase.js', () => ({
  assertSupabase: () => ({
    from:    mockFrom,
    storage: { from: mockStorageFrom },
  }),
}))

import { saveUser, saveMoment, getPeople, createPerson, getMoments } from '../api.js'

// ── saveUser ──────────────────────────────────────────────────────────────────

describe('saveUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('возвращает { user, isNew: false } для существующего пользователя', async () => {
    const existing = { id: 'uuid-1', telegram_id: 123, name: 'Test User' }
    mockMaybeSingle.mockResolvedValue({ data: existing, error: null })

    const result = await saveUser({ id: 123, first_name: 'Test', last_name: 'User' })

    expect(result.isNew).toBe(false)
    expect(result.user).toMatchObject({ id: 'uuid-1', telegram_id: 123 })
  })

  it('возвращает { user, isNew: true } для нового пользователя', async () => {
    const newUser = { id: 'uuid-2', telegram_id: 456, name: 'New User' }
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })   // не найден
    mockSingle.mockResolvedValue({ data: newUser, error: null })     // создан

    const result = await saveUser({ id: 456, first_name: 'New', last_name: 'User' })

    expect(result.isNew).toBe(true)
    expect(result.user).toMatchObject({ id: 'uuid-2', telegram_id: 456 })
  })

  it('бросает ошибку если Supabase возвращает select error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error', code: '500' } })

    await expect(saveUser({ id: 1, first_name: 'X' })).rejects.toMatchObject({ message: 'DB error' })
  })

  it('бросает ошибку если insert падает', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed', code: '23505' } })

    await expect(saveUser({ id: 2, first_name: 'Y' })).rejects.toMatchObject({ message: 'Insert failed' })
  })

  it('использует first_name + last_name как name', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({ data: { id: 'uuid-3', name: 'Arslan Kunanbayev' }, error: null })

    const result = await saveUser({ id: 789, first_name: 'Arslan', last_name: 'Kunanbayev' })
    expect(result.user.name).toBe('Arslan Kunanbayev')
  })

  it('использует "Пользователь" если имя пустое', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const inserted = vi.fn()
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'uuid-4', name: 'Пользователь' }, error: null }),
      }),
    })

    const result = await saveUser({ id: 999 })
    expect(result.user.name).toBe('Пользователь')
  })
})

// ── saveMoment ─────────────────────────────────────────────────────────────────

describe('saveMoment', () => {
  beforeEach(() => vi.clearAllMocks())

  const fields = { title: 'Тест', description: null, mood: '😊', location: null,
                   song_title: null, song_artist: null, song_cover: null }

  it('сохраняет момент без фото и людей', async () => {
    const savedMoment = { id: 'moment-1', title: 'Тест', user_id: 'user-1' }
    mockSingle.mockResolvedValue({ data: savedMoment, error: null })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })

    const result = await saveMoment({ userId: 'user-1', fields, photoFile: null, peopleIds: [] })
    expect(result.id).toBe('moment-1')
  })

  it('загружает фото и прикрепляет URL к моменту', async () => {
    const savedMoment = { id: 'moment-2', photo_url: 'https://cdn.example.com/photo.jpg' }
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/photo.jpg' } })
    mockSingle.mockResolvedValue({ data: savedMoment, error: null })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })

    const fakeFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await saveMoment({ userId: 'user-1', fields, photoFile: fakeFile, peopleIds: [] })

    expect(mockUpload).toHaveBeenCalled()
    expect(result.photo_url).toBe('https://cdn.example.com/photo.jpg')
  })

  it('бросает ошибку если загрузка фото не удалась', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'Storage error' } })

    const fakeFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(
      saveMoment({ userId: 'user-1', fields, photoFile: fakeFile, peopleIds: [] })
    ).rejects.toMatchObject({ message: 'Storage error' })
  })

  it('связывает людей через moment_people', async () => {
    const savedMoment = { id: 'moment-3' }
    mockSingle.mockResolvedValue({ data: savedMoment, error: null })
    const mockPeopleInsert = vi.fn().mockResolvedValue({ error: null })
    // moment insert
    mockInsert.mockReturnValueOnce({ select: () => ({ single: mockSingle }) })
    // moment_people insert
    mockInsert.mockReturnValueOnce(Promise.resolve({ error: null }))
    mockFrom.mockImplementation((table) => {
      if (table === 'moment_people') return { insert: mockPeopleInsert }
      return { insert: mockInsert, select: mockSelect }
    })

    await saveMoment({ userId: 'user-1', fields, photoFile: null, peopleIds: ['person-1', 'person-2'] })
    expect(mockPeopleInsert).toHaveBeenCalledWith([
      { moment_id: 'moment-3', person_id: 'person-1' },
      { moment_id: 'moment-3', person_id: 'person-2' },
    ])
  })

  it('бросает ошибку если вставка момента не удалась (RLS / invalid key)', async () => {
    const rlsError = { message: 'row-level security', code: '42501' }
    // Сбрасываем мок from на дефолтную реализацию для этого теста
    mockFrom.mockReturnValue({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: rlsError }) }) }),
      select: mockSelect,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete,
    })

    await expect(
      saveMoment({ userId: 'user-1', fields, photoFile: null, peopleIds: [] })
    ).rejects.toMatchObject({ code: '42501' })

    // Восстанавливаем стандартный мок
    mockFrom.mockReturnValue({
      select: mockSelect, insert: mockInsert, upsert: mockUpsert,
      update: mockUpdate, delete: mockDelete,
    })
  })
})

// ── createPerson ───────────────────────────────────────────────────────────────

describe('createPerson', () => {
  beforeEach(() => {
    // mockReset сбрасывает и implementation, и calls — нужно после mockImplementation в saveMoment
    mockFrom.mockReset()
    mockInsert.mockReset()
    mockSingle.mockReset()
    // Восстанавливаем полную цепочку для .from().insert().select().single()
    mockInsert.mockImplementation(() => ({ select: () => ({ single: mockSingle }) }))
    mockFrom.mockImplementation(() => ({
      select: mockSelect, insert: mockInsert, upsert: mockUpsert,
      update: mockUpdate, delete: mockDelete,
    }))
  })

  it('создаёт человека без фото', async () => {
    const person = { id: 'p-1', name: 'Аня', user_id: 'user-1', avatar_color: '#D98B52' }
    mockSingle.mockResolvedValue({ data: person, error: null })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const result = await createPerson({ userId: 'user-1', name: 'Аня', avatarColor: '#D98B52', photoFile: null })
    expect(result.name).toBe('Аня')
    expect(result.id).toBe('p-1')
  })

  it('бросает ошибку если insert падает', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'FK violation' } })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
    mockFrom.mockReturnValue({ insert: mockInsert })

    await expect(
      createPerson({ userId: 'user-1', name: 'Боря', avatarColor: '#000', photoFile: null })
    ).rejects.toMatchObject({ message: 'FK violation' })
  })
})
