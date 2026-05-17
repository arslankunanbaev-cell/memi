import BottomSheet from './BottomSheet'
import { getPhotoCropStyle, normalizePhotoCrop } from '../lib/photoCrop'

export default function PhotoCropSheet({ photoUrl, crop, onChange, onClose }) {
  const value = normalizePhotoCrop(crop)

  function updateCrop(patch) {
    onChange(normalizePhotoCrop({ ...value, ...patch }))
  }

  if (!photoUrl) return null

  return (
    <BottomSheet onClose={onClose} title="Кадр превью">
      <div className="px-4 flex flex-col gap-5 pb-5">
        <div
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <img
            src={photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', ...getPhotoCropStyle(value) }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <label className="font-sans" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
            Горизонталь
            <input
              type="range"
              min="0"
              max="100"
              value={value.x}
              onChange={(event) => updateCrop({ x: event.target.value })}
              className="w-full"
              style={{ accentColor: 'var(--accent)', marginTop: 10 }}
            />
          </label>

          <label className="font-sans" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
            Вертикаль
            <input
              type="range"
              min="0"
              max="100"
              value={value.y}
              onChange={(event) => updateCrop({ y: event.target.value })}
              className="w-full"
              style={{ accentColor: 'var(--accent)', marginTop: 10 }}
            />
          </label>
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
