export default function FAB({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-40 flex items-center justify-center transition-transform active:scale-95"
      style={{
        right: 20,
        bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 72px)',
        width: 52,
        height: 52,
        border: 'none',
        borderRadius: '50%',
        backgroundColor: 'var(--accent)',
        color: '#fff',
        fontSize: 28,
        lineHeight: 1,
        boxShadow: 'var(--shadow-accent)',
      }}
      aria-label="Добавить момент"
    >
      +
    </button>
  )
}
