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
    const songCover = 'https://cdn.example.com/song-cover.jpg'

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
    expect(cover).toHaveAttribute('src', songCover)
  })
})
