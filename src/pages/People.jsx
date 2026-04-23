import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { acceptFriendRequest, createPerson, getFriendships, linkPersonToUser } from '../lib/api'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import SectionLabel from '../components/SectionLabel'
import { useAppStore } from '../store/useAppStore'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M8.75 1.75H12.25V5.25M12 2L7.75 6.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 3H4.5C3.67157 3 3 3.67157 3 4.5V9.5C3 10.3284 3.67157 11 4.5 11H9.5C10.3284 11 11 10.3284 11 9.5V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
      <path d="M9.5 1.5L7.5 4.5H3C1.9 4.5 1 5.4 1 6.5V19.5C1 20.6 1.9 21.5 3 21.5H23C24.1 21.5 25 20.6 25 19.5V6.5C25 5.4 24.1 4.5 23 4.5H18.5L16.5 1.5H9.5Z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="13" cy="13" r="4.5" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

function IconPill({ onClick, children, spin = false, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex items-center justify-center transition-opacity active:opacity-60"
      style={{
        width: 38,
        height: 38,
        border: 'none',
        borderRadius: 12,
        backgroundColor: 'var(--moment-surface)',
        boxShadow: 'var(--shadow-card)',
        color: 'var(--mid)',
        transform: spin ? 'rotate(180deg)' : 'none',
        transitionProperty: 'opacity, transform',
        transitionDuration: '180ms',
      }}
    >
      {children}
    </button>
  )
}

function Avatar({ person, size = 56 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
        border: '2.5px solid rgba(255,255,255,0.8)',
        color: '#fff',
        fontSize: size * 0.38,
        fontWeight: 700,
      }}
    >
      {person.photo_url ? (
        <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        person.name[0]?.toUpperCase()
      )}
    </div>
  )
}

function StatusBadge({ label }) {
  return (
    <div
      className="font-sans"
      style={{
        borderRadius: 10,
        backgroundColor: 'var(--accent-pale)',
        color: 'var(--accent)',
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 10px',
      }}
    >
      {label}
    </div>
  )
}

function SectionHeader({ label, count, compact = false }) {
  if (label === 'Друзья' && !compact) {
    return null
  }

  return (
    <SectionLabel
      style={{
        marginBottom: compact ? 0 : 12,
        marginTop: compact ? 0 : 10,
      }}
    >
      {label}{count != null ? ` · ${count}` : ''}
    </SectionLabel>
  )
}

function FriendsHeader({ count, onInvite }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ marginTop: 10, marginBottom: 12 }}>
      <SectionHeader label="Друзья" count={count} compact />

      <button
        type="button"
        aria-label="Пригласить друга"
        onClick={onInvite}
        className="inline-flex items-center gap-1.5 whitespace-nowrap font-sans type-meta transition-opacity active:opacity-70"
        style={{
          border: '1px solid rgba(217, 139, 82, 0.18)',
          borderRadius: 999,
          backgroundColor: 'rgba(255, 254, 253, 0.92)',
          boxShadow: '0 8px 18px rgba(80, 50, 30, 0.08)',
          color: 'var(--accent)',
          padding: '7px 12px',
        }}
      >
        <ShareIcon />
        Пригласить
      </button>
    </div>
  )
}

function PersonRow({ person, momentCount, badge, actionLabel, onAction, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      className="surface-card flex w-full cursor-pointer items-center gap-3 rounded-[20px] text-left transition-opacity active:opacity-75"
      style={{ padding: '14px 16px', backgroundColor: 'var(--moment-surface)' }}
    >
      <Avatar person={person} />

      <div className="min-w-0 flex-1">
        <div className="font-serif type-card-title truncate" style={{ color: 'var(--text)' }}>
          {person.name}
        </div>
        <div className="font-sans type-support" style={{ color: 'var(--mid)', marginTop: 2 }}>
          {momentCount === 0 ? 'нет моментов' : `${momentCount} ${plural.момент(momentCount)}`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {badge && <StatusBadge label={badge} />}
        {actionLabel && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation()
              onAction?.()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onAction?.()
              }
            }}
            className="font-sans type-meta"
            style={{
              borderRadius: 999,
              backgroundColor: 'rgba(217, 139, 82, 0.12)',
              color: 'var(--accent)',
              padding: '5px 10px',
            }}
          >
            {actionLabel}
          </span>
        )}
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="var(--soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

