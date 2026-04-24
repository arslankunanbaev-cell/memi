import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TutorialApp from './tutorial/TutorialApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TutorialApp />
  </StrictMode>,
)
