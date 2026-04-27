import React, { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import {
  saveUser,
  getPeople,
  getMoments,
  getCapsule,
  getUserByPublicCode,
  findUserByTelegramIdSafe,
  sendFriendRequest,
  getFriendships,
  getSharedMoments,
  getFriendsFeedMoments,
  mergeMomentCollections,
  getPremiumStatus,
} from './lib/api'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/useAppStore'
import Splash from './pages/Splash'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Profile from './pages/Profile'
import ProfilePreview from './pages/ProfilePreview'
import People from './pages/People'
import MomentSaved from './pages/MomentSaved'
import PublicProfile from './pages/PublicProfile'
import { trackEvent } from './lib/analytics'

let hasTrackedAppOpened = false

const PersonDetail = lazy(() => import('./pages/PersonDetail'))
const MomentDetail = lazy(() => import('./pages/MomentDetail'))
const StoryPreview = lazy(() => import('./pages/StoryPreview'))
const StoryPreviewScreen = lazy(() => import('./pages/StoryPreviewScreen'))
const EditMoment = lazy(() => import('./pages/EditMoment'))

function RouteFallback() {
  return <div className="h-full w-full" style={{ backgroundColor: 'var(--base)' }} />
}

export default function App() {
  const navigate = useNavigate()
  const setPeople = useAppStore((s) => s.setPeople)
  const setMoments = useAppStore((s) => s.setMoments)
  const setCapsule = useAppStore((s) => s.setCapsule)
  const setInitResult = useAppStore((s) => s.setInitResult)
  const setFriends = useAppStore((s) => s.setFriends)
  const setIncomingRequests = useAppStore((s) => s.setIncomingRequests)
  const setIsPremium = useAppStore((s) => s.setIsPremium)
  const setOwnedThemes = useAppStore((s) => s.setOwnedThemes)
  const currentTheme = useAppStore((s) => s.currentTheme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.warn('[App] fallback timeout -> /home')
      navigate('/home', { replace: true })
    }, 5000)

    async function init() {
      try {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.ready()
          window.Telegram.WebApp.expand()
        }

        const rawInitData = window.Telegram?.WebApp?.initData
        const initData = rawInitData || (import.meta.env.DEV ? 'dev' : null)

        if (!initData) {
          clearTimeout(fallbackTimer)
          setInitResult({ id: null, name: 'Гость [A: нет initData]' }, false)
          navigate('/home', { replace: true })
          return
        }

        const authRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ initData }),
          },
        )

        if (!authRes.ok) {
          const errBody = await authRes.text().catch(() => '')
          console.error('[App] auth error', authRes.status, errBody)

          if (!import.meta.env.DEV) {
            let errMsg = ''
            try {
              errMsg = JSON.parse(errBody)?.error ?? errBody
            } catch {
              errMsg = errBody
            }

            clearTimeout(fallbackTimer)
            setInitResult({ id: null, name: `Гость [B:${authRes.status} ${errMsg}]` }, false)
            navigate('/home', { replace: true })
            return
          }

          console.warn('[App] auth failed in dev, continuing anyway')
        } else {
          const { access_token, refresh_token } = await authRes.json()
          await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? access_token,
          })
        }

        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
          ?? (import.meta.env.DEV ? { id: 12345, first_name: 'Dev', last_name: 'User' } : null)

        if (!tgUser) {
          clearTimeout(fallbackTimer)
          setInitResult({ id: null, name: 'Гость [C: нет user]' }, false)
          navigate('/home', { replace: true })
          return
        }

        const { user, isNew } = await saveUser(tgUser)

        const [fetchedPeople, fetchedMoments, fetchedCapsule, premiumStatus] = await Promise.all([
          getPeople(user.id),
          getMoments(user.id),
          getCapsule(user.id),
          getPremiumStatus(user.id).catch(() => ({ isPremium: false, premiumExpiresAt: null, ownedThemes: [] })),
        ])

        setPeople(fetchedPeople)
        setMoments(fetchedMoments)
        setCapsule(fetchedCapsule)
        setIsPremium(premiumStatus.isPremium, premiumStatus.premiumExpiresAt)
        setOwnedThemes(premiumStatus.ownedThemes)
        setInitResult(user, isNew)

        if (!hasTrackedAppOpened) {
          hasTrackedAppOpened = true
          void trackEvent('app_opened')
        }

        try {
          const [fetchedFriendships, fetchedShared] = await Promise.all([
            getFriendships(user.id),
            getSharedMoments(user.id),
          ])

          const accepted = []
          const incoming = []

          for (const friendship of fetchedFriendships) {
            if (friendship.status === 'accepted') {
              const friend = friendship.requester_id === user.id ? friendship.receiver : friendship.requester
              const fallbackFriend = {
                id: friendship.requester_id === user.id ? friendship.receiver_id : friendship.requester_id,
                name: 'Пользователь',
              }

              accepted.push({ ...(friend ?? fallbackFriend), friendship_id: friendship.id })
            } else if (friendship.status === 'pending' && friendship.receiver_id === user.id) {
              const requester = friendship.requester ?? { id: friendship.requester_id, name: 'Пользователь' }
              incoming.push({ ...requester, friendship_id: friendship.id })
            }
          }

          setFriends(accepted)
          setIncomingRequests(incoming)

          const friendFeed = accepted.length > 0
            ? await getFriendsFeedMoments(accepted.map((friend) => friend.id))
            : []

          setMoments(mergeMomentCollections(fetchedMoments, fetchedShared, friendFeed))

          const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ''
          if (startParam.startsWith('ref_')) {
            const refParam = startParam.slice(4)
            let refUser = null

            if (/^[0-9a-f]{64}$/i.test(refParam)) {
              refUser = await getUserByPublicCode(refParam)
            } else {
              const refTgId = Number(refParam)
              if (refTgId && refTgId !== tgUser.id) {
                refUser = await findUserByTelegramIdSafe(refTgId)
              }
            }

            if (refUser?.id && refUser.id !== user.id) {
              const friendship = await sendFriendRequest(user.id, refUser.id).catch(() => null)
              if (friendship?.id) {
                void trackEvent('friend_added', { source: 'invite' })
              }
            }
          }
        } catch (socialErr) {
          console.warn('[App] social load failed (non-fatal):', socialErr?.message)
        }

        clearTimeout(fallbackTimer)
        navigate(isNew ? '/onboarding' : '/home', { replace: true })
      } catch (err) {
        console.error('[App] init error:', err?.message)
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/preview" element={<ProfilePreview />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/moment/:id" element={<MomentDetail />} />
          <Route path="/moment-saved" element={<MomentSaved />} />
          <Route path="/story/:id" element={<StoryPreview />} />
          <Route path="/story-preview/:id" element={<StoryPreviewScreen />} />
          <Route path="/edit-moment/:id" element={<EditMoment />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </React.Fragment>
  )
}
