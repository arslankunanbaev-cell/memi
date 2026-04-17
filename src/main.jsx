import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App'

if (import.meta.env.DEV || window.location.search.includes('debug')) {
  import('https://cdn.jsdelivr.net/npm/eruda').then(m => (m.default || m).init())
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
