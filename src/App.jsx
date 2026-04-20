import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { saveUser, getPeople, getMoments, getCapsule, getUserByPublicCode, findUserByTelegramIdSafe, sendFriendRequest, getFriendships, getSharedMoments } from './lib/api'
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
import PublicProfile from './pages/PublicProfile'

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

        // ── Валидируем Telegram initData через Edge Function ──────────────────
        // Fail-closed: в production без валидной auth сессии дальше не идём.
        const rawInitData = window.Telegram?.WebApp?.initData
        const initData = rawInitData || (import.meta.env.DEV ? 'dev' : null)

        if (!initData) {
          // production без initData — невалидный контекст
          clearTimeout(fallbackTimer)
          setInitResult({ id: null, name: 'Гость [A: нет initData]' }, false)
          navigate('/home', { replace: true })
          return
        }

        const authRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
          {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body:    JSON.stringify({ initData }),
          }
        )

        if (!authRes.ok) {
          const errBody = await authRes.text().catch(() => '')
          console.error('[App] auth error', authRes.status, errBody)
          if (!import.meta.env.DEV) {
            let errMsg = ''
            try { errMsg = JSON.parse(errBody)?.error ?? errBody } catch { errMsg = errBody }
            clearTimeout(fallbackTimer)
            setInitResult({ id: null, name: `Гость [B:${authRes.status} ${errMsg}]` }, false)
            navigate('/home', { replace: true })
            return
          }
          console.warn('[App] auth failed in dev, continuing anyway')
        } else {
          const { access_token, refresh_token } = await authRes.json()
          const { supabase } = await import('./lib/supabase')
          await supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? access_token })
        }

        // Сохраняем / получаем пользователя из БД
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
          ?? (import.meta.env.DEV ? { id: 12345, first_name: 'Dev', last_name: 'User' } : null)

        if (!tgUser) {
          clearTimeout(fallbackTimer)
          setInitResult({ id: null, name: 'Гость [C: нет user]' }, false)
          navigate('/home', { replace: true })
          return
        }

        const { user, isNew } = await saveUser(tgUser)

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

          // ── start_param: send friend request after full init ───────────────
          const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ''
          if (startParam.startsWith('ref_')) {
            const refParam = startParam.slice(4)
            let refUser = null
            if (/^[0-9a-f]{64}$/i.test(refParam)) {
              // New format: public_code (SHA-256 hex, 64 chars)
              refUser = await getUserByPublicCode(refParam)
            } else {
              // Old format: numeric telegram_id — backward compat via safe RPC
              const refTgId = Number(refParam)
              if (refTgId && refTgId !== tgUser.id) {
                refUser = await findUserByTelegramIdSafe(refTgId)
              }
            }
            if (refUser?.id && refUser.id !== user.id) {
              await sendFriendRequest(user.id, refUser.id).catch(() => {})
            }
          }
        } catch (socialErr) {
          console.warn('[App] ⚠ social load failed (non-fatal):', socialErr?.message)
        }

        // Навигация — вся логика здесь, Splash ничего не решает
        clearTimeout(fallbackTimer)
        navigate(isNew ? '/onboarding' : '/home', { replace: true })

      } catch (err) {
        console.error('[App] init error:', err?.message)
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
    <React.Fragment>
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
        <Route path="/profile/:userId"   element={<PublicProfile />} />
        <Route path="*"                  element={<Navigate to="/" replace />} />
      </Routes>
    </React.Fragment>
  )
}
