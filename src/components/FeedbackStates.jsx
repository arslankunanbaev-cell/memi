export function AppEmptyState({
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  compact = false,
}) {
  return (
    <div
      className="surface-card-strong flex flex-col items-center justify-center text-center"
      style={{
        borderRadius: compact ? 24 : 28,
        padding: compact ? '28px 22px' : '34px 24px',
        border: '1px solid rgba(160, 94, 44, 0.08)',
      }}
    >
      {icon && (
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: compact ? 58 : 68,
            height: compact ? 58 : 68,
            marginBottom: 16,
            backgroundColor: 'rgba(217, 139, 82, 0.12)',
            color: 'var(--accent)',
          }}
        >
          {icon}
        </div>
      )}

      <p className="font-sans" style={{ margin: 0, color: 'var(--text)', fontSize: 17, fontWeight: 700 }}>
        {title}
      </p>

      {description && (
        <p
          className="font-sans"
          style={{
            margin: '7px 0 0',
            maxWidth: 280,
            color: 'var(--mid)',
            fontSize: 14,
            lineHeight: 1.48,
          }}
        >
          {description}
        </p>
      )}

      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 20 }}>
          {primaryLabel && (
            <button
              type="button"
              onClick={onPrimary}
              className="font-sans transition-opacity active:opacity-70"
              style={{
                border: 'none',
                borderRadius: 999,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '12px 18px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="font-sans transition-opacity active:opacity-60"
              style={{
                border: '1px solid rgba(160, 94, 44, 0.12)',
                borderRadius: 999,
                backgroundColor: 'var(--moment-surface)',
                color: 'var(--deep)',
                fontSize: 14,
                fontWeight: 700,
                padding: '11px 17px',
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AppToast({ message, actionLabel, onAction, onClose }) {
  return (
    <div
      className="fixed left-4 right-4 z-50 flex items-center gap-3"
      style={{
        bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 166px)',
        borderRadius: 20,
        backgroundColor: 'rgba(23, 20, 14, 0.92)',
        color: '#fff',
        padding: '13px 14px 13px 16px',
        boxShadow: '0 14px 34px rgba(23, 20, 14, 0.24)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        animation: 'fadeSlideUp 0.22s ease both',
      }}
      role="status"
    >
      <span className="font-sans min-w-0 flex-1" style={{ fontSize: 14, fontWeight: 600 }}>
        {message}
      </span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="font-sans transition-opacity active:opacity-70"
          style={{
            border: 'none',
            background: 'none',
            color: '#F2B985',
            fontSize: 14,
            fontWeight: 800,
            padding: '4px 2px',
          }}
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="flex items-center justify-center transition-opacity active:opacity-70"
        style={{
          width: 28,
          height: 28,
          border: 'none',
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.72)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
