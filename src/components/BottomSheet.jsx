import { useEffect } from 'react'

export default function BottomSheet({ onClose, title, children }) {
  function handleOverlay(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(23, 20, 14, 0.34)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleOverlay}
    >
      <div
        className="flex w-full flex-col"
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, var(--card) 48%, #F6EFE7 100%)',
          borderRadius: '32px 32px 0 0',
          borderTop: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 -18px 56px rgba(80, 50, 30, 0.24)',
          maxHeight: '88dvh',
          overflow: 'hidden',
          animation: 'slideUp 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top center, rgba(255,255,255,0.4), transparent 38%)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex justify-center pt-3 pb-2" style={{ position: 'relative' }}>
          <div
            style={{
              width: 44,
              height: 5,
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(217,139,82,0.34) 0%, rgba(217,139,82,0.72) 50%, rgba(217,139,82,0.34) 100%)',
            }}
          />
        </div>

        {title && (
          <div className="px-4 pb-3 pt-1" style={{ position: 'relative' }}>
            <h3
              className="font-sans type-sheet-title"
              style={{
                color: 'var(--text)',
                lineHeight: 1.15,
              }}
            >
              {title}
            </h3>
          </div>
        )}

        <div
          className="hide-scrollbar flex-1 overflow-y-auto"
          style={{
            position: 'relative',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
