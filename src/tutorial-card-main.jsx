import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TutorialCard from './tutorial/TutorialCard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TutorialCard />
  </StrictMode>,
)
