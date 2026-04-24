import { MemoryRouter } from 'react-router-dom'
import '../styles/globals.css'
import Home from '../pages/Home'
import AddMoment from '../pages/AddMoment'
import People from '../pages/People'
import Profile from '../pages/Profile'
import { ensureTutorialTelegram, getAddMomentProps, seedTutorialStore } from './demoData'

ensureTutorialTelegram()
seedTutorialStore()

const APP_ROUTE_BY_SCREEN = {
  home: '/home',
  'add-basic': '/home',
  'add-social': '/home',
  people: '/people',
  profile: '/profile',
}

function TutorialScreen({ screen }) {
  if (screen === 'add-basic' || screen === 'add-social') {
    return (
      <AddMoment
        onClose={() => {}}
        afterSave={() => {}}
        {...getAddMomentProps(screen)}
      />
    )
  }

  if (screen === 'people') return <People />
  if (screen === 'profile') return <Profile />

  return <Home />
}

export default function TutorialApp() {
  const params = new URLSearchParams(window.location.search)
  const screen = params.get('screen') ?? 'home'
  const initialEntry = APP_ROUTE_BY_SCREEN[screen] ?? '/home'

  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <style>{`
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          caret-color: transparent !important;
        }
      `}</style>
      <TutorialScreen screen={screen} />
    </MemoryRouter>
  )
}
