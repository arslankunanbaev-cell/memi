// Splash — просто визуальная заглушка пока App.jsx инициализируется.
// Вся логика навигации (isNew → onboarding / home) живёт в App.jsx.
export default function Splash() {
  return (
    <div
      className="flex items-center justify-center h-full w-full"
      style={{ backgroundColor: 'var(--base)' }}
    >
      <h1
        className="type-brand"
        style={{
          fontSize: 48,
          color: 'var(--text)',
          margin: 0,
        }}
      >
        memi
      </h1>
    </div>
  )
}
