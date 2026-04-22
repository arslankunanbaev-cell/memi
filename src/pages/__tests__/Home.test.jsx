import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import Home from '../Home.jsx'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentUser: { id: 'u1', name: 'Arslan' },
      friends: [],
      moments: [],
    })
  })

  it('показывает обложку трека в карточке момента на главной', () => {
    const songCover = 'https://i.scdn.co/image/ab67616d0000b2731234567890abcdef12345678'

    useAppStore.setState({
      moments: [
        {
          id: 'm1',
          user_id: 'u1',
          title: 'С эльбеком',
          created_at: '2026-04-10T17:29:00Z',
          song_title: 'Я найду тебя через века',
          song_artist: 'Баста',
          song_cover: songCover,
        },
      ],
    })

    renderHome()

    const cover = screen.getByAltText('Я найду тебя через века')
    expect(cover).toBeInTheDocument()
    expect(cover).toHaveAttribute('src', `/api/image-proxy?url=${encodeURIComponent(songCover)}`)
  })

  it('показывает автора у момента друга в ленте', () => {
    useAppStore.setState({
      friends: [{ id: 'u2', name: 'Mila', photo_url: null }],
      moments: [
        {
          id: 'm2',
          user_id: 'u2',
          title: 'Утро в городе',
          created_at: '2026-04-11T08:15:00Z',
          visibility: 'friends',
        },
      ],
    })

    renderHome()

    expect(screen.getByText('Mila')).toBeInTheDocument()
    expect(screen.getByText('Утро в городе')).toBeInTheDocument()
  })
})
