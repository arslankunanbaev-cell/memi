export default function FAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed z-40 flex items-center justify-center shadow-lg transition-transform active:scale-90"
      style={{
        bottom: 'calc(max(0.75rem, env(safe-area-inset-bottom)) + 68px)',
        right: '1.25rem',
        width: 52,
        height: 52,
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        color: '#fff',
        border: 'none',
        fontSize: 26,
        lineHeight: 1,
        boxShadow: '0 4px 20px rgba(217,139,82,0.45)',
      }}
      aria-label="Добавить момент"
    >
      +
    </button>
  )
}
