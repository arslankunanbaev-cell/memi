export function SkeletonBlock({ style = {}, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer ${className}`}
      style={style}
    />
  )
}

export function RouteLoadingState() {
  return (
    <div className="h-full w-full px-4 pt-topbar" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex items-center justify-between" style={{ paddingBottom: 18 }}>
        <SkeletonBlock style={{ width: 84, height: 30, borderRadius: 12 }} />
        <SkeletonBlock style={{ width: 112, height: 24, borderRadius: 999 }} />
      </div>
      <div className="flex flex-col gap-5" style={{ paddingBottom: 110 }}>
        {[0, 1].map((index) => (
          <div
            key={index}
            style={{
              overflow: 'hidden',
              borderRadius: 22,
              backgroundColor: 'var(--moment-surface)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <SkeletonBlock style={{ width: '100%', aspectRatio: '4 / 3' }} />
            <div style={{ padding: 16 }}>
              <SkeletonBlock style={{ width: '72%', height: 16, borderRadius: 999, marginBottom: 10 }} />
              <SkeletonBlock style={{ width: '48%', height: 14, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailLoadingState() {
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <SkeletonBlock style={{ width: '100%', height: 'min(390px, 52vh)' }} />
      <div className="px-4" style={{ paddingTop: 18 }}>
        <SkeletonBlock style={{ width: 168, height: 30, borderRadius: 999, marginBottom: 18 }} />
        <SkeletonBlock style={{ width: '86%', height: 34, borderRadius: 12, marginBottom: 14 }} />
        <SkeletonBlock style={{ width: '62%', height: 18, borderRadius: 999, marginBottom: 28 }} />
        <SkeletonBlock style={{ width: '100%', height: 66, borderRadius: 20, marginBottom: 24 }} />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonBlock key={index} style={{ width: 52, height: 42, borderRadius: 20 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
