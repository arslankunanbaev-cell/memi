import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { getUserProfile, sendFriendRequest, removeFriend } from '../lib/api'
import { MONTHS_GENITIVE } from '../lib/ruPlural'

function sinceLabel(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

export default function PublicProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const friends     = useAppStore((s) => s.friends)
  const setFriends  = useAppStore((s) => s.setFriends)

  const [profileUser, setProfileUser] = useState(null)
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [friendSent, setFriendSent] = useState(false)
  const [removing, setRemoving] = useState(false)

  const friendEntry   = friends.find((f) => f.id === userId)
  const isAlreadyFriend = Boolean(friendEntry)

  useEffect(() => {
    // If viewing own profile, redirect to /profile
    if (currentUser?.id && currentUser.id === userId) {
      navigate('/profile', { replace: true })
      return
    }

    async function load() {
      try {
        const { user, moments: publicMoments } = await getUserProfile(userId)
        setProfileUser(user)
        setMoments(publicMoments)
      } catch {
        setProfileUser(null)
        setMoments([])
      } finally {
        setLoading(false)
      }
    }

    if (userId) load()
  }, [userId, currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddFriend() {
    if (!currentUser?.id || !userId) return
    try {
      await sendFriendRequest(currentUser.id, userId)
      setFriendSent(true)
    } catch {
      // silently fail
    }
  }

  async function handleRemoveFriend() {
    if (!friendEntry?.friendship_id || removing) return
    const confirmed = await new Promise((resolve) => {
      if (window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(
          `Удалить ${profileUser?.name ?? 'пользователя'} из друзей?`,
          resolve,
        )
      } else {
        resolve(window.confirm(`Удалить ${profileUser?.name ?? 'пользователя'} из друзей?`))
      }
    })
    if (!confirmed) return
    setRemoving(true)
    try {
      await removeFriend(friendEntry.friendship_id)
      setFriends(friends.filter((f) => f.id !== userId))
      navigate(-1)
    } catch (err) {
      console.error('[PublicProfile] remove friend error:', err)
      setRemoving(false)
    }
  }

  const name = profileUser?.name || 'Пользователь'
  const since = sinceLabel(profileUser?.created_at)

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: 'var(--base)' }}>
        <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>Загрузка...</p>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
        <div className="px-4 pb-3 pt-topbar flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Профиль</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="font-sans text-center" style={{ fontSize: 13, color: 'var(--mid)' }}>Пользователь не найден</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div className="px-4 pb-3 pt-topbar flex items-center gap-3">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Профиль</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-4">
        {/* Avatar + name + friend button */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
            style={{ width: 52, height: 52, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 20, fontWeight: 300, overflow: 'hidden' }}
          >
            {profileUser.photo_url ? (
              <img
                src={profileUser.photo_url}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              name[0]?.toUpperCase() ?? 'M'
            )}
          </div>
          <div className="flex-1">
            <p className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{name}</p>
            {since && (
              <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>с memi с {since}</p>
            )}
          </div>
          {isAlreadyFriend ? (
            <button
              onClick={handleRemoveFriend}
              disabled={removing}
              className="font-sans transition-opacity active:opacity-60"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--mid)',
                backgroundColor: 'var(--surface)',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                flexShrink: 0,
              }}
            >
              {removing ? '...' : 'Удалить из друзей'}
            </button>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={friendSent}
              className="font-sans transition-opacity active:opacity-60"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: friendSent ? 'var(--mid)' : '#fff',
                backgroundColor: friendSent ? 'var(--surface)' : 'var(--accent)',
                border: 'none',
                borderRadius: 20,
                padding: '6px 14px',
                flexShrink: 0,
              }}
            >
              {friendSent ? 'Запрос отправлен' : 'Добавить в друзья'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div
          className="flex flex-col items-center py-4 rounded-xl"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <span className="font-serif" style={{ fontSize: 31, color: 'var(--accent)', fontWeight: 700, lineHeight: 1.1 }}>
            {moments.length}
          </span>
          <span className="font-sans" style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>открытых моментов</span>
        </div>

        {/* Moments list */}
        <div>
          <p className="font-sans font-medium mb-3" style={{ fontSize: 13, color: 'var(--text)' }}>
            Моменты пользователя
          </p>

          {moments.length === 0 ? (
            <p className="font-sans text-center py-8" style={{ fontSize: 13, color: 'var(--mid)' }}>
              Нет открытых воспоминаний
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {moments.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl"
                  style={{ backgroundColor: 'var(--surface)', padding: '12px 14px' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    background: m.photo_url ? 'none' : 'linear-gradient(135deg, #E8D5C0, #C8A880)',
                  }}>
                    {m.photo_url && (
                      <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title || 'Без названия'}
                    </p>
                    <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>
                      {sinceLabel(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
