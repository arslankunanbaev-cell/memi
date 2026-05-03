export default function FAB({
  onClick,
  children = '+',
  ariaLabel = 'Добавить момент',
  right = 20,
  variant = 'primary',
}) {
  const isPrimary = variant === 'primary'

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-40 flex items-center justify-center transition-transform active:scale-95"
      style={{
        right,
        bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 96px)',
        width: 52,
        height: 52,
        border: isPrimary ? 'none' : '1px solid rgba(160, 94, 44, 0.12)',
        borderRadius: '50%',
        backgroundColor: isPrimary ? 'var(--accent)' : 'var(--moment-surface)',
        color: isPrimary ? '#fff' : 'var(--accent)',
        fontSize: 28,
        lineHeight: 1,
        boxShadow: isPrimary ? 'var(--shadow-accent)' : 'var(--shadow-card)',
      }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
