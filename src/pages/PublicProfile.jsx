import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { getUserProfile, sendFriendRequest, removeFriend, getSharedMomentsWithFriend, linkPersonToUser, getUserMomentsStats } from '../lib/api'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import BottomSheet from '../components/BottomSheet'

function LinkPersonSheet({ targetUser, people, linkedPerson, onLink, onUnlink, onClose }) {
  const [saving, setSaving] = useState(false)

  async function handleLink(person) {
    if (saving) return
    setSaving(true)
    try { await onLink(person.id, targetUser.id) } finally { setSaving(false); onClose() }
  }

  async function handleUnlink() {
    if (saving) return
    setSaving(true)
    try { await onUnlink(linkedPerson.id) } finally { setSaving(false); onClose() }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 flex flex-col gap-4 pb-2">
        <p className="font-sans text-center font-medium" style={{ fontSize: 17, color: 'var(--text)' }}>
          Связать с человеком
        </p>

        {linkedPerson && (
          <div className="flex flex-col gap-2">
            <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)', textAlign: 'center' }}>
              Сейчас связан с <b style={{ color: 'var(--text)' }}>{linkedPerson.name}</b>
            </p>
            <button
              onClick={handleUnlink}
              disabled={saving}
              className="w-full font-sans font-medium transition-opacity active:opacity-70"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--mid)', borderRadius: 9999, padding: '11px 0', fontSize: 14, border: 'none' }}
            >
              {saving ? '...' : 'Отвязать'}
            </button>
            <p className="font-sans text-center" style={{ fontSize: 12, color: 'var(--soft)' }}>или выбери другого</p>
          </div>
        )}

        <div className="flex flex-col gap-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {people.filter((p) => p.id !== linkedPerson?.id).map((p) => (
            <button
              key={p.id}
              onClick={() => handleLink(p)}
              disabled={saving}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full transition-opacity active:opacity-70"
              style={{ backgroundColor: 'var(--surface)', border: 'none', cursor: 'pointer' }}
            >
              <div
                className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                style={{ width: 40, height: 40, backgroundColor: p.avatar_color ?? 'var(--accent)', color: '#fff', fontSize: 16, overflow: 'hidden' }}
              >
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.name?.[0]?.toUpperCase()}
              </div>
              <span className="font-sans flex-1 text-left" style={{ fontSize: 15, color: 'var(--text)' }}>{p.name}</span>
            </button>
          ))}
          {people.filter((p) => p.id !== linkedPerson?.id).length === 0 && (
            <p className="font-sans text-center py-4" style={{ fontSize: 13, color: 'var(--mid)' }}>Нет людей для связи</p>
          )}
        </div>

        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}>
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

