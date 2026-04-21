import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import {
  getUserProfile,
  linkPersonToUser,
  removeFriend,
  sendFriendRequest,
} from '../lib/api'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'

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

function compactSinceLabel(createdAt) {
  if (!createdAt) return 'сейчас'

  const value = new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(createdAt))

  return value
    .replace(/\u00A0/g, ' ')
    .replace(/\s*г\.$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function TrashIcon({ color = 'currentColor' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 3h6" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M18 7l-1 12a2 2 0 0 1-2 1H9a2 2 0 0 1-2-1L6 7"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v5M14 11v5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon({ color = '#3D2B1A' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="18" cy="12" r="1.8" fill={color} />
    </svg>
  )
}

const NATIVE_CHECK_VALUE_STYLE = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 34,
  fontWeight: 500,
  letterSpacing: '-0.04em',
  lineHeight: 0.95,
}

function FriendMenuAction({ label, danger = false, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60 disabled:opacity-60"
      style={{
        border: 'none',
        backgroundColor: danger ? 'rgba(217, 64, 64, 0.07)' : 'var(--base)',
        marginBottom: 10,
        padding: '16px 18px',
      }}
    >
      <div
        className="flex items-center justify-center rounded-[14px]"
        style={{
          width: 40,
          height: 40,
          backgroundColor: danger ? 'rgba(217, 64, 64, 0.12)' : 'var(--accent-light)',
          color: danger ? '#D94040' : 'var(--mid)',
          flexShrink: 0,
        }}
      >
        {children}
      </div>

      <span
        className="font-sans"
        style={{
          color: danger ? '#D94040' : 'var(--text)',
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </button>
  )
}

function FriendActionsSheet({ removing, onRemove, onClose }) {
  return (
    <BottomSheet onClose={onClose} title="Друг">
      <div className="px-5 pb-4">
        <FriendMenuAction
          danger
          onClick={onRemove}
          disabled={removing}
        >
          <TrashIcon color="#D45757" />
          {removing ? 'Удаляем...' : 'Удалить из друзей'}
        </FriendMenuAction>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--mid)',
            fontSize: 15,
            fontWeight: 500,
            padding: '8px 0 4px',
          }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

function FeaturedMomentCard({ moment }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--moment-surface)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 3',
          background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
        }}
      >
        {moment.photo_url && (
          <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.55) 0%, transparent 58%)' }} />

        <div style={{ position: 'absolute', left: 14, bottom: 14 }}>
          <div
            className="font-sans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.9)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 11px',
            }}
          >
            Главное воспоминание
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <p
          className="font-sans"
          style={{
            margin: 0,
            color: 'var(--text)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {moment.title || 'Без названия'}
        </p>
        <p className="font-sans" style={{ marginTop: 4, fontSize: 12, color: 'var(--mid)' }}>
          {sinceLabel(moment.created_at)}
        </p>
      </div>
    </div>
  )
}

