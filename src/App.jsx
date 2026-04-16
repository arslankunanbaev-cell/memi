import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { saveUser, getPeople, getMoments, getCapsule } from './lib/api'
import { useAppStore } from './store/useAppStore'
import Splash from './pages/Splash'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Profile from './pages/Profile'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import MomentDetail from './pages/MomentDetail'
import MomentSaved from './pages/MomentSaved'
import StoryPreview from './pages/StoryPreview'
import StoryPreviewScreen from './pages/StoryPreviewScreen'
import EditMoment from './pages/EditMoment'

export default function App() {
  const navigate   = useNavigate()
  const setPeople  = useAppStore((s) => s.setPeople)
  const setMoments = useAppStore((s) => s.setMoments)
  const setCapsule = useAppStore((s) => s.setCapsule)
  const setInitResult = useAppStore((s) => s.setInitResult)

  useEffect(() => {
    // ── Страховочный таймаут — если через 5с init не завершился → /home ──────
    const fallbackTimer = setTimeout(() => {
      console.warn('[App] ⏱ fallback timeout → /home')
      navigate('/home', { replace: true })
    }, 5000)

    async function init() {
      try {
        // Telegram WebApp — вызываем ready/expand первым делом
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.ready()
          window.Telegram.WebApp.expand()
        }

        console.log('[App] ══ INIT START ══')
        console.log('[App] TG WebApp:', window.Telegram?.WebApp)
        console.log('[App] TG user:', window.Telegram?.WebApp?.initDataUnsafe?.user)

        // Определяем пользователя (Telegram или dev-fallback)
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
          ?? { id: 12345, first_name: 'Dev', last_name: 'User' }

        console.log('[App] resolved tgUser:', tgUser)

        // Сохраняем / получаем пользователя из БД
        const { user, isNew } = await saveUser(tgUser)
        console.log('[App] ✅ user:', user.id, '| isNew:', isNew)

        // Загружаем people + moments + capsule параллельно
        const [fetchedPeople, fetchedMoments, fetchedCapsule] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
          getCapsule(user.id),
        ])
        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
        setCapsule(fetchedCapsule)
        setInitResult(user, isNew)

        console.log('[App] ✅ people:', fetchedPeople.length, 'moments:', fetchedMoments.length)
        console.log('[App] ══ INIT END — navigating to:', isNew ? '/onboarding' : '/home')

        // Навигация — вся логика здесь, Splash ничего не решает
        clearTimeout(fallbackTimer)
        navigate(isNew ? '/onboarding' : '/home', { replace: true })

      } catch (err) {
        console.error('[App] ❌ Init error:', err?.message)
        console.error('[App] ❌ details:', JSON.stringify(err))
        // При любой ошибке — всё равно идём на /home, не зависаем
        clearTimeout(fallbackTimer)
        setInitResult({ id: null, name: 'Пользователь' }, false)
        navigate('/home', { replace: true })
      }
    }

    init()

    return () => clearTimeout(fallbackTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Routes>
      <Route path="/"                  element={<Splash />} />
      <Route path="/onboarding"        element={<Onboarding />} />
      <Route path="/home"              element={<Home />} />
      <Route path="/archive"           element={<Archive />} />
      <Route path="/profile"           element={<Profile />} />
      <Route path="/people"            element={<People />} />
      <Route path="/people/:id"        element={<PersonDetail />} />
      <Route path="/moment/:id"        element={<MomentDetail />} />
      <Route path="/moment-saved"      element={<MomentSaved />} />
      <Route path="/story/:id"         element={<StoryPreview />} />
      <Route path="/story-preview/:id" element={<StoryPreviewScreen />} />
      <Route path="/edit-moment/:id"   element={<EditMoment />} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  )
}
