import { describe, expect, it } from 'vitest'
import {
  compareMomentsByAddedAt,
  compareMomentsByDisplayAt,
  getMomentAddedAt,
  getMomentDisplayAt,
} from '../momentTime.js'

describe('momentTime helpers', () => {
  it('prefers moment_at for display date', () => {
    expect(
      getMomentDisplayAt({
        created_at: '2026-04-23T09:30:00Z',
        moment_at: '2024-02-14T18:45:00Z',
      }),
    ).toBe('2024-02-14T18:45:00Z')
  })

  it('falls back to created_at when moment_at is missing', () => {
    expect(
      getMomentDisplayAt({
        created_at: '2026-04-23T09:30:00Z',
      }),
    ).toBe('2026-04-23T09:30:00Z')
  })

  it('keeps created_at for timeline ordering', () => {
    expect(
      getMomentAddedAt({
        created_at: '2026-04-23T09:30:00Z',
        moment_at: '2024-02-14T18:45:00Z',
      }),
    ).toBe('2026-04-23T09:30:00Z')
  })

  it('falls back to photo_path timestamp for legacy photo moments', () => {
    expect(
      getMomentAddedAt({
        created_at: '2024-03-26T12:00:00Z',
        photo_path: 'user-1/1777777777777.jpg',
      }),
    ).toBe(new Date(1777777777777).toISOString())
  })

  it('sorts feeds by created_at and displays by moment_at', () => {
    const moments = [
      {
        id: 'old-memory-new-add',
        created_at: '2026-04-23T09:30:00Z',
        moment_at: '2024-02-14T18:45:00Z',
      },
      {
        id: 'new-memory-old-add',
        created_at: '2026-04-22T09:30:00Z',
        moment_at: '2026-04-22T08:00:00Z',
      },
    ]

    expect([...moments].sort(compareMomentsByAddedAt).map((moment) => moment.id)).toEqual([
      'old-memory-new-add',
      'new-memory-old-add',
    ])

    expect([...moments].sort(compareMomentsByDisplayAt).map((moment) => moment.id)).toEqual([
      'new-memory-old-add',
      'old-memory-new-add',
    ])
  })

  it('sorts legacy photo moments by inferred upload time', () => {
    const moments = [
      {
        id: 'older-upload',
        created_at: '2024-03-26T12:00:00Z',
        photo_path: 'user-1/1777777777000.jpg',
      },
      {
        id: 'newer-upload',
        created_at: '2024-03-25T12:00:00Z',
        photo_path: 'user-1/1777777777999.jpg',
      },
    ]

    expect([...moments].sort(compareMomentsByAddedAt).map((moment) => moment.id)).toEqual([
      'newer-upload',
      'older-upload',
    ])
  })
})
