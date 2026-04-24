import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import {
  getUserProfile,
  linkPersonToUser,
  removeFriend,
  sendFriendRequest,
} from '../lib/api'
import { trackEvent } from '../lib/analytics'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
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

function EmptyStateLockIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10V7.75A5 5 0 0 1 17 7.75V10"
        stroke="var(--soft)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.5"
        fill="rgba(217, 139, 82, 0.16)"
        stroke="var(--accent)"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="15" r="1.2" fill="var(--deep)" />
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
      <div className="px-4 pb-2 flex flex-col gap-5">
        <p
          className="font-sans text-center font-medium"
          style={{ fontSize: 17, color: 'var(--text)' }}
        >
          Связать с человеком
        </p>

        {linkedPerson && (
          <div className="flex flex-col gap-3">
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

        <div className="flex flex-col gap-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
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

function uniqueMonths(moments) {
  return new Set(
    (moments ?? []).map((moment) => {
      const date = new Date(getMomentDisplayAt(moment))
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

function _compactSinceLabel(createdAt) {
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
      <div className="px-4 pb-4">
        <FriendMenuAction
          label={removing ? 'Удаляем...' : 'Удалить из друзей'}
          danger
          onClick={onRemove}
          disabled={removing}
        >
          <TrashIcon color="#D45757" />
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

function FeaturedMomentCard({ moment, onClick }) {
  const CardTag = onClick ? 'button' : 'div'

  return (
    <CardTag
      {...(onClick
        ? {
            type: 'button',
            onClick,
            className: 'w-full text-left transition-transform duration-150 ease-out active:scale-[0.99]',
            style: {
              border: 'none',
              padding: 0,
              background: 'none',
            },
          }
        : {})}
    >
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
            {sinceLabel(getMomentDisplayAt(moment))}
          </p>
        </div>
      </div>
    </CardTag>
  )
}

function SharedMomentRow({ moment, sourceLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 text-left transition-opacity active:opacity-70"
      style={{
        border: 'none',
        backgroundColor: 'var(--base)',
        borderRadius: 18,
        padding: '12px 13px',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
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

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className="font-sans"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.35,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {moment.title || 'Без названия'}
          </p>

          {sourceLabel && (
            <span
              className="font-sans type-meta"
              style={{
                flexShrink: 0,
                borderRadius: 999,
                backgroundColor: 'rgba(217, 139, 82, 0.12)',
                color: 'var(--deep)',
                padding: '4px 9px',
              }}
            >
              {sourceLabel}
            </span>
          )}
        </div>

        <p
          className="font-sans"
          style={{
            marginTop: 4,
            fontSize: 12,
            color: 'var(--mid)',
          }}
        >
          {sinceLabel(getMomentDisplayAt(moment))}
        </p>
      </div>
    </button>
  )
}

export function PublicProfileContent({
  profileUser,
  moments = [],
  publicMomentsTotal,
  stats = null,
  displayName,
  people = [],
  linkedPerson = null,
  onLinkedPersonPress,
  onLinkPersonPress,
  actionButton = null,
  topContent = null,
  contentPaddingBottom = 40,
  sharedMoments = [],
  showSharedMomentsSection = false,
  onMomentPress,
  onSharedMomentPress,
  canViewFriendMoments = false,
}) {
  if (!profileUser) return null

  const name = displayName || linkedPerson?.name || profileUser.name || 'Пользователь'
  const since = null
  const profileEnabled = profileUser.public_profile_enabled === true
  const bio = profileEnabled ? profileUser.bio?.trim() ?? '' : ''
  const featuredMoment = profileEnabled
    ? moments.find((moment) => moment.id === profileUser.featured_moment_id) ?? null
    : null
  const listMoments = featuredMoment
    ? moments.filter((moment) => moment.id !== featuredMoment.id)
    : moments
  const totalMoments = profileEnabled ? (stats?.moments ?? publicMomentsTotal ?? moments.length) : 0
  const totalMonths = profileEnabled ? (stats?.months ?? uniqueMonths(moments)) : 0
  const totalFriends = profileEnabled ? (stats?.friends ?? 0) : 0
  const statItems = [
    { value: totalMoments, label: pluralRu(totalMoments, 'момент', 'момента', 'моментов') },
    { value: totalMonths, label: pluralRu(totalMonths, 'месяц', 'месяца', 'месяцев') },
    { value: totalFriends, label: pluralRu(totalFriends, 'друг', 'друга', 'друзей') },
  ]
  const showMomentsSection = !profileEnabled || listMoments.length > 0 || (!featuredMoment && moments.length === 0)
  const momentsAreClickable = typeof onMomentPress === 'function'
  const showLinkControl = linkedPerson
    ? people.length > 0 && typeof onLinkedPersonPress === 'function'
    : people.length > 0 && typeof onLinkPersonPress === 'function'
  const showEmptyMomentsState = !profileEnabled || listMoments.length === 0
  const emptyMomentsTitle = !profileEnabled
    ? '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0437\u0430\u043a\u0440\u044b\u0442'
    : canViewFriendMoments
      ? '\u0412\u043e\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u0439 \u0434\u043b\u044f \u0434\u0440\u0443\u0437\u0435\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442'
      : '\u041c\u043e\u043c\u0435\u043d\u0442\u044b \u0432\u0438\u0434\u043d\u044b \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u0440\u0443\u0437\u044c\u044f\u043c'
  const emptyMomentsDescription = !profileEnabled
    ? '\u041f\u043e\u043a\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c.'
    : canViewFriendMoments
      ? '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043e\u0442\u043a\u0440\u044b\u0442, \u043d\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043f\u043e\u043a\u0430 \u043d\u0435 \u043f\u043e\u0434\u0435\u043b\u0438\u043b\u0441\u044f \u043c\u043e\u043c\u0435\u043d\u0442\u0430\u043c\u0438 \u0441 \u0434\u0440\u0443\u0437\u044c\u044f\u043c\u0438.'
      : '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043e\u0442\u043a\u0440\u044b\u0442, \u043d\u043e \u0432\u043e\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u0440\u0443\u0437\u044c\u044f\u043c.'

  return (
    <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: contentPaddingBottom }}>
      {topContent && <div style={{ marginTop: 24, marginBottom: 16 }}>{topContent}</div>}

      <div
        style={{
          marginTop: topContent ? 0 : 24,
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

        <div style={{ padding: '0 20px 20px' }}>
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

          <div style={{ marginTop: 16 }}>
            <p
              className="font-sans type-sheet-title"
              style={{
                margin: 0,
                color: 'var(--text)',
              }}
            >
              {name}
            </p>

            {since && (
              <p
                className="font-sans type-support"
                style={{
                  marginTop: 10,
                  paddingLeft: 14,
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
                className="profile-bio-copy"
                style={{ marginTop: 12, color: 'var(--text)' }}
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
            className="inline-flex items-center gap-2 font-sans type-chip transition-opacity active:opacity-60"
            style={{
              marginTop: bio ? 14 : 16,
              backgroundColor: linkedPerson ? 'rgba(217, 139, 82, 0.1)' : 'var(--base)',
              border: '1px solid rgba(160, 94, 44, 0.12)',
              borderRadius: 9999,
              padding: '8px 12px',
              color: linkedPerson ? 'var(--accent)' : 'var(--mid)',
            }}
          >
            <LinkIcon color={linkedPerson ? 'var(--accent)' : 'var(--soft)'} />
            <span>
              {linkedPerson ? `Связан с «${linkedPerson.name}»` : 'Связать с человеком'}
            </span>
          </button>
        )}

          <div
            className="stats-panel-surface"
            style={{
              marginTop: 18,
            }}
          >
            <div className="grid grid-cols-3" style={{ position: 'relative' }}>
              {statItems.map((item, index) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-center"
                  style={{
                    minHeight: 94,
                    padding: '16px 10px 14px',
                    borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)',
                  }}
                >
                  <span
                    className="font-sans type-stat-value"
                    style={{
                      color: 'var(--accent)',
                      textAlign: 'center',
                    }}
                  >
                    {item.value}
                  </span>
                  <span
                    className="font-sans type-stat-label"
                    style={{
                      marginTop: 8,
                      color: 'var(--deep)',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {actionButton && (
            <div
              className="flex items-center justify-center"
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--divider)',
              }}
            >
              {actionButton}
            </div>
          )}
        </div>
      </div>

      {featuredMoment && (
        <div style={{ marginTop: 24 }}>
          <h2
            className="font-sans type-card-title"
            style={{
              margin: 0,
              marginBottom: 14,
              color: 'var(--text)',
            }}
          >
            Главное воспоминание
          </h2>

          <FeaturedMomentCard
            moment={featuredMoment}
            onClick={momentsAreClickable ? () => onMomentPress(featuredMoment) : undefined}
          />
        </div>
      )}

      {showMomentsSection && (
        <div style={{ marginTop: 24 }}>
          <h2
            className="font-sans type-card-title"
            style={{
              margin: 0,
              marginBottom: 14,
              color: 'var(--text)',
            }}
          >
            {'\u041c\u043e\u043c\u0435\u043d\u0442\u044b \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f'}
          </h2>

          {showEmptyMomentsState ? (
            <div
              style={{
                backgroundColor: 'var(--moment-surface)',
                borderRadius: 20,
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
              }}
            >
              <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                <EmptyStateLockIcon />
              </div>
              <div
                className="font-sans type-button"
                style={{
                  color: 'var(--text)',
                  marginBottom: 6,
                }}
              >
                {emptyMomentsTitle}
              </div>
              <div
                className="font-sans type-topbar-meta"
                style={{ color: 'var(--mid)' }}
              >
                {emptyMomentsDescription}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {listMoments.map((moment) => {
                const MomentRowTag = momentsAreClickable ? 'button' : 'div'

                return (
                  <MomentRowTag
                    key={moment.id}
                    {...(momentsAreClickable
                      ? {
                          type: 'button',
                          onClick: () => onMomentPress(moment),
                          className: 'flex w-full items-center gap-3 text-left transition-transform duration-150 ease-out active:scale-[0.99]',
                          style: {
                            border: 'none',
                            backgroundColor: 'var(--moment-surface)',
                            borderRadius: 18,
                            padding: '13px 14px',
                            boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
                          },
                        }
                      : {
                          className: 'flex items-center gap-3',
                          style: {
                            backgroundColor: 'var(--moment-surface)',
                            borderRadius: 18,
                            padding: '13px 14px',
                            boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
                          },
                        })}
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
                      {sinceLabel(getMomentDisplayAt(moment))}
                    </p>
                  </div>
                  </MomentRowTag>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showSharedMomentsSection && (
        <div style={{ marginTop: 24 }}>
          <h2
            className="font-sans"
            style={{
              margin: 0,
              marginBottom: 14,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            Ваши общие воспоминания
          </h2>

          <div
            style={{
              backgroundColor: 'var(--moment-surface)',
              borderRadius: 20,
              padding: 16,
              boxShadow: '0 4px 20px rgba(80,50,30,0.12)',
            }}
          >
            {sharedMoments.length === 0 ? (
              <div
                style={{
                  padding: '12px 8px 10px',
                  textAlign: 'center',
                }}
              >
                <p
                  className="font-sans"
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  Пока нет общих воспоминаний
                </p>
                <p
                  className="font-sans"
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--mid)',
                  }}
                >
                  Когда вы отмечаете друг друга в моментах, они появятся здесь.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sharedMoments.map((moment) => (
                  <SharedMomentRow
                    key={moment.id}
                    moment={moment}
                    sourceLabel={moment.user_id === profileUser.id ? 'у друга' : 'у тебя'}
                    onClick={() => onSharedMomentPress?.(moment)}
                  />
                ))}
              </div>
            )}
          </div>
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
  const appMoments = useAppStore((s) => s.moments)
  const updatePerson = useAppStore((s) => s.updatePerson)

  const [profileUser, setProfileUser] = useState(null)
  const [moments, setMoments] = useState([])
  const [publicMomentsTotal, setPublicMomentsTotal] = useState(0)
  const [publicMonthsCount, setPublicMonthsCount] = useState(0)
  const [publicFriendsCount, setPublicFriendsCount] = useState(0)
  const [canViewFriendMoments, setCanViewFriendMoments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [friendSent, setFriendSent] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const lastTrackedProfileIdRef = useRef(null)

  const friendEntry = friends.find((friend) => friend.id === userId)
  const isAlreadyFriend = Boolean(friendEntry)
  const linkedPerson = people.find((person) => person.linked_user_id === userId) ?? null
  const sharedMoments = useMemo(() => {
    if (!currentUser?.id || !userId) return []

    return (appMoments ?? [])
      .filter((moment) => {
        const isOwnMoment = !moment.isShared && moment.user_id === currentUser.id
        const hasLinkedPerson = isOwnMoment
          && (moment.people ?? []).some((person) => person.linked_user_id === userId)
        const hasTaggedFriend = isOwnMoment
          && (moment.taggedFriends ?? []).some((friend) => friend.id === userId)
        const isSharedByFriend = Boolean(moment.isShared) && moment.user_id === userId

        return hasLinkedPerson || hasTaggedFriend || isSharedByFriend
      })
      .sort(compareMomentsByDisplayAt)
      .filter((moment, index, list) => (
        index === list.findIndex((entry) => entry.id === moment.id)
      ))
  }, [appMoments, currentUser?.id, userId])

  function handleOpenMoment(moment) {
    if (!moment?.id) return

    navigate(`/moment/${moment.id}`, {
      state: {
        previewMoment: moment,
        forceFetch: true,
      },
    })
  }

  useEffect(() => {
    if (currentUser?.id && currentUser.id === userId) {
      navigate('/profile', { replace: true })
      return
    }

    async function load() {
      setLoading(true)

      try {
        const {
          user,
          moments: publicMoments,
          total,
          monthCount,
          friendCount,
          viewerCanSeeFriendMoments,
        } = await getUserProfile(userId, currentUser?.id ?? null, {
          assumeFriend: isAlreadyFriend,
        })

        if (user?.id && lastTrackedProfileIdRef.current !== user.id) {
          lastTrackedProfileIdRef.current = user.id
          void trackEvent('public_profile_viewed', { profile_user_id: user.id })
        }

        setProfileUser(user)
        setMoments(publicMoments)
        setPublicMomentsTotal(total ?? 0)
        setPublicMonthsCount(monthCount ?? uniqueMonths(publicMoments))
        setPublicFriendsCount(friendCount ?? 0)
        setCanViewFriendMoments(Boolean(viewerCanSeeFriendMoments))
      } catch {
        setProfileUser(null)
        setMoments([])
        setPublicMomentsTotal(0)
        setPublicMonthsCount(0)
        setPublicFriendsCount(0)
        setCanViewFriendMoments(false)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      load()
    }
  }, [userId, currentUser?.id, isAlreadyFriend]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddFriend() {
    if (!currentUser?.id || !userId) return

    try {
      const friendship = await sendFriendRequest(currentUser.id, userId)
      if (friendship?.id) {
        void trackEvent('friend_added', { source: 'manual' })
      }
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
              className="flex items-center gap-2 font-sans type-action"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                color: 'var(--mid)',
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

            <span className="font-sans type-screen-title" style={{ color: 'var(--text)' }}>
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

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-sans type-action transition-opacity active:opacity-60"
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0',
              color: 'var(--mid)',
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

          <span className="font-sans type-screen-title" style={{ color: 'var(--text)' }}>
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
        stats={{
          moments: publicMomentsTotal,
          months: publicMonthsCount,
          friends: publicFriendsCount,
        }}
        displayName={friendEntry?.name || linkedPerson?.name || profileUser.name || 'Пользователь'}
        people={people}
        linkedPerson={linkedPerson}
        onLinkedPersonPress={() => navigate(`/people/${linkedPerson.id}`)}
        onLinkPersonPress={() => setShowLinkSheet(true)}
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
        sharedMoments={sharedMoments}
        showSharedMomentsSection={isAlreadyFriend || sharedMoments.length > 0}
        onMomentPress={handleOpenMoment}
        onSharedMomentPress={(moment) => navigate(`/moment/${moment.id}`)}
        canViewFriendMoments={canViewFriendMoments || isAlreadyFriend}
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
