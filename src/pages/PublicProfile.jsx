import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import {
  getUserMomentsStats,
  getUserProfile,
  linkPersonToUser,
  removeFriend,
  sendFriendRequest,
} from '../lib/api'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import BottomSheet from '../components/BottomSheet'

function LinkIcon({ color = 'var(--soft)' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LinkPersonSheet({ targetUser, people, linkedPerson, onLink, onUnlink, onClose }) {
  const [saving, setSaving] = useState(false)

  async function handleLink(person) {
    if (saving) return

    setSaving(true)

    try {
      await onLink(person.id, targetUser.id)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  async function handleUnlink() {
    if (saving) return

    setSaving(true)

    try {
      await onUnlink(linkedPerson.id)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const availablePeople = people.filter((person) => person.id !== linkedPerson?.id)

  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 pb-2 flex flex-col gap-4">
        <p
          className="font-sans text-center font-medium"
          style={{ fontSize: 17, color: 'var(--text)' }}
        >
          Связать с человеком
        </p>

        {linkedPerson && (
          <div className="flex flex-col gap-2">
            <p
              className="font-sans text-center"
              style={{ fontSize: 13, color: 'var(--mid)' }}
            >
              Сейчас связан с <b style={{ color: 'var(--text)' }}>{linkedPerson.name}</b>
            </p>

            <button
              type="button"
              onClick={handleUnlink}
              disabled={saving}
              className="w-full font-sans font-medium transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--surface)',
                color: 'var(--mid)',
                borderRadius: 9999,
                padding: '11px 0',
                fontSize: 14,
                border: 'none',
              }}
            >
              {saving ? '...' : 'Отвязать'}
            </button>

            <p
              className="font-sans text-center"
              style={{ fontSize: 12, color: 'var(--soft)' }}
            >
              или выбери другого
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {availablePeople.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => handleLink(person)}
              disabled={saving}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--surface)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: person.avatar_color ?? 'var(--accent)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  person.name?.[0]?.toUpperCase()
                )}
              </div>

              <span
                className="font-sans flex-1 text-left"
                style={{ fontSize: 15, color: 'var(--text)' }}
              >
                {person.name}
              </span>
            </button>
          ))}

          {availablePeople.length === 0 && (
            <p
              className="font-sans text-center py-4"
              style={{ fontSize: 13, color: 'var(--mid)' }}
            >
              Нет людей для связи
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="font-sans transition-opacity active:opacity-60"
          style={{
            color: 'var(--mid)',
            fontSize: 14,
            background: 'none',
            border: 'none',
            paddingBottom: 4,
          }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''

  const date = new Date(createdAt)
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function formatMomentDate(createdAt) {
  if (!createdAt) return ''

  return new Date(createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PublicProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const friends = useAppStore((s) => s.friends)
  const setFriends = useAppStore((s) => s.setFriends)
  const people = useAppStore((s) => s.people) ?? []
  const updatePerson = useAppStore((s) => s.updatePerson)

  const [profileUser, setProfileUser] = useState(null)
  const [moments, setMoments] = useState([])
  const [momentStats, setMomentStats] = useState({ total: null, lastCreatedAt: null })
  const [loading, setLoading] = useState(true)
  const [friendSent, setFriendSent] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showLinkSheet, setShowLinkSheet] = useState(false)

  const friendEntry = friends.find((friend) => friend.id === userId)
  const isAlreadyFriend = Boolean(friendEntry)
  const linkedPerson = people.find((person) => person.linked_user_id === userId) ?? null

  useEffect(() => {
    if (currentUser?.id && currentUser.id === userId) {
      navigate('/profile', { replace: true })
      return
    }

    async function load() {
      setLoading(true)

      try {
        const [{ user, moments: publicMoments }, stats] = await Promise.all([
          getUserProfile(userId),
          getUserMomentsStats(userId).catch(() => ({ total: null, lastCreatedAt: null })),
        ])

        setProfileUser(user)
        setMoments(publicMoments)
        setMomentStats(stats)
      } catch {
        setProfileUser(null)
        setMoments([])
        setMomentStats({ total: null, lastCreatedAt: null })
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      load()
    }
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

    const targetName = profileUser?.name ?? 'пользователя'
    const confirmed = await new Promise((resolve) => {
      if (window.Telegram?.WebApp?.showConfirm) {
        window.Telegram.WebApp.showConfirm(`Удалить ${targetName} из друзей?`, resolve)
      } else {
        resolve(window.confirm(`Удалить ${targetName} из друзей?`))
      }
    })

    if (!confirmed) return

    setRemoving(true)

    try {
      await removeFriend(friendEntry.friendship_id)
      setFriends(friends.filter((friend) => friend.id !== userId))
      navigate(-1)
    } catch (error) {
      console.error('[PublicProfile] remove friend error:', error)
      setRemoving(false)
    }
  }

  async function handleLinkPerson(personId, linkedUserId) {
    try {
      const updated = await linkPersonToUser(personId, linkedUserId)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
    } catch (error) {
      console.error('[PublicProfile] link person error:', error)
    }
  }

  async function handleUnlinkPerson(personId) {
    try {
      const updated = await linkPersonToUser(personId, null)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
    } catch (error) {
      console.error('[PublicProfile] unlink person error:', error)
    }
  }

  if (loading) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center"
        style={{ backgroundColor: 'var(--base)' }}
      >
        <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>
          Загрузка...
        </p>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
        <div className="px-4 pt-topbar pb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text)' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <h1
            className="font-serif"
            style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--text)' }}
          >
            Профиль
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <p
            className="font-sans text-center"
            style={{ fontSize: 13, color: 'var(--mid)' }}
          >
            Пользователь не найден
          </p>
        </div>
      </div>
    )
  }

  const name = profileUser.name || 'Пользователь'
  const since = sinceLabel(profileUser.created_at)
  const totalMoments = momentStats.total ?? 0
  const publicMomentsCount = moments.length
  const friendButtonLabel = isAlreadyFriend
    ? (removing ? '...' : 'Удалить из друзей')
    : (friendSent ? 'Запрос отправлен' : 'Добавить в друзья')
  const friendButtonStyles = isAlreadyFriend || friendSent
    ? {
        backgroundColor: 'var(--surface)',
        color: 'var(--mid)',
      }
    : {
        backgroundColor: 'var(--accent)',
        color: '#fff',
      }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text)' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <h1
          className="font-serif"
          style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--text)' }}
        >
          Профиль
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
            style={{
              width: 54,
              height: 54,
              backgroundColor: profileUser.photo_url ? 'transparent' : 'var(--accent)',
              color: '#fff',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {profileUser.photo_url ? (
              <img
                src={profileUser.photo_url}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              name[0]?.toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1" style={{ paddingTop: 1 }}>
            <p
              className="font-serif"
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1.05,
              }}
            >
              {name}
            </p>

            {since && (
              <p
                className="font-sans"
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.35,
                  color: 'var(--mid)',
                }}
              >
                с memi с {since}
              </p>
            )}

            <p
              className="font-sans"
              style={{ marginTop: 6, fontSize: 14, color: 'var(--mid)' }}
            >
              {totalMoments} {pluralRu(totalMoments, 'момент', 'момента', 'моментов')} всего
            </p>
          </div>

          <button
            type="button"
            onClick={isAlreadyFriend ? handleRemoveFriend : handleAddFriend}
            disabled={removing || friendSent}
            className="font-sans transition-all duration-150 ease-out active:opacity-70"
            style={{
              marginTop: 12,
              border: 'none',
              borderRadius: 9999,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              ...friendButtonStyles,
            }}
          >
            {friendButtonLabel}
          </button>
        </div>

        {people.length > 0 && (
          <button
            type="button"
            onClick={() => (
              linkedPerson
                ? navigate(`/people/${linkedPerson.id}`)
                : setShowLinkSheet(true)
            )}
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{
              marginTop: 18,
              background: 'none',
              border: 'none',
              padding: 0,
              color: linkedPerson ? 'var(--accent)' : 'var(--soft)',
            }}
          >
            <LinkIcon color={linkedPerson ? 'var(--soft)' : 'var(--soft)'} />
            <span className="font-sans" style={{ fontSize: 14 }}>
              {linkedPerson ? `Связан с «${linkedPerson.name}»` : 'Связать с человеком'}
            </span>
          </button>
        )}

        <div
          className="flex flex-col items-center justify-center"
          style={{
            marginTop: 18,
            minHeight: 86,
            borderRadius: 16,
            backgroundColor: 'var(--surface)',
          }}
        >
          <span
            className="font-serif"
            style={{
              fontSize: 36,
              lineHeight: 1,
              fontWeight: 600,
              color: 'var(--accent)',
            }}
          >
            {publicMomentsCount}
          </span>
          <span
            className="font-sans"
            style={{ marginTop: 6, fontSize: 14, color: 'var(--mid)' }}
          >
            открытых моментов
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <h2
            className="font-sans"
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Моменты пользователя
          </h2>

          {moments.length === 0 ? (
            <p
              className="font-sans text-center"
              style={{
                padding: '48px 24px 0',
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--mid)',
              }}
            >
              Пока он не открыл воспоминания для всех
            </p>
          ) : (
            <div className="flex flex-col gap-3" style={{ marginTop: 14 }}>
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  className="flex items-center gap-3"
                  style={{
                    borderRadius: 16,
                    backgroundColor: 'var(--surface)',
                    padding: '12px 13px',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: moment.photo_url
                        ? 'none'
                        : 'linear-gradient(135deg, #E8D5C0, #C8A880)',
                    }}
                  >
                    {moment.photo_url && (
                      <img
                        src={moment.photo_url}
                        alt={moment.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="font-sans font-medium"
                      style={{
                        fontSize: 15,
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {moment.title || 'Без названия'}
                    </p>

                    <p
                      className="font-sans"
                      style={{ marginTop: 3, fontSize: 12, color: 'var(--mid)' }}
                    >
                      {formatMomentDate(moment.created_at)}
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
