import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore.js'
import Splash from '../Splash.jsx'

// Splash — чистый дисплей, навигация живёт в App.jsx
describe('Splash', () => {
  beforeEach(() => {
    useAppStore.setState({ initDone: false, isNew: null })
  })

  it('показывает логотип memi', () => {
    render(<MemoryRouter><Splash /></MemoryRouter>)
    expect(screen.getByText('memi')).toBeInTheDocument()
  })

  it('рендерится без ошибок пока initDone=false', () => {
    expect(() =>
      render(<MemoryRouter><Splash /></MemoryRouter>)
    ).not.toThrow()
  })

  it('рендерится без ошибок когда initDone=true', () => {
    useAppStore.setState({ initDone: true, isNew: false })
    expect(() =>
      render(<MemoryRouter><Splash /></MemoryRouter>)
    ).not.toThrow()
  })

  it('не содержит навигационных кнопок (нет navigate-логики)', () => {
    render(<MemoryRouter><Splash /></MemoryRouter>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText(/начать/i)).toBeNull()
    expect(screen.queryByText(/войти/i)).toBeNull()
  })
})
