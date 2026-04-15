import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getTgUser } from './lib/telegram'
import { saveUser, getPeople, getMoments } from './lib/api'
import { useAppStore } from './store/useAppStore'
import Splash from './pages/Splash'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Profile from './pages/Profile'
import People from './pages/People'
import MomentDetail from './pages/MomentDetail'
import MomentSaved from './pages/MomentSaved'
import StoryPreview from './pages/StoryPreview'
import StoryPreviewScreen from './pages/StoryPreviewScreen'

export default function App() {
  const setInitResult  = useAppStore((s) => s.setInitResult)
  const setPeople      = useAppStore((s) => s.setPeople)
  const setMoments     = useAppStore((s) => s.setMoments)

  useEffect(() => {
    async function init() {
      console.log('[App] ══ INIT START ══')
      console.log('[App] window.Telegram?.WebApp:', window.Telegram?.WebApp)
      console.log('[App] initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe)
      console.log('[App] user from TG:', window.Telegram?.WebApp?.initDataUnsafe?.user)

      const tgUser = getTgUser() ?? {
        id: 1,
        first_name: 'Dev',
        last_name: 'User',
      }
      console.log('[App] resolved tgUser:', tgUser)

      try {
        const { user, isNew } = await saveUser(tgUser)
        console.log('[App] ✅ user:', user, '| isNew:', isNew)

        // Сохраняем в store — Splash использует initDone/isNew для навигации
        setInitResult(user, isNew)

        const [fetchedPeople, fetchedMoments] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
        ])
        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
        console.log('[App] ✅ people:', fetchedPeople.length, 'moments:', fetchedMoments.length)
      } catch (err) {
        console.error('[App] ❌ Init error:', err?.message, JSON.stringify(err))
        // Даже при ошибке — разблокируем Splash с fallback
        setInitResult({ id: null, name: 'Гость' }, false)
      }
      console.log('[App] ══ INIT END ══')
    }
    init()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      <Route path="/"               element={<Splash />} />
      <Route path="/onboarding"     element={<Onboarding />} />
      <Route path="/home"           element={<Home />} />
      <Route path="/archive"        element={<Archive />} />
      <Route path="/profile"        element={<Profile />} />
      <Route path="/people"         element={<People />} />
      <Route path="/moment/:id"     element={<MomentDetail />} />
      <Route path="/moment-saved"   element={<MomentSaved />} />
      <Route path="/story/:id"          element={<StoryPreview />} />
      <Route path="/story-preview/:id"  element={<StoryPreviewScreen />} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}
