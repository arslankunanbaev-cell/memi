// Splash — просто визуальная заглушка пока App.jsx инициализируется.
// Вся логика навигации (isNew → onboarding / home) живёт в App.jsx.
export default function Splash() {
  return (
    <div
      className="flex items-center justify-center h-full w-full"
      style={{ backgroundColor: 'var(--base)' }}
    >
      <h1
        className="font-serif"
        style={{
          fontSize: 48,
          letterSpacing: '4px',
          color: 'var(--text)',
          fontWeight: 300,
        }}
      >
        memi
      </h1>
    </div>
  )
}
