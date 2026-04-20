import { useEffect, useRef } from 'react'

export default function BottomSheet({ onClose, title, children }) {
  const sheetRef = useRef(null)

  function handleOverlay(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(23, 20, 14, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={handleOverlay}
    >
      <div
        ref={sheetRef}
        className="flex w-full flex-col"
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -10px 40px rgba(80, 50, 30, 0.18)',
          maxHeight: '90dvh',
          overflow: 'hidden',
          animation: 'slideUp 0.22s ease',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              backgroundColor: 'var(--accent-light)',
            }}
          />
        </div>

        {title && (
          <div className="px-5 pb-3 pt-1">
            <h3
              className="font-serif"
              style={{
                color: 'var(--text)',
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h3>
          </div>
        )}

        <div
          className="hide-scrollbar flex-1 overflow-y-auto"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
