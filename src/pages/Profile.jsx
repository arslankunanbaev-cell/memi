import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { deleteCapsuleSlot, saveCapsuleSlot } from '../lib/api'
import { MONTHS_GENITIVE, plural } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'

function uniqueMonths(moments) {
  return new Set(
    moments.map((moment) => {
      const date = new Date(moment.created_at)
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''

  const date = new Date(createdAt)
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function CapsuleTile({ slot, index, onEmpty, onFilled }) {
  const [showMenu, setShowMenu] = useState(false)

  if (!slot) {
    return (
      <button
        type="button"
        onClick={onEmpty}
        className="flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: 20,
          border: '1.5px dashed var(--accent-light)',
          background: 'repeating-linear-gradient(45deg, var(--card-alt), var(--card-alt) 4px, var(--base) 4px, var(--base) 12px)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: 'var(--accent-light)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-sans" style={{ color: 'var(--soft)', fontSize: 12, fontWeight: 500 }}>
          Добавить
        </span>
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMenu(true)}
        className="transition-opacity active:opacity-80"
        style={{
          position: 'relative',
          aspectRatio: '3 / 4',
          border: 'none',
          borderRadius: 20,
          overflow: 'hidden',
          padding: 0,
          boxShadow: 'var(--shadow-card)',
          background: slot.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
        }}
      >
        {slot.photo_url && (
          <img src={slot.photo_url} alt={slot.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.6) 0%, transparent 58%)' }} />

        <div
          className="font-sans"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
          }}
        >
          0{index + 1}
        </div>

        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <div
            className="font-sans"
            style={{
              display: 'inline-flex',
              maxWidth: '100%',
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 999,
              boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 500,
              overflow: 'hidden',
              padding: '4px 10px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {slot.title || 'Без названия'}
          </div>
        </div>
      </button>

      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title="Капсула">
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                onEmpty()
              }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'var(--base)',
                marginBottom: 8,
                padding: '16px 18px',
              }}
            >
              <div
                className="flex items-center justify-center rounded-[14px]"
                style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)' }}
              >
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>↻</span>
              </div>
              <span className="font-sans" style={{ color: 'var(--text)', fontSize: 17, fontWeight: 500 }}>
                Заменить
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                onFilled()
              }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'rgba(224, 82, 82, 0.07)',
                padding: '16px 18px',
              }}
            >
              <div
                className="flex items-center justify-center rounded-[14px]"
                style={{ width: 40, height: 40, backgroundColor: 'rgba(224, 82, 82, 0.12)' }}
              >
                <span style={{ color: '#E05252', fontSize: 18 }}>✕</span>
              </div>
              <span className="font-sans" style={{ color: '#E05252', fontSize: 17, fontWeight: 500 }}>
                Убрать из капсулы
              </span>
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}