export function PublicProfileContent({
  profileUser,
  moments = [],
  publicMomentsTotal,
  displayName,
  people = [],
  linkedPerson = null,
  onLinkedPersonPress,
  onLinkPersonPress,
  actionButton = null,
  statusStat = null,
  topContent = null,
  contentPaddingBottom = 40,
}) {
  if (!profileUser) return null

  const name = displayName || linkedPerson?.name || profileUser.name || 'Пользователь'
  const since = sinceLabel(profileUser.created_at)
  const profileEnabled = profileUser.public_profile_enabled === true
  const bio = profileEnabled ? profileUser.bio?.trim() ?? '' : ''
  const featuredMoment = profileEnabled
    ? moments.find((moment) => moment.id === profileUser.featured_moment_id) ?? null
    : null
  const listMoments = featuredMoment
    ? moments.filter((moment) => moment.id !== featuredMoment.id)
    : moments
  const totalMoments = profileEnabled ? (publicMomentsTotal ?? moments.length) : 0
  const showMomentsSection = !profileEnabled || listMoments.length > 0 || (!featuredMoment && moments.length === 0)
  const showLinkControl = linkedPerson
    ? people.length > 0 && typeof onLinkedPersonPress === 'function'
    : people.length > 0 && typeof onLinkPersonPress === 'function'
  const resolvedStatusStat = statusStat ?? (
    profileEnabled
      ? { value: '✓', label: 'открыт', valueColor: 'var(--deep)', valueStyle: NATIVE_CHECK_VALUE_STYLE }
      : { value: '○', label: 'скрыт', valueColor: 'var(--soft)' }
  )
  const stats = [
    {
      value: String(totalMoments),
      label: pluralRu(totalMoments, 'момент', 'момента', 'моментов'),
      valueColor: 'var(--accent)',
    },
    {
      value: compactSinceLabel(profileUser.created_at),
      label: 'с нами с',
      valueColor: 'var(--accent)',
    },
    resolvedStatusStat,
  ]

  return (
    <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: contentPaddingBottom }}>
      {topContent && <div style={{ marginTop: 20, marginBottom: 12 }}>{topContent}</div>}

      <div
        style={{
          marginTop: topContent ? 0 : 20,
          backgroundColor: 'var(--moment-surface)',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 10px 28px rgba(80,50,30,0.14)',
        }}
      >
        <div
          style={{
            height: 96,
            background: `
              radial-gradient(circle at top right, rgba(255,255,255,0.34), transparent 34%),
              linear-gradient(180deg, var(--deep) 0%, var(--accent) 56%, var(--accent-light) 100%)
            `,
          }}
        />

        <div style={{ padding: '0 18px 18px' }}>
          <div className="flex items-end gap-3" style={{ marginTop: -34 }}>
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
            style={{
              width: 68,
              height: 68,
              background: 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 100%)',
              color: '#fff',
              fontSize: 26,
              fontWeight: 700,
              border: '4px solid var(--moment-surface)',
              boxShadow: '0 6px 18px rgba(80,50,30,0.18)',
            }}
          >
            {profileUser.photo_url ? (
              <img
                src={profileUser.photo_url}
                alt={name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span>{name[0]?.toUpperCase()}</span>
            )}
          </div>

          </div>

          <div style={{ marginTop: 14 }}>
            <p
              className="font-sans"
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.08,
                color: 'var(--text)',
              }}
            >
              {name}
            </p>

            {since && (
              <p
                className="font-sans"
                style={{
                  marginTop: 8,
                  paddingLeft: 14,
                  fontSize: 13,
                  color: 'var(--mid)',
                  backgroundImage: 'radial-gradient(circle, var(--accent) 0 55%, transparent 56%)',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '0 50%',
                  backgroundSize: '6px 6px',
                }}
              >
                с memi с {since}
              </p>
            )}

            {bio && (
              <p
                className="font-sans"
                style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}
              >
                {bio}
              </p>
            )}

            <p
              className="font-sans"
              style={{ display: 'none' }}
            >
              {totalMoments} {pluralRu(totalMoments, 'момент', 'момента', 'моментов')} всего
            </p>
          </div>

        {showLinkControl && (
          <button
            type="button"
            onClick={linkedPerson ? onLinkedPersonPress : onLinkPersonPress}
            className="inline-flex items-center gap-2 transition-opacity active:opacity-60"
            style={{
              marginTop: bio ? 12 : 14,
              backgroundColor: linkedPerson ? 'rgba(217, 139, 82, 0.1)' : 'var(--base)',
              border: '1px solid rgba(160, 94, 44, 0.12)',
              borderRadius: 9999,
              padding: '8px 12px',
              color: linkedPerson ? 'var(--accent)' : 'var(--mid)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <LinkIcon color={linkedPerson ? 'var(--accent)' : 'var(--soft)'} />
            <span className="font-sans">
              {linkedPerson ? `Связан с «${linkedPerson.name}»` : 'Связать с человеком'}
            </span>
          </button>
        )}

          <div
            style={{
              marginTop: 16,
              backgroundColor: 'var(--base)',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(160, 94, 44, 0.08)',
            }}
          >
            <div className="grid grid-cols-3">
              {stats.map((item, index) => {
                const isLongValue = String(item.value).length > 6

                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex flex-col items-center justify-center"
                    style={{
                      minHeight: 90,
                      padding: '14px 10px 13px',
                      borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)',
                    }}
                  >
                    <span
                      className="font-sans"
                      style={{
                        color: item.valueColor ?? 'var(--accent)',
                        fontSize: isLongValue ? 20 : 30,
                        fontWeight: 700,
                        lineHeight: 1.05,
                        textAlign: 'center',
                        ...(item.valueStyle ?? {}),
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      className="font-sans"
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        fontWeight: 500,
                        lineHeight: 1.25,
                        color: 'var(--mid)',
                        textAlign: 'center',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {actionButton && (
            <div
              className="flex items-center justify-center"
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--divider)',
              }}
            >
              {actionButton}
            </div>
          )}
        </div>
      </div>

      {featuredMoment && (
        <div style={{ marginTop: 20 }}>
          <h2
            className="font-sans"
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Главное воспоминание
          </h2>

          <FeaturedMomentCard moment={featuredMoment} />
        </div>
      )}

      {showMomentsSection && (
        <div style={{ marginTop: 20 }}>
          <h2
            className="font-sans"
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Моменты пользователя
          </h2>

          {!profileEnabled || listMoments.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--moment-surface)',
                borderRadius: 20,
                padding: '36px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <div
                className="font-sans"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 6,
                }}
              >
                {!profileEnabled ? 'Профиль закрыт' : 'Воспоминания закрыты'}
              </div>
              <div
                className="font-sans"
                style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--mid)' }}
              >
                {!profileEnabled ? 'Пока пользователь не показывает публичный профиль.' : 'Пока он не открыл воспоминания для всех'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listMoments.map((moment) => (
                <div
                  key={moment.id}
                  className="flex items-center gap-3"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderRadius: 18,
                    padding: '12px 13px',
                    boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
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
                    {moment.photo_url ? (
                      <img
                        src={moment.photo_url}
                        alt={moment.title || 'Момент'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p
                      className="font-sans"
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
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
                      {sinceLabel(moment.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  const [publicMomentsTotal, setPublicMomentsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [friendSent, setFriendSent] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)

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
        const { user, moments: publicMoments, total } = await getUserProfile(userId)

        setProfileUser(user)
        setMoments(publicMoments)
        setPublicMomentsTotal(total ?? 0)
      } catch {
        setProfileUser(null)
        setMoments([])
        setPublicMomentsTotal(0)
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

    setShowActionsSheet(false)
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
        <div className="px-4 pt-topbar">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                color: 'var(--mid)',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <svg
                width="10"
                height="16"
                viewBox="0 0 10 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 2L2 8l6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Назад
            </button>

            <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
              Профиль
            </span>

            <div style={{ width: 60 }} />
          </div>
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

  const friendButtonLabel = friendSent ? 'Запрос отправлен' : 'Добавить в друзья'
  const relationshipStat = isAlreadyFriend
    ? { value: '✓', label: 'друг', valueColor: 'var(--deep)', valueStyle: NATIVE_CHECK_VALUE_STYLE }
    : friendSent
      ? { value: '…', label: 'запрос', valueColor: 'var(--mid)' }
      : { value: '+', label: 'добавить', valueColor: 'var(--accent)' }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0',
              color: 'var(--mid)',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            <svg
              width="10"
              height="16"
              viewBox="0 0 10 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 2L2 8l6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Назад
          </button>

          <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
            Профиль
          </span>

          <div className="flex justify-end" style={{ width: 60 }}>
            {isAlreadyFriend ? (
              <button
                type="button"
                aria-label="Открыть меню профиля"
                onClick={() => setShowActionsSheet(true)}
                disabled={removing}
                className="flex items-center justify-center transition-opacity active:opacity-60"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(160, 94, 44, 0.12)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <MoreIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <PublicProfileContent
        profileUser={profileUser}
        moments={moments}
        publicMomentsTotal={publicMomentsTotal}
        displayName={friendEntry?.name || linkedPerson?.name || profileUser.name || 'Пользователь'}
        people={people}
        linkedPerson={linkedPerson}
        onLinkedPersonPress={() => navigate(`/people/${linkedPerson.id}`)}
        onLinkPersonPress={() => setShowLinkSheet(true)}
        statusStat={relationshipStat}
        actionButton={!isAlreadyFriend ? (
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={friendSent}
            className="inline-flex items-center justify-center gap-2 font-sans transition-all duration-150 ease-out active:opacity-70"
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              fontSize: 14,
              fontWeight: 500,
              color: friendSent ? 'var(--mid)' : 'var(--accent)',
            }}
          >
            {friendButtonLabel}
          </button>
        ) : null}
      />

      {showActionsSheet && isAlreadyFriend && (
        <FriendActionsSheet
          removing={removing}
          onRemove={handleRemoveFriend}
          onClose={() => setShowActionsSheet(false)}
        />
      )}

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
