import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { saveUser, getPeople, getMoments, getCapsule, getUserByTelegramId, sendFriendRequest, getFriendships, getSharedMoments } from './lib/api'
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
  const setPeople          = useAppStore((s) => s.setPeople)
  const setMoments         = useAppStore((s) => s.setMoments)
  const setCapsule         = useAppStore((s) => s.setCapsule)
  const setInitResult      = useAppStore((s) => s.setInitResult)
  const setFriends         = useAppStore((s) => s.setFriends)
  const setIncomingRequests = useAppStore((s) => s.setIncomingRequests)

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

        // ── Критический блок — те же запросы что были до социальных фич ─────────
        const [fetchedPeople, fetchedMoments, fetchedCapsule] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
          getCapsule(user.id),
        ])
        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
        setCapsule(fetchedCapsule)
        setInitResult(user, isNew)  // ← пользователь загружен, таймер больше не страшен

        console.log('[App] ✅ people:', fetchedPeople.length, 'moments:', fetchedMoments.length)

        // ── Социальные фичи — отдельно, никогда не ломают основной init ────────
        try {
          const [fetchedFriendships, fetchedShared] = await Promise.all([
            getFriendships(user.id),
            getSharedMoments(user.id),
          ])

          // Добавляем шаренные моменты в ленту (без дублей)
          if (fetchedShared.length > 0) {
            const ownIds = new Set(fetchedMoments.map((m) => m.id))
            const merged = [
              ...fetchedMoments,
              ...fetchedShared.filter((m) => !ownIds.has(m.id)),
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            setMoments(merged)
          }

          // Разбиваем дружбы на принятых и входящие
          const accepted = []
          const incoming = []
          for (const f of fetchedFriendships) {
            if (f.status === 'accepted') {
              const friend = f.requester_id === user.id ? f.receiver : f.requester
              const friendData = friend ?? { id: f.requester_id === user.id ? f.receiver_id : f.requester_id, name: 'Пользователь' }
              accepted.push({ ...friendData, friendship_id: f.id })
            } else if (f.status === 'pending' && f.receiver_id === user.id) {
              const requester = f.requester ?? { id: f.requester_id, name: 'Пользователь' }
              incoming.push({ ...requester, friendship_id: f.id })
            }
          }
          setFriends(accepted)
          setIncomingRequests(incoming)
          console.log('[App] ✅ friends:', accepted.length, 'requests:', incoming.length)

          // ── start_param: отправляем заявку другу после полной инициализации ──
          const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ''
          if (startParam.startsWith('ref_')) {
            const refTelegramId = Number(startParam.slice(4))
            if (refTelegramId && refTelegramId !== tgUser.id) {
              const refUser = await getUserByTelegramId(refTelegramId)
              if (refUser) {
                await sendFriendRequest(user.id, refUser.id)
                console.log('[App] ✅ friend request sent to:', refUser.id)
              } else {
                console.warn('[App] ⚠ ref user not found:', refTelegramId)
              }
            }
          }
        } catch (socialErr) {
          console.warn('[App] ⚠ social load failed (non-fatal):', socialErr?.message)
        }
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
