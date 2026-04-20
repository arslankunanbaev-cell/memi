import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson, getFriendships, acceptFriendRequest, linkPersonToUser } from '../lib/api'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

// ── Person row card ───────────────────────────────────────────────────────────
function PersonRow({ person, momentCount, isFriend, isInMemi, onClick, onLinkedClick, onAction, actionLabel }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="flex items-center gap-3 active:opacity-75 transition-opacity cursor-pointer select-none"
      style={{
        backgroundColor: 'var(--card)',
        borderRadius: 20,
        padding: '14px 16px',
        boxShadow: '0 2px 12px rgba(80,50,30,0.08)',
      }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
        style={{
          width: 56, height: 56,
          backgroundColor: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
          border: '2.5px solid rgba(255,255,255,0.8)',
          overflow: 'hidden',
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22, color: '#fff', fontWeight: 600 }}>{person.name[0].toUpperCase()}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-sans truncate" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{person.name}</p>
        <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>
          {momentCount === 0 ? 'нет моментов' : `${momentCount} ${plural.момент(momentCount)}`}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isFriend && (
          <div
            className="font-sans"
            style={{
              background: 'var(--accent-pale)',
              borderRadius: 10,
              padding: '4px 10px',
              fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            }}
          >
            друг
          </div>
        )}
        {isInMemi && !isFriend && (
          <div
            className="font-sans"
            style={{
              background: 'var(--accent-pale)',
              borderRadius: 10,
              padding: '4px 10px',
              fontSize: 12, fontWeight: 500, color: 'var(--accent)',
            }}
          >
            в memi
          </div>
        )}
        {actionLabel && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onAction?.() }}
            className="font-sans font-medium transition-opacity active:opacity-70"
            style={{
              fontSize: 12, color: 'var(--accent)',
              backgroundColor: 'rgba(201,122,58,0.10)',
              borderRadius: 9999, padding: '5px 10px',
            }}
          >
            {actionLabel}
          </span>
        )}
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="var(--soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 1.5L7.5 4.5H3C1.9 4.5 1 5.4 1 6.5V19.5C1 20.6 1.9 21.5 3 21.5H23C24.1 21.5 25 20.6 25 19.5V6.5C25 5.4 24.1 4.5 23 4.5H18.5L16.5 1.5H9.5Z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="13" cy="13" r="4.5" stroke="var(--accent)" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Add person sheet ──────────────────────────────────────────────────────────
function AddPersonSheet({ onClose, onCreated }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
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
      console.error('[AddPerson] ❌', err)
      setError(err?.message || 'Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div className="px-4 flex flex-col gap-5 pb-2">
        <p className="font-sans text-center font-medium" style={{ fontSize: 17, color: 'var(--text)' }}>
          Добавить человека
        </p>

        <div className="flex justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-70"
            style={{
              width: 80, height: 80, borderRadius: '50%',
              border: photoPreview ? 'none' : '1.5px dashed var(--accent)',
              backgroundColor: 'transparent',
              overflow: photoPreview ? 'hidden' : 'visible',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <>
                <CameraIcon />
                <span className="font-sans" style={{ fontSize: 11, color: 'var(--accent)' }}>Фото</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>Как зовут?</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            autoFocus
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--card)', borderRadius: 12,
              padding: '12px 14px', fontSize: 15, color: 'var(--text)',
              border: name.trim() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              boxShadow: '0 2px 8px rgba(80,50,30,0.08)',
            }}
          />
          <p className="font-sans" style={{ fontSize: 12, color: 'var(--accent)', lineHeight: 1.45 }}>
            Имя появится в карточках моментов, когда ты отметишь этого человека
          </p>
        </div>

        {error && <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>}

        <button
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--card)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none',
          }}
        >
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>

        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}>
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Link person sheet ─────────────────────────────────────────────────────────
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
    <BottomSheet onClose={onClose}>
      <div className="px-4 flex flex-col gap-4 pb-2">
        <p className="font-sans text-center font-medium" style={{ fontSize: 17, color: 'var(--text)' }}>
          Связать с человеком?
        </p>
        <p className="font-sans text-center" style={{ fontSize: 13, color: 'var(--mid)' }}>
          Выбери кого из твоих воспоминаний связать с <b>{friend.name}</b>
        </p>
        <div className="flex flex-col gap-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLink(p)}
              disabled={saving}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full transition-opacity active:opacity-70"
              style={{ backgroundColor: 'var(--card)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(80,50,30,0.08)' }}
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
        </div>
        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}>
          Пропустить
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, count }) {
  return (
    <p
      className="font-sans font-bold"
      style={{
        fontSize: 11, color: 'var(--soft)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8, marginTop: 10,
      }}
    >
      {label}{count != null ? ` · ${count}` : ''}
    </p>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function People() {
  const navigate  = useNavigate()
  const people    = useAppStore((s) => s.people)
  const moments   = useAppStore((s) => s.moments)
  const addPerson = useAppStore((s) => s.addPerson)
  const currentUser         = useAppStore((s) => s.currentUser)
  const friends             = useAppStore((s) => s.friends)            ?? []
  const incomingRequests    = useAppStore((s) => s.incomingRequests)   ?? []
  const setFriends          = useAppStore((s) => s.setFriends)         ?? (() => {})
  const setIncomingRequests = useAppStore((s) => s.setIncomingRequests) ?? (() => {})
  const updatePerson        = useAppStore((s) => s.updatePerson)

  const [showAdd, setShowAdd]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [linkTarget, setLinkTarget] = useState(null)

  const mergedPeople = useMemo(() => {
    try {
      const mapped = people.map((p) => {
        const matchedFriend = friends.find((f) => f.id === p.linked_user_id)
        return { ...p, isFriend: !!matchedFriend, isInMemi: !!p.linked_user_id }
      })
      const unmatchedFriends = friends
        .filter((f) => !people.some((p) => p.linked_user_id === f.id))
        .map((f) => ({
          id: f.id, name: f.name, photo_url: f.photo_url ?? null,
          avatar_color: AVATAR_COLORS[0], linked_user_id: f.id,
          isFriend: true, isInMemi: true, _fromFriend: true,
        }))
      return [...mapped, ...unmatchedFriends]
    } catch {
      return people.map((p) => ({ ...p, isFriend: false, isInMemi: false }))
    }
  }, [people, friends])

  const friendsList = mergedPeople.filter((p) => p.isFriend)
  const inMemiList  = mergedPeople.filter((p) => p.isInMemi && !p.isFriend)
  const othersList  = mergedPeople.filter((p) => !p.isInMemi && !p.isFriend)

  function getCardClick(p) {
    if (p.isFriend) return () => navigate(`/profile/${p.linked_user_id ?? p.id}`)
    return () => navigate(`/people/${p.id}`)
  }

  function getActionProps(p) {
    if (!p.isInMemi) return { actionLabel: 'Пригласить', onAction: handleInvite }
    if (!p.isFriend) return { actionLabel: 'Добавить', onAction: () => navigate(`/profile/${p.linked_user_id}`) }
    return {}
  }

  async function handleRefreshFriends() {
    if (refreshing || !currentUser?.id) return
    setRefreshing(true)
    try {
      const rows = await getFriendships(currentUser.id)
      const accepted = []
      const incoming = []
      for (const f of rows) {
        if (f.status === 'accepted') {
          const friend = f.requester_id === currentUser.id ? f.receiver : f.requester
          const friendData = friend ?? { id: f.requester_id === currentUser.id ? f.receiver_id : f.requester_id, name: 'Пользователь' }
          accepted.push({ ...friendData, friendship_id: f.id })
        } else if (f.status === 'pending' && f.receiver_id === currentUser.id) {
          const requester = f.requester ?? { id: f.requester_id, name: 'Пользователь' }
          incoming.push({ ...requester, friendship_id: f.id })
        }
      }
      setFriends(accepted)
      setIncomingRequests(incoming)
    } catch (err) {
      window.Telegram?.WebApp?.showAlert?.(`ERROR: ${err?.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  function handleInvite() {
    const publicCode = currentUser?.public_code
    if (!publicCode) return
    const botName = import.meta.env.VITE_BOT_USERNAME ?? 'memi_app_bot'
    const appName = import.meta.env.VITE_APP_SHORT_NAME ?? 'app'
    const link    = `https://t.me/${botName}/${appName}?startapp=ref_${publicCode}`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Присоединяйся ко мне в memi 🌿')}`
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      navigator.clipboard?.writeText(link).catch(() => {})
    }
  }

  async function handleAccept(req) {
    try {
      await acceptFriendRequest(req.friendship_id)
      setFriends([...friends, req])
      setIncomingRequests(incomingRequests.filter((r) => r.friendship_id !== req.friendship_id))
      if (people.length > 0) setLinkTarget(req)
    } catch (err) {
      console.error('[People] accept friend error:', err)
    }
  }

  async function handleLinkPerson(personId, linkedUserId) {
    try {
      const updated = await linkPersonToUser(personId, linkedUserId)
      updatePerson(personId, { linked_user_id: updated.linked_user_id })
    } catch (err) {
      console.error('[People] link person error:', err)
    }
  }

  function momentCountFor(personId) {
    return moments.filter((m) => (m.people ?? []).some((p) => p.id === personId)).length
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div className="px-4 pt-topbar" style={{ paddingBottom: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Люди</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshFriends}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: 'var(--card)', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(80,50,30,0.10)',
              }}
            >
              <span style={{ fontSize: 18, color: 'var(--mid)', display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>
                ↻
              </span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: 'var(--card)', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(80,50,30,0.10)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--mid)" strokeWidth="1.8"/>
                <path d="M12 8v8M8 12h8" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28 px-4">

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <div className="flex flex-col gap-2" style={{ paddingTop: 4, paddingBottom: 12 }}>
            <SectionHeader label="Заявки" count={incomingRequests.length} />
            {incomingRequests.map((req) => (
              <div
                key={req.friendship_id}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                style={{ backgroundColor: 'var(--card)', boxShadow: '0 2px 12px rgba(80,50,30,0.08)' }}
              >
                <div
                  className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                  style={{ width: 46, height: 46, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 18, overflow: 'hidden', border: '2.5px solid rgba(255,255,255,0.8)' }}
                >
                  {req.photo_url
                    ? <img src={req.photo_url} alt={req.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : req.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <p className="font-sans flex-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{req.name}</p>
                <button
                  onClick={() => handleAccept(req)}
                  className="font-sans font-medium transition-opacity active:opacity-70"
                  style={{ fontSize: 13, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 9999, padding: '7px 16px' }}
                >
                  Принять
                </button>
              </div>
            ))}
          </div>
        )}

        {/* People list */}
        <div className="flex flex-col gap-2" style={{ paddingTop: 4, paddingBottom: 8 }}>

          {friendsList.length > 0 && <SectionHeader label="Друзья" count={friendsList.length} />}
          {friendsList.map((p, i) => (
            <div key={p._fromFriend ? `friend-${p.id}` : p.id} style={{ animation: 'fadeSlideUp 0.3s ease both', animationDelay: `${i * 60}ms` }}>
              <PersonRow
                person={p}
                momentCount={p._fromFriend ? 0 : momentCountFor(p.id)}
                isFriend={true}
                isInMemi={true}
                onClick={getCardClick(p)}
                onLinkedClick={() => navigate(`/profile/${p.linked_user_id}`)}
                {...getActionProps(p)}
              />
            </div>
          ))}

          {inMemiList.length > 0 && <SectionHeader label="В memi" count={inMemiList.length} />}
          {inMemiList.map((p, i) => (
            <div key={p.id} style={{ animation: 'fadeSlideUp 0.3s ease both', animationDelay: `${(friendsList.length + i) * 60}ms` }}>
              <PersonRow
                person={p}
                momentCount={momentCountFor(p.id)}
                isFriend={false}
                isInMemi={true}
                onClick={getCardClick(p)}
                onLinkedClick={() => navigate(`/profile/${p.linked_user_id}`)}
                {...getActionProps(p)}
              />
            </div>
          ))}

          {othersList.length > 0 && <SectionHeader label="Остальные" count={othersList.length} />}
          {othersList.map((p, i) => (
            <div key={p.id} style={{ animation: 'fadeSlideUp 0.3s ease both', animationDelay: `${(friendsList.length + inMemiList.length + i) * 60}ms` }}>
              <PersonRow
                person={p}
                momentCount={momentCountFor(p.id)}
                isFriend={false}
                isInMemi={false}
                onClick={getCardClick(p)}
                onLinkedClick={undefined}
                {...getActionProps(p)}
              />
            </div>
          ))}

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-3 transition-opacity active:opacity-60 w-full"
            style={{
              borderRadius: 20, padding: '14px 16px',
              border: '1.5px dashed rgba(201,122,58,0.35)',
              backgroundColor: 'transparent', cursor: 'pointer',
              marginTop: mergedPeople.length > 0 ? 4 : 0,
            }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 56, height: 56, backgroundColor: 'rgba(201,122,58,0.10)' }}
            >
              <span style={{ fontSize: 22, color: 'var(--accent)', lineHeight: 1 }}>+</span>
            </div>
            <span className="font-sans" style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 500 }}>Добавить человека</span>
          </button>
        </div>

        {/* Empty state */}
        {mergedPeople.length === 0 && incomingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 animate-fade-in" style={{ paddingTop: 32 }}>
            <p className="font-sans" style={{ fontSize: 15, color: 'var(--soft)' }}>Пока нет друзей</p>
            <button
              onClick={handleInvite}
              className="font-sans font-medium transition-opacity active:opacity-70"
              style={{ fontSize: 14, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 9999, padding: '10px 24px' }}
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
          people={people.filter((p) => !p.linked_user_id)}
          onLink={handleLinkPerson}
          onClose={() => setLinkTarget(null)}
        />
      )}
    </div>
  )
}