function daysAgoLabel(createdAt) {
  if (!createdAt) return null
  const diffDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (diffDays === 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  return `${diffDays} ${pluralRu(diffDays, 'день', 'дня', 'дней')} назад`
}

export default function PublicProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const currentUser  = useAppStore((s) => s.currentUser)
  const friends      = useAppStore((s) => s.friends)
  const setFriends   = useAppStore((s) => s.setFriends)
  const people       = useAppStore((s) => s.people)       ?? []
  const updatePerson = useAppStore((s) => s.updatePerson)

  const [profileUser, setProfileUser] = useState(null)
  const [moments, setMoments] = useState([])
  const [sharedMoments, setSharedMoments] = useState([])
  const [momentStats, setMomentStats] = useState({ total: null, lastCreatedAt: null })
  const [loading, setLoading] = useState(true)
  const [friendSent, setFriendSent] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showLinkSheet, setShowLinkSheet] = useState(false)

  const friendEntry     = friends.find((f) => f.id === userId)
  const isAlreadyFriend = Boolean(friendEntry)
  const linkedPerson    = people.find((p) => p.linked_user_id === userId) ?? null

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
      // Non-blocking parallel fetches
      const extras = []
      extras.push(
        getUserMomentsStats(userId)
          .then((stats) => setMomentStats(stats))
          .catch(() => {})
      )
      if (currentUser?.id) {
        extras.push(
          getSharedMomentsWithFriend(currentUser.id, userId)
            .then((shared) => setSharedMoments(shared))
            .catch(() => {})
        )
      }
      await Promise.allSettled(extras)
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

  async function handleLinkPerson(personId, linkedUserId) {
    try {
      const updated = await linkPersonToUser(personId, linkedUserId)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
      const shared = await getSharedMomentsWithFriend(currentUser.id, userId)
      setSharedMoments(shared)
    } catch (err) {
      console.error('[PublicProfile] link person error:', err)
    }
  }

  async function handleUnlinkPerson(personId) {
    try {
      const updated = await linkPersonToUser(personId, null)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
      setSharedMoments([])
    } catch (err) {
      console.error('[PublicProfile] unlink person error:', err)
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
          <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Профиль</h2>
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
        <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Профиль</h2>
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
            <p className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{name}</p>
            {since && (
              <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>с memi с {since}</p>
            )}
            {momentStats.total !== null && (
              <div className="flex flex-col mt-1 gap-0.5">
                <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>
                  {momentStats.total} {pluralRu(momentStats.total, 'момент', 'момента', 'моментов')} всего
                </p>
                {momentStats.lastCreatedAt && (
                  <p className="font-sans" style={{ fontSize: 12, color: 'var(--soft)' }}>
                    Последний: {daysAgoLabel(momentStats.lastCreatedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
          {isAlreadyFriend ? (
            <button
              onClick={handleRemoveFriend}
              disabled={removing}
              className="font-sans transition-all duration-150 ease-out active:scale-[0.96] active:opacity-70"
              style={{
                fontSize: 13,
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
              className="font-sans transition-all duration-150 ease-out active:scale-[0.96] active:opacity-80"
              style={{
                fontSize: 13,
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

        {/* Связь с человеком */}
        {people.length > 0 && (
          <button
            onClick={() => linkedPerson ? navigate(`/people/${linkedPerson.id}`) : setShowLinkSheet(true)}
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', padding: 0, alignSelf: 'flex-start' }}
          >
            <span style={{ fontSize: 16, color: linkedPerson ? 'var(--accent)' : 'var(--soft)' }}>
              {linkedPerson ? '🔗' : '○'}
            </span>
            <span className="font-sans" style={{ fontSize: 14, color: linkedPerson ? 'var(--accent)' : 'var(--soft)' }}>
              {linkedPerson ? `Связан с «${linkedPerson.name}»` : 'Связать с человеком'}
            </span>
          </button>
        )}

        {/* Stats */}
        <div
          className="flex flex-col items-center py-4 rounded-xl"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <span className="font-serif" style={{ fontSize: 31, color: 'var(--accent)', fontWeight: 700, lineHeight: 1.1 }}>
            {moments.length}
          </span>
          <span className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>открытых моментов</span>
        </div>

        {/* Общие моменты */}
        {sharedMoments.length > 0 && (
          <div>
            {/* First shared moment highlight */}
            <p className="font-sans font-medium mb-2" style={{ fontSize: 12, color: 'var(--soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ✨ Ваше общее воспоминание
            </p>
            <div
              className="flex items-center gap-3 rounded-xl mb-4"
              style={{ backgroundColor: 'var(--surface)', padding: '14px 14px' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                background: sharedMoments[0].photo_url ? 'none' : 'linear-gradient(135deg, #E8D5C0, #C8A880)',
              }}>
                {sharedMoments[0].photo_url && (
                  <img src={sharedMoments[0].photo_url} alt={sharedMoments[0].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-medium" style={{ fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sharedMoments[0].title || 'Без названия'}
                </p>
                <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>
                  {sinceLabel(sharedMoments[0].created_at)}
                </p>
              </div>
            </div>

            {sharedMoments.length > 1 && (
              <>
                <p className="font-sans font-medium mb-2" style={{ fontSize: 14, color: 'var(--text)' }}>
                  🤝 Ваши воспоминания вместе
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
                  {sharedMoments.slice(1).map((m) => (
                    <div
                      key={m.id}
                      className="flex-shrink-0 rounded-xl overflow-hidden"
                      style={{ width: 140, backgroundColor: 'var(--surface)' }}
                    >
                      <div style={{
                        width: '100%', height: 90, overflow: 'hidden',
                        background: m.photo_url ? 'none' : 'linear-gradient(135deg, #E8D5C0, #C8A880)',
                      }}>
                        {m.photo_url && (
                          <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <p className="font-sans font-medium" style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title || 'Без названия'}
                        </p>
                        <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                          {sinceLabel(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Moments list */}
        <div>
          <p className="font-sans font-medium mb-3" style={{ fontSize: 14, color: 'var(--text)' }}>
            Моменты пользователя
          </p>

          {moments.length === 0 ? (
            <p className="font-sans text-center py-8" style={{ fontSize: 14, color: 'var(--mid)' }}>
              Пока он не открыл воспоминания для всех
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
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title || 'Без названия'}
                    </p>
                    <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>
                      {sinceLabel(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLinkSheet && profileUser && (
        <LinkPersonSheet
          targetUser={profileUser}
          people={people}
          linkedPerson={linkedPerson}
          onLink={handleLinkPerson}
          onUnlink={handleUnlinkPerson}
          onClose={() => setShowLinkSheet(false)}
        />
      )}
    </div>
  )
}
