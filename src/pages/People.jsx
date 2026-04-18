import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson, getFriendships, acceptFriendRequest, linkPersonToUser } from '../lib/api'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

// ── Карточка человека ─────────────────────────────────────────────────────────
function PersonCard({ person, momentCount, lastPhotos, onClick, onLinkedClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 active:opacity-70 transition-opacity w-full"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 14, padding: '16px 12px 14px', border: 'none', cursor: 'pointer' }}
    >
      {/* Аватар */}
      <div
        className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
        style={{
          width: 72, height: 72,
          backgroundColor: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
          overflow: 'hidden',
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 28, color: '#fff', fontWeight: 300 }}>{person.name[0].toUpperCase()}</span>
        )}
      </div>

      {/* Имя + кол-во моментов */}
      <div className="min-w-0 w-full text-center">
        <p className="font-serif truncate" style={{ fontSize: 16, color: 'var(--text)' }}>{person.name}</p>
        <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
          {momentCount} {plural.момент(momentCount)}
        </p>
      </div>

      {/* Три последних фото */}
      {lastPhotos.length > 0 && (
        <div className="flex gap-1 justify-center">
          {lastPhotos.map((url, i) => (
            <div
              key={i}
              style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--base)' }}
            >
              {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Бейдж "в memi" если привязан к пользователю */}
      {person.linked_user_id && (
        <span
          onClick={(e) => { e.stopPropagation(); onLinkedClick?.() }}
          className="font-sans"
          style={{
            fontSize: 10, color: 'var(--deep)',
            backgroundColor: 'rgba(160,94,44,0.12)',
            borderRadius: 20, padding: '2px 8px',
            marginTop: -4,
          }}
        >
          в memi
        </span>
      )}
    </button>
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

// ── Шит добавления человека ───────────────────────────────────────────────────
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
      <div className="px-5 flex flex-col gap-5 pb-2">
        {/* Title */}
        <p className="font-sans text-center font-medium" style={{ fontSize: 17, color: 'var(--text)' }}>
          Добавить человека
        </p>

        {/* Avatar circle */}
        <div className="flex justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-70"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
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

        {/* Name input */}
        <div className="flex flex-col gap-2">
          <label className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>Как зовут?</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            autoFocus
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 15,
              color: 'var(--text)',
              border: name.trim() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
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
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 9999,
            padding: '13px 0',
            fontSize: 15,
            border: 'none',
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

// ── Шит привязки человека к другу ────────────────────────────────────────────
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
      <div className="px-5 flex flex-col gap-4 pb-2">
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
        </div>
        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}>
          Пропустить
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function People() {
  const navigate  = useNavigate()
  const people    = useAppStore((s) => s.people)
  const moments   = useAppStore((s) => s.moments)
  const addPerson = useAppStore((s) => s.addPerson)
  const currentUser         = useAppStore((s) => s.currentUser)
  const friends             = useAppStore((s) => s.friends)           ?? []
  const incomingRequests    = useAppStore((s) => s.incomingRequests)  ?? []
  const setFriends          = useAppStore((s) => s.setFriends)        ?? (() => {})
  const setIncomingRequests = useAppStore((s) => s.setIncomingRequests) ?? (() => {})

  const updatePerson = useAppStore((s) => s.updatePerson)

  const [showAdd, setShowAdd]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab]               = useState('people')
  const [linkTarget, setLinkTarget] = useState(null) // friend to link after accepting

  const TABS = ['people', 'friends']
  const touchStart = useRef(null)

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const idx = TABS.indexOf(tab)
    if (dx < 0 && idx < TABS.length - 1) { tgHaptic('light'); setTab(TABS[idx + 1]) }
    if (dx > 0 && idx > 0)               { tgHaptic('light'); setTab(TABS[idx - 1]) }
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
    const tgId    = currentUser?.telegram_id
      ?? window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    const botName = import.meta.env.VITE_BOT_USERNAME ?? 'memi_app_bot'
    const appName = import.meta.env.VITE_APP_SHORT_NAME ?? 'app'
    const link    = `https://t.me/${botName}/${appName}?startapp=ref_${tgId}`
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

  function lastPhotosFor(personId) {
    return moments
      .filter((m) => (m.people ?? []).some((p) => p.id === personId) && m.photo_url)
      .slice(0, 3)
      .map((m) => m.photo_url)
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Топбар */}
      <div className="px-4 pt-topbar" style={{ paddingBottom: 0 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>Люди</span>
          {tab === 'people' && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none', fontSize: 18, color: 'var(--accent)' }}
            >
              +
            </button>
          )}
          {tab === 'friends' && (
            <button
              onClick={handleInvite}
              className="font-sans font-medium transition-opacity active:opacity-60"
              style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', padding: 0 }}
            >
              + Пригласить
            </button>
          )}
        </div>

        {/* Таб-переключатель */}
        <div className="flex gap-2" style={{ marginBottom: 14 }}>
          {[{ id: 'people', label: 'Люди' }, { id: 'friends', label: 'Друзья' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="font-sans font-medium transition-opacity active:opacity-70"
              style={{
                fontSize: 15,
                padding: '7px 20px',
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: tab === id ? 'var(--accent)' : 'var(--surface)',
                color: tab === id ? '#fff' : 'var(--mid)',
              }}
            >
              {label}
              {id === 'friends' && friends.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.8 }}>{friends.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Контент — слайдер */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: 'flex',
            width: '200%',
            height: '100%',
            transform: tab === 'people' ? 'translateX(0%)' : 'translateX(-50%)',
            transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >

          {/* ── Вкладка Люди ── */}
          <div className="overflow-y-auto pb-28 px-4" style={{ width: '50%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 4, paddingBottom: 8 }}>
              {people.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  momentCount={momentCountFor(p.id)}
                  lastPhotos={lastPhotosFor(p.id)}
                  onClick={() => navigate(`/people/${p.id}`)}
                  onLinkedClick={() => navigate(`/profile/${p.linked_user_id}`)}
                />
              ))}
              <button
                onClick={() => setShowAdd(true)}
                className="flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
                style={{
                  borderRadius: 14, minHeight: 110,
                  border: '1.5px dashed rgba(217,139,82,0.35)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: 'rgba(217,139,82,0.15)' }}
                >
                  <span style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>+</span>
                </div>
                <span className="font-sans" style={{ fontSize: 11, color: 'var(--accent)' }}>Добавить</span>
              </button>
            </div>
          </div>

          {/* ── Вкладка Друзья ── */}
          <div className="overflow-y-auto pb-28 px-4" style={{ width: '50%' }}>
            <div className="flex flex-col" style={{ paddingTop: 4, gap: 10 }}>
              {/* Кнопка обновить */}
              <div className="flex items-center justify-between">
                <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>
                  {friends.length + incomingRequests.length === 0 ? 'Пока нет друзей' : `${friends.length + incomingRequests.length} ${friends.length + incomingRequests.length === 1 ? 'человек' : 'человека'}`}
                </p>
                <button
                  onClick={handleRefreshFriends}
                  className="transition-opacity active:opacity-60"
                  style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 16, color: 'var(--mid)', display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>
                    ↻
                  </span>
                </button>
              </div>

              {/* Входящие заявки */}
              {incomingRequests.length > 0 && (
                <p className="font-sans font-medium" style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: -2 }}>
                  Заявки
                </p>
              )}
              {incomingRequests.map((req) => (
                <div
                  key={req.friendship_id}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                    style={{ width: 46, height: 46, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 18, overflow: 'hidden' }}
                  >
                    {req.photo_url
                      ? <img src={req.photo_url} alt={req.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : req.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <p className="font-sans flex-1" style={{ fontSize: 15, color: 'var(--text)' }}>{req.name}</p>
                  <button
                    onClick={() => handleAccept(req)}
                    className="font-sans font-medium transition-opacity active:opacity-70"
                    style={{ fontSize: 13, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 9999, padding: '7px 16px' }}
                  >
                    Принять
                  </button>
                </div>
              ))}

              {/* Список друзей */}
              {friends.length > 0 && incomingRequests.length > 0 && (
                <p className="font-sans font-medium" style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: -2 }}>
                  Друзья
                </p>
              )}
              {friends.length === 0 && incomingRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3" style={{ paddingTop: 48 }}>
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
              {friends.map((f) => (
                <button
                  key={f.friendship_id}
                  onClick={() => navigate(`/profile/${f.id}`)}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl w-full transition-opacity active:opacity-70"
                  style={{ backgroundColor: 'var(--surface)', border: 'none', cursor: 'pointer' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                    style={{ width: 46, height: 46, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 18, overflow: 'hidden' }}
                  >
                    {f.photo_url
                      ? <img src={f.photo_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : f.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-sans flex-1 text-left" style={{ fontSize: 15, color: 'var(--text)' }}>{f.name}</span>
                  <span style={{ fontSize: 18, color: 'var(--soft)' }}>›</span>
                </button>
              ))}
            </div>
          </div>

        </div>
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
