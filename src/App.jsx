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
import StoryPreviewScreen from './pages/StoryPreviewScreen'

export default function App() {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setPeople      = useAppStore((s) => s.setPeople)
  const setMoments     = useAppStore((s) => s.setMoments)

  useEffect(() => {
    async function init() {
      // ── 1. Диагностика Telegram WebApp ─────────────────────────────────────
      console.log('[App] ══════════════ INIT START ══════════════')
      console.log('[App] window.Telegram:', window.Telegram)
      console.log('[App] window.Telegram?.WebApp:', window.Telegram?.WebApp)
      console.log('[App] initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe)
      console.log('[App] user from initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe?.user)
      console.log('[App] initData (raw string):', window.Telegram?.WebApp?.initData)
      console.log('[App] version:', window.Telegram?.WebApp?.version)
      console.log('[App] platform:', window.Telegram?.WebApp?.platform)

      const tgUser = getTgUser() ?? {
        id: 1,
        first_name: 'Dev',
        last_name: 'User',
      }
      console.log('[App] ── resolved tgUser:', tgUser)

      try {
        const user = await saveUser(tgUser)
        setCurrentUser(user)
        console.log('[App] ✅ currentUser set:', user)
        const [fetchedPeople, fetchedMoments] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
        ])
        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
        console.log('[App] ✅ loaded people:', fetchedPeople.length, 'moments:', fetchedMoments.length)
      } catch (err) {
        console.error('[App] ❌ Init error:', err)
        console.error('[App] ❌ Init error message:', err?.message)
        console.error('[App] ❌ Init error details:', JSON.stringify(err, null, 2))
      }
      console.log('[App] ══════════════ INIT END ══════════════')
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
      <Route path="/story/:id"          element={<StoryPreview />} />
      <Route path="/story-preview/:id"  element={<StoryPreviewScreen />} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}
