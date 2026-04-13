import { useEffect, useRef } from 'react'

export default function BottomSheet({ onClose, title, children }) {
  const sheetRef = useRef(null)

  // Close on overlay tap
  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Prevent scroll bleed
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(23,20,14,0.45)' }}
      onClick={handleOverlay}
    >
      <div
        ref={sheetRef}
        className="flex flex-col w-full"
        style={{
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90dvh',
          animation: 'slideUp 0.22s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--surface)',
            }}
          />
        </div>

        {/* Header */}
        {title && (
          <div className="px-5 pb-3 pt-1">
            <h3
              className="font-serif"
              style={{ fontSize: 20, color: 'var(--text)', fontWeight: 400 }}
            >
              {title}
            </h3>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 pb-safe" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
