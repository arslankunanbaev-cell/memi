import { useRef } from 'react'
import BottomSheet from './BottomSheet'
import { getPhotoCropStyle, normalizePhotoCrop } from '../lib/photoCrop'

const FOCUS_POINTS = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 50 },
  { x: 50, y: 50 },
  { x: 100, y: 50 },
  { x: 0, y: 100 },
  { x: 50, y: 100 },
  { x: 100, y: 100 },
]

export function CropIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v14h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7h14v14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PhotoCropSheet({ photoUrl, crop, onChange, onClose }) {
  const dragRef = useRef(null)
  const value = normalizePhotoCrop(crop)

  function updateCrop(patch) {
    onChange(normalizePhotoCrop({ ...value, ...patch }))
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      crop: value,
      width: event.currentTarget.clientWidth || 1,
      height: event.currentTarget.clientHeight || 1,
    }
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return
    const drag = dragRef.current
    updateCrop({
      x: drag.crop.x - ((event.clientX - drag.startX) / drag.width) * 100,
      y: drag.crop.y - ((event.clientY - drag.startY) / drag.height) * 100,
    })
  }

  function handlePointerUp(event) {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
  }

  if (!photoUrl) return null

  return (
    <BottomSheet onClose={onClose} title="Кадр превью">
      <div className="px-4 flex flex-col gap-5 pb-5">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative"
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
            touchAction: 'none',
            cursor: 'grab',
          }}
        >
          <img
            src={photoUrl}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              userSelect: 'none',
              transform: 'scale(1.02)',
              ...getPhotoCropStyle(value),
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 10,
              border: '1.5px solid rgba(255,255,255,0.88)',
              borderRadius: 16,
              boxShadow: '0 0 0 999px rgba(23,20,14,0.14), inset 0 0 0 1px rgba(23,20,14,0.12)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 10,
              backgroundImage: [
                'linear-gradient(to right, transparent 33.1%, rgba(255,255,255,0.58) 33.1%, rgba(255,255,255,0.58) 33.7%, transparent 33.7%, transparent 66.3%, rgba(255,255,255,0.58) 66.3%, rgba(255,255,255,0.58) 66.9%, transparent 66.9%)',
                'linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,0.58) 33.1%, rgba(255,255,255,0.58) 33.7%, transparent 33.7%, transparent 66.3%, rgba(255,255,255,0.58) 66.3%, rgba(255,255,255,0.58) 66.9%, transparent 66.9%)',
              ].join(', '),
              borderRadius: 16,
              pointerEvents: 'none',
            }}
          />
          <div
            className="font-sans"
            style={{
              position: 'absolute',
              left: 14,
              bottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              borderRadius: 999,
              background: 'rgba(23,20,14,0.58)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '7px 11px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <CropIcon size={14} color="#fff" />
            Центр кадра
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            borderRadius: 18,
            backgroundColor: 'var(--moment-surface)',
            boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
            padding: 10,
          }}
        >
          {FOCUS_POINTS.map((point) => {
            const active = Math.abs(value.x - point.x) <= 12 && Math.abs(value.y - point.y) <= 12
            return (
              <button
                key={`${point.x}-${point.y}`}
                type="button"
                onClick={() => onChange(point)}
                aria-label="Выбрать фокус кадра"
                className="transition-opacity active:opacity-70"
                style={{
                  height: 38,
                  border: 'none',
                  borderRadius: 12,
                  backgroundColor: active ? 'var(--accent)' : 'var(--base)',
                  color: active ? '#fff' : 'var(--soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: active ? 9 : 7,
                    height: active ? 9 : 7,
                    borderRadius: '50%',
                    backgroundColor: 'currentColor',
                  }}
                />
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 9999,
            padding: '13px 0',
            fontSize: 15,
          }}
        >
          Готово
        </button>
      </div>
    </BottomSheet>
  )
}
