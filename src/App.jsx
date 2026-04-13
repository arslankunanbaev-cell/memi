import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getTgUser } from './lib/telegram'
import { saveUser, getPeople, getMoments } from './lib/api'
import { useAppStore } from './store/useAppStore'
import Splash from './pages/Splash'
import Welcome from './pages/Welcome'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Profile from './pages/Profile'
import People from './pages/People'
import MomentDetail from './pages/MomentDetail'
import MomentSaved from './pages/MomentSaved'
import StoryPreview from './pages/StoryPreview'

export default function App() {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setPeople      = useAppStore((s) => s.setPeople)
  const setMoments     = useAppStore((s) => s.setMoments)

  useEffect(() => {
    async function init() {
      const tgUser = getTgUser() ?? {
        id: 1,
        first_name: 'Dev',
        last_name: 'User',
      }
      console.log('[App] init with tgUser:', tgUser)
      try {
        const user = await saveUser(tgUser)
        setCurrentUser(user)
        console.log('[App] currentUser set:', user)
        const [fetchedPeople, fetchedMoments] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
        ])
        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
      } catch (err) {
        console.error('[App] Init error:', err)
      }
    }
    init()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      <Route path="/"               element={<Splash />} />
      <Route path="/welcome"        element={<Welcome />} />
      <Route path="/onboarding"     element={<Onboarding />} />
      <Route path="/home"           element={<Home />} />
      <Route path="/archive"        element={<Archive />} />
      <Route path="/profile"        element={<Profile />} />
      <Route path="/people"         element={<People />} />
      <Route path="/moment/:id"     element={<MomentDetail />} />
      <Route path="/moment-saved"   element={<MomentSaved />} />
      <Route path="/story/:id"      element={<StoryPreview />} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}