function PickMomentSheet({ onClose, onPick, onCreateNew }) {
  const moments = useAppStore((state) => state.moments)
  const currentUser = useAppStore((state) => state.currentUser)
  const ownMoments = moments.filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)

  return (
    <BottomSheet onClose={onClose} title="В капсулу">
      <div className="pb-3">
        <button
          type="button"
          onClick={() => {
            onClose()
            onCreateNew()
          }}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-opacity active:opacity-60"
          style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
        >
          <div
            className="flex items-center justify-center rounded-[10px]"
            style={{ width: 36, height: 36, backgroundColor: 'var(--accent)', color: '#fff', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
              Создать момент
            </p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 1 }}>
              Новый — сразу в капсулу
            </p>
          </div>
          <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
        </button>

        {ownMoments.length > 0 && (
          <p
            className="font-sans font-semibold"
            style={{
              color: 'var(--soft)',
              fontSize: 12,
              letterSpacing: '0.14em',
              margin: '12px 20px 8px',
              textTransform: 'uppercase',
            }}
          >
            Или выбери существующий
          </p>
        )}

        {ownMoments.length === 0 && (
          <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, padding: '20px 0 8px' }}>
            Пока нет моментов — создай первый выше.
          </p>
        )}

        {ownMoments.map((moment) => (
          <button
            key={moment.id}
            type="button"
            onClick={() => {
              onPick(moment)
              onClose()
            }}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-opacity active:opacity-60"
            style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
              }}
            >
              {moment.photo_url && (
                <img src={moment.photo_url} alt={moment.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <span
              className="font-sans flex-1"
              style={{
                color: 'var(--text)',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {moment.title}
            </span>
            <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const currentUser = useAppStore((state) => state.currentUser)
  const moments = useAppStore((state) => state.moments)
  const people = useAppStore((state) => state.people)
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const removeFromCapsule = useAppStore((state) => state.removeFromCapsule)

  const [pickSlot, setPickSlot] = useState(null)
  const [addMomentSlot, setAddMomentSlot] = useState(null)

  const ownMoments = useMemo(
    () => moments.filter((moment) => !moment.isShared && moment.user_id === currentUser?.id),
    [moments, currentUser?.id],
  )

  const stats = useMemo(() => ({
    total: ownMoments.length,
    months: uniqueMonths(ownMoments),
    people: people.length,
  }), [ownMoments, people])

  async function handleAddToCapsule(slotIndex, moment) {
    addToCapsule(slotIndex, moment)

    try {
      await saveCapsuleSlot(currentUser.id, slotIndex, moment.id)
    } catch (error) {
      console.error('[Capsule] save error:', error)
    }
  }

  async function handleRemoveFromCapsule(slotIndex) {
    removeFromCapsule(slotIndex)

    try {
      await deleteCapsuleSlot(currentUser.id, slotIndex)
    } catch (error) {
      console.error('[Capsule] delete error:', error)
    }
  }

  const name = currentUser?.name || 'Пользователь'
  const since = sinceLabel(currentUser?.created_at)

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar" style={{ paddingBottom: 20 }}>
        <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 17, fontWeight: 600 }}>
          Профиль
        </span>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 108 }}>
        <section
          className="surface-card rounded-[24px]"
          style={{ padding: 20, marginBottom: 12 }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
              style={{
                width: 64,
                height: 64,
                background: currentUser?.photo_url ? 'transparent' : 'linear-gradient(160deg, #854E2A 0%, #D98B52 58%, #F0C88E 100%)',
                border: '3px solid rgba(255,255,255,0.8)',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {currentUser?.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                name[0]?.toUpperCase() ?? 'M'
              )}
            </div>

            <div className="min-w-0">
              <p className="font-sans truncate" style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, margin: 0 }}>
                {name}
              </p>
              {since && (
                <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 3 }}>
                  с memi с {since}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2" style={{ marginTop: 18 }}>
            {[
              { value: stats.total, label: plural.момент(stats.total) },
              { value: stats.months, label: plural.месяц(stats.months) },
              { value: stats.people, label: plural.человек(stats.people) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center rounded-[14px]"
                style={{ backgroundColor: 'var(--base)', padding: '12px 8px' }}
              >
                <span className="font-serif" style={{ color: 'var(--accent)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                  {item.value}
                </span>
                <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 11, marginTop: 4 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/people')}
            className="font-sans transition-opacity active:opacity-60"
            style={{
              marginTop: 14,
              border: 'none',
              background: 'none',
              color: 'var(--accent)',
              fontSize: 14,
              fontWeight: 600,
              padding: 0,
            }}
          >
            Мои люди
          </button>
        </section>

        <section>
          <div className="flex items-baseline gap-2" style={{ marginBottom: 14 }}>
            <span className="font-sans" style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700 }}>
              Капсула
            </span>
            <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 13 }}>
              · моменты на всю жизнь
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {capsule.map((slot, index) => (
              <CapsuleTile
                key={index}
                slot={slot}
                index={index}
                onEmpty={() => setPickSlot(index)}
                onFilled={() => handleRemoveFromCapsule(index)}
              />
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="profile" />

      {pickSlot !== null && (
        <PickMomentSheet
          onClose={() => setPickSlot(null)}
          onPick={(moment) => handleAddToCapsule(pickSlot, moment)}
          onCreateNew={() => setAddMomentSlot(pickSlot)}
        />
      )}

      {addMomentSlot !== null && (
        <AddMoment
          onClose={() => setAddMomentSlot(null)}
          afterSave={(moment) => {
            handleAddToCapsule(addMomentSlot, moment)
            setAddMomentSlot(null)
          }}
        />
      )}
    </div>
  )
}