function RequestRow({ request, onAccept }) {
  return (
    <div
      className="surface-card flex items-center gap-4 rounded-[20px]"
      style={{ padding: '14px 16px', backgroundColor: 'var(--moment-surface)' }}
    >
      <Avatar person={request} size={48} />

      <div className="min-w-0 flex-1">
        <p className="font-serif type-button truncate" style={{ color: 'var(--text)' }}>
          {request.name}
        </p>
        <p className="font-sans type-support" style={{ color: 'var(--mid)', marginTop: 2 }}>
          хочет добавить тебя в друзья
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="font-sans type-support transition-opacity active:opacity-70"
        style={{
          border: 'none',
          borderRadius: 999,
          backgroundColor: 'var(--accent)',
          color: '#fff',
          padding: '8px 16px',
        }}
      >
        Принять
      </button>
    </div>
  )
}

function AddPersonSheet({ onClose, onCreated }) {
  const currentUser = useAppStore((state) => state.currentUser)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleAdd() {
    if (!name.trim() || saving) return

    tgHaptic('medium')
    setSaving(true)
    setError(null)

    try {
      const saved = await createPerson({
        userId: currentUser?.id,
        name: name.trim(),
        avatarColor: color,
        photoFile: photoFile ?? null,
      })

      onCreated(saved)
      onClose()
    } catch (err) {
      console.error('[AddPerson]', err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Добавить человека">
      <div className="px-4 pb-4">
        <div className="flex justify-center" style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-70"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: photoPreview ? 'none' : '1.5px dashed var(--accent)',
              backgroundColor: photoPreview ? 'transparent' : 'transparent',
              overflow: photoPreview ? 'hidden' : 'visible',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <>
                <CameraIcon />
                <span className="font-sans" style={{ color: 'var(--accent)', fontSize: 11 }}>
                  Фото
                </span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <label className="font-sans" style={{ color: 'var(--mid)', fontSize: 13 }}>
          Как зовут?
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Введите имя"
          autoFocus
          className="w-full outline-none"
          style={{
            marginTop: 8,
            backgroundColor: 'var(--card)',
            border: name.trim() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            borderRadius: 14,
            boxShadow: 'var(--shadow-card)',
            color: 'var(--text)',
            fontSize: 15,
            padding: '12px 14px',
          }}
        />

        <p className="font-sans" style={{ color: 'var(--accent)', fontSize: 12, lineHeight: 1.45, marginTop: 12 }}>
          Имя появится в карточках моментов, когда ты отметишь этого человека.
        </p>

        {error && (
          <p className="font-sans text-center" style={{ color: '#E05252', fontSize: 12, marginTop: 14 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="w-full font-sans transition-opacity active:opacity-70"
          style={{
            marginTop: 20,
            border: 'none',
            borderRadius: 20,
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            fontSize: 16,
            fontWeight: 700,
            padding: '16px',
          }}
        >
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{
            marginTop: 12,
            border: 'none',
            background: 'none',
            color: 'var(--mid)',
            fontSize: 14,
          }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

function LinkPersonSheet({ friend, people, onLink, onClose }) {
  const [saving, setSaving] = useState(false)

  async function handleLink(person) {
    if (saving) return

    setSaving(true)
    try {
      await onLink(person.id, friend.id)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Связать с человеком?">
      <div className="px-4 pb-4">
        <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, marginBottom: 18 }}>
          Выбери, кого из твоих людей связать с <b style={{ color: 'var(--text)' }}>{friend.name}</b>
        </p>

        <div className="flex flex-col gap-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => handleLink(person)}
              disabled={saving}
              className="surface-card flex w-full items-center gap-3 rounded-[18px] text-left transition-opacity active:opacity-70"
              style={{ border: 'none', padding: '12px 14px' }}
            >
              <Avatar person={person} size={42} />
              <span className="font-sans flex-1" style={{ color: 'var(--text)', fontSize: 15 }}>
                {person.name}
              </span>
            </button>
          ))}

          {people.length === 0 && (
            <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, padding: '12px 0' }}>
              Нет свободных людей для связи.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{
            marginTop: 14,
            border: 'none',
            background: 'none',
            color: 'var(--mid)',
            fontSize: 14,
          }}
        >
          Пропустить
        </button>
      </div>
    </BottomSheet>
  )
}

export default function People() {
  const navigate = useNavigate()
  const people = useAppStore((state) => state.people)
  const moments = useAppStore((state) => state.moments)
  const addPerson = useAppStore((state) => state.addPerson)
  const currentUser = useAppStore((state) => state.currentUser)
  const friends = useAppStore((state) => state.friends) ?? []
  const incomingRequests = useAppStore((state) => state.incomingRequests) ?? []
  const setFriends = useAppStore((state) => state.setFriends) ?? (() => {})
  const setIncomingRequests = useAppStore((state) => state.setIncomingRequests) ?? (() => {})
  const updatePerson = useAppStore((state) => state.updatePerson)

  const [showAdd, setShowAdd] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [linkTarget, setLinkTarget] = useState(null)

  const momentCountMap = useMemo(() => {
    const counts = new Map()

    for (const moment of moments) {
      for (const person of moment.people ?? []) {
        counts.set(person.id, (counts.get(person.id) ?? 0) + 1)
      }
    }

    return counts
  }, [moments])

  const mergedPeople = useMemo(() => {
    const mapped = people.map((person) => {
      const matchedFriend = friends.find((friend) => friend.id === person.linked_user_id)
      return { ...person, isFriend: Boolean(matchedFriend), isInMemi: Boolean(person.linked_user_id) }
    })

    const unmatchedFriends = friends
      .filter((friend) => !people.some((person) => person.linked_user_id === friend.id))
      .map((friend) => ({
        id: friend.id,
        name: friend.name,
        photo_url: friend.photo_url ?? null,
        avatar_color: AVATAR_COLORS[0],
        linked_user_id: friend.id,
        isFriend: true,
        isInMemi: true,
        _fromFriend: true,
      }))

    return [...mapped, ...unmatchedFriends]
  }, [people, friends])

  const friendsList = mergedPeople.filter((person) => person.isFriend)
  const inMemiList = mergedPeople.filter((person) => person.isInMemi && !person.isFriend)
  const othersList = mergedPeople.filter((person) => !person.isInMemi && !person.isFriend)

  function momentCountFor(personId) {
    return momentCountMap.get(personId) ?? 0
  }

  async function handleInvite() {
    const publicCode = currentUser?.public_code
    if (!publicCode) return

    tgHaptic('light')

    const botName = (import.meta.env.VITE_BOT_USERNAME ?? 'memimntbot').replace(/^@+/, '')
    const appName = import.meta.env.VITE_APP_SHORT_NAME ?? 'app'
    const link = `https://t.me/${botName}/${appName}?startapp=ref_${publicCode}`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Присоединяйся ко мне в memi 🌿')}`

    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
      return
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'memi',
          text: 'Присоединяйся ко мне в memi 🤍',
          url: link,
        })
        return
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }
        console.error('[People] share invite error:', error)
      }
    }

    navigator.clipboard?.writeText(link).catch(() => {})
  }

  async function handleRefreshFriends() {
    if (refreshing || !currentUser?.id) return

    setRefreshing(true)

    try {
      const rows = await getFriendships(currentUser.id)
      const accepted = []
      const incoming = []

      for (const friendship of rows) {
        if (friendship.status === 'accepted') {
          const friend = friendship.requester_id === currentUser.id ? friendship.receiver : friendship.requester
          const friendData = friend ?? {
            id: friendship.requester_id === currentUser.id ? friendship.receiver_id : friendship.requester_id,
            name: 'Пользователь',
          }
          accepted.push({ ...friendData, friendship_id: friendship.id })
        } else if (friendship.status === 'pending' && friendship.receiver_id === currentUser.id) {
          const requester = friendship.requester ?? { id: friendship.requester_id, name: 'Пользователь' }
          incoming.push({ ...requester, friendship_id: friendship.id })
        }
      }

      setFriends(accepted)
      setIncomingRequests(incoming)
    } catch (error) {
      window.Telegram?.WebApp?.showAlert?.(`ERROR: ${error?.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleAccept(request) {
    try {
      await acceptFriendRequest(request.friendship_id)
      setFriends([...friends, request])
      setIncomingRequests(incomingRequests.filter((entry) => entry.friendship_id !== request.friendship_id))

      if (people.length > 0) {
        setLinkTarget(request)
      }
    } catch (error) {
      console.error('[People] accept friend error:', error)
    }
  }

  async function handleLinkPerson(personId, linkedUserId) {
    try {
      const updated = await linkPersonToUser(personId, linkedUserId)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
    } catch (error) {
      console.error('[People] link person error:', error)
    }
  }

  function cardClick(person) {
    if (person.isFriend) {
      navigate(`/profile/${person.linked_user_id ?? person.id}`)
      return
    }

    navigate(`/people/${person.id}`)
  }

  function rowProps(person) {
    if (!person.isInMemi) {
      return { badge: null, actionLabel: 'Пригласить', onAction: handleInvite }
    }

    if (!person.isFriend) {
      return {
        badge: 'в memi',
        actionLabel: 'Добавить',
        onAction: () => navigate(`/profile/${person.linked_user_id}`),
      }
    }

    return { badge: 'друг' }
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar" style={{ paddingBottom: 20 }}>
        <div className="flex items-center justify-between">
          <h1
            className="type-page-title"
            style={{ color: 'var(--text)', margin: 0 }}
          >
            Люди
          </h1>

          <div className="flex items-center gap-2">
            <IconPill onClick={handleRefreshFriends} spin={refreshing} ariaLabel="Обновить друзей">
              <RefreshIcon />
            </IconPill>
            <IconPill onClick={() => setShowAdd(true)} ariaLabel="Добавить человека">
              <AddIcon />
            </IconPill>
          </div>
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 108 }}>
        {incomingRequests.length > 0 && (
          <section style={{ paddingBottom: 20 }}>
            <SectionHeader label="Заявки" count={incomingRequests.length} />
            <div className="flex flex-col gap-3">
              {incomingRequests.map((request) => (
                <RequestRow key={request.friendship_id} request={request} onAccept={() => handleAccept(request)} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          {friendsList.length > 0 && <FriendsHeader count={friendsList.length} onInvite={handleInvite} />}
          {friendsList.length > 0 && <SectionHeader label="Друзья" count={friendsList.length} />}
          {friendsList.length > 0 && (
            <button
              type="button"
              aria-label="Пригласить друга"
              onClick={handleInvite}
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-sans transition-opacity active:opacity-70"
              style={{
                display: 'none',
                border: '1px solid rgba(217, 139, 82, 0.18)',
                borderRadius: 999,
                backgroundColor: 'rgba(255, 254, 253, 0.92)',
                boxShadow: '0 8px 18px rgba(80, 50, 30, 0.08)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                padding: '7px 12px',
              }}
            >
              <ShareIcon />
              Пригласить
            </button>
          )}
          {friendsList.map((person, index) => (
            <div
              key={person._fromFriend ? `friend-${person.id}` : person.id}
              style={{
                animation: 'fadeSlideUp 0.28s ease both',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <PersonRow
                person={person}
                momentCount={person._fromFriend ? 0 : momentCountFor(person.id)}
                onClick={() => cardClick(person)}
                {...rowProps(person)}
              />
            </div>
          ))}

          {inMemiList.length > 0 && <SectionHeader label="В memi" count={inMemiList.length} />}
          {inMemiList.map((person, index) => (
            <div
              key={person.id}
              style={{
                animation: 'fadeSlideUp 0.28s ease both',
                animationDelay: `${(friendsList.length + index) * 50}ms`,
              }}
            >
              <PersonRow
                person={person}
                momentCount={momentCountFor(person.id)}
                onClick={() => cardClick(person)}
                {...rowProps(person)}
              />
            </div>
          ))}

          {othersList.length > 0 && <SectionHeader label="Остальные" count={othersList.length} />}
          {othersList.map((person, index) => (
            <div
              key={person.id}
              style={{
                animation: 'fadeSlideUp 0.28s ease both',
                animationDelay: `${(friendsList.length + inMemiList.length + index) * 50}ms`,
              }}
            >
              <PersonRow
                person={person}
                momentCount={momentCountFor(person.id)}
                onClick={() => cardClick(person)}
                {...rowProps(person)}
              />
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center gap-3 transition-opacity active:opacity-60"
          style={{
            marginTop: mergedPeople.length > 0 || incomingRequests.length > 0 ? 16 : 0,
            border: '1.5px dashed rgba(217, 139, 82, 0.35)',
            borderRadius: 20,
            background: 'transparent',
            padding: '14px 16px',
          }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, backgroundColor: 'rgba(217, 139, 82, 0.12)', color: 'var(--accent)', fontSize: 22 }}
          >
            +
          </div>
          <span className="font-sans" style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
            Добавить человека
          </span>
        </button>

        {mergedPeople.length === 0 && incomingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: 52 }}>
            <p className="font-sans" style={{ color: 'var(--soft)', fontSize: 15 }}>
              Пока нет друзей
            </p>
            <button
              type="button"
              onClick={handleInvite}
              className="font-sans transition-opacity active:opacity-70"
              style={{
                marginTop: 18,
                border: 'none',
                borderRadius: 20,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                padding: '14px 24px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              Пригласить первого
            </button>
          </div>
        )}
      </div>

      <BottomNav active="people" />

      {showAdd && (
        <AddPersonSheet
          onClose={() => setShowAdd(false)}
          onCreated={addPerson}
        />
      )}

      {linkTarget && (
        <LinkPersonSheet
          friend={linkTarget}
          people={people.filter((person) => !person.linked_user_id)}
          onLink={handleLinkPerson}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  )
}
