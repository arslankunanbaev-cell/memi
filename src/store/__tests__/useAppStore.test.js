import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAppStore } from '../useAppStore.js'

// Сбрасываем store перед каждым тестом
beforeEach(() => {
  useAppStore.setState({
    currentUser: null,
    initDone: false,
    isNew: null,
    moments: [],
    people: [],
    capsule: [null, null, null, null],
    recentSongs: [],
    recentLocations: [],
    isOnboarded: false,
  })
})

// ── currentUser / initResult ──────────────────────────────────────────────────

describe('setInitResult', () => {
  it('устанавливает currentUser, initDone=true, isNew', () => {
    const { result } = renderHook(() => useAppStore())
    const user = { id: 'u1', name: 'Test' }

    act(() => result.current.setInitResult(user, true))

    expect(result.current.currentUser).toEqual(user)
    expect(result.current.initDone).toBe(true)
    expect(result.current.isNew).toBe(true)
  })

  it('isNew=false для вернувшегося пользователя', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setInitResult({ id: 'u2', name: 'Old' }, false))
    expect(result.current.isNew).toBe(false)
  })
})

// ── Moments CRUD ──────────────────────────────────────────────────────────────

describe('moments', () => {
  const m1 = { id: 'm1', title: 'Первый', created_at: '2024-01-01' }
  const m2 = { id: 'm2', title: 'Второй', created_at: '2024-02-01' }

  it('setMoments заменяет весь список', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setMoments([m1, m2]))
    expect(result.current.moments).toHaveLength(2)
  })

  it('addMoment добавляет момент в начало списка', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setMoments([m2]))
    act(() => result.current.addMoment(m1))
    expect(result.current.moments[0].id).toBe('m1')
    expect(result.current.moments).toHaveLength(2)
  })

  it('updateMoment обновляет только нужный момент', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setMoments([m1, m2]))
    act(() => result.current.updateMoment('m1', { title: 'Обновлённый' }))
    expect(result.current.moments[0].title).toBe('Обновлённый')
    expect(result.current.moments[1].title).toBe('Второй')
  })

  it('removeMoment удаляет момент по id', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setMoments([m1, m2]))
    act(() => result.current.removeMoment('m1'))
    expect(result.current.moments).toHaveLength(1)
    expect(result.current.moments[0].id).toBe('m2')
  })
})

// ── People CRUD ───────────────────────────────────────────────────────────────

describe('people', () => {
  const p1 = { id: 'p1', name: 'Аня', avatar_color: '#D98B52' }
  const p2 = { id: 'p2', name: 'Вася', avatar_color: '#A05E2C' }

  it('setPeople заменяет список', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setPeople([p1, p2]))
    expect(result.current.people).toHaveLength(2)
  })

  it('addPerson добавляет человека', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.addPerson(p1))
    expect(result.current.people[0].name).toBe('Аня')
  })

  it('updatePerson патчит нужного человека', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setPeople([p1, p2]))
    act(() => result.current.updatePerson('p1', { name: 'Анна' }))
    expect(result.current.people[0].name).toBe('Анна')
    expect(result.current.people[1].name).toBe('Вася')
  })

  it('removePerson удаляет по id', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.setPeople([p1, p2]))
    act(() => result.current.removePerson('p1'))
    expect(result.current.people).toHaveLength(1)
    expect(result.current.people[0].id).toBe('p2')
  })
})

// ── Capsule ───────────────────────────────────────────────────────────────────

describe('capsule', () => {
  const moment = { id: 'm1', title: 'В капсулу' }

  it('по умолчанию 4 пустых слота', () => {
    const { result } = renderHook(() => useAppStore())
    expect(result.current.capsule).toHaveLength(4)
    expect(result.current.capsule.every((s) => s === null)).toBe(true)
  })

  it('addToCapsule кладёт момент в нужный слот', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.addToCapsule(2, moment))
    expect(result.current.capsule[2]).toEqual(moment)
    expect(result.current.capsule[0]).toBeNull()
  })

  it('removeFromCapsule очищает слот', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.addToCapsule(1, moment))
    act(() => result.current.removeFromCapsule(1))
    expect(result.current.capsule[1]).toBeNull()
  })

  it('можно заменить слот новым моментом', () => {
    const { result } = renderHook(() => useAppStore())
    const m2 = { id: 'm2', title: 'Замена' }
    act(() => result.current.addToCapsule(0, moment))
    act(() => result.current.addToCapsule(0, m2))
    expect(result.current.capsule[0].id).toBe('m2')
  })
})

// ── Recent songs ──────────────────────────────────────────────────────────────

describe('recentSongs', () => {
  it('addRecentSong добавляет трек', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => result.current.addRecentSong({ name: 'Song', artist: 'Artist' }))
    expect(result.current.recentSongs).toHaveLength(1)
  })

  it('дедублирует одинаковые треки', () => {
    const { result } = renderHook(() => useAppStore())
    const song = { name: 'Song', artist: 'Artist' }
    act(() => { result.current.addRecentSong(song); result.current.addRecentSong(song) })
    expect(result.current.recentSongs).toHaveLength(1)
  })

  it('хранит максимум 5 треков', () => {
    const { result } = renderHook(() => useAppStore())
    for (let i = 0; i < 7; i++) {
      act(() => result.current.addRecentSong({ name: `Song ${i}`, artist: 'A' }))
    }
    expect(result.current.recentSongs).toHaveLength(5)
  })

  it('последний добавленный трек — первый в списке', () => {
    const { result } = renderHook(() => useAppStore())
    act(() => { result.current.addRecentSong({ name: 'Old', artist: 'A' }) })
    act(() => { result.current.addRecentSong({ name: 'New', artist: 'B' }) })
    expect(result.current.recentSongs[0].name).toBe('New')
  })
})
