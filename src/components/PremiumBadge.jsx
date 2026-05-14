export default function PremiumBadge({ label = 'memi+', compact = false, className = '' }) {
  return (
    <span className={`premium-badge ${compact ? 'premium-badge-compact' : ''} ${className}`.trim()}>
      <span className="premium-badge-label">{label}</span>
    </span>
  )
}
