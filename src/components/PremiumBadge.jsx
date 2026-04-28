function PremiumMarkIcon() {
  return (
    <svg className="premium-badge-mark" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.75l2.65 5.36 5.92.86-4.28 4.17 1.01 5.89L12 16.24l-5.3 2.79 1.01-5.89-4.28-4.17 5.92-.86L12 2.75Z"
        fill="currentColor"
      />
      <path
        d="M9.55 9.25 12 4.3l2.45 4.95 5.47.79-3.96 3.86.93 5.44L12 16.77l-4.89 2.57.93-5.44-3.96-3.86 5.47-.79Z"
        fill="none"
        stroke="rgba(255,255,255,0.64)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PremiumBadge({ label = 'Memi+', compact = false, className = '' }) {
  return (
    <span className={`premium-badge ${compact ? 'premium-badge-compact' : ''} ${className}`.trim()}>
      <span className="premium-badge-orbit" aria-hidden="true" />
      <span className="premium-badge-icon" aria-hidden="true">
        <PremiumMarkIcon />
      </span>
      <span className="premium-badge-label">{label}</span>
    </span>
  )
}
