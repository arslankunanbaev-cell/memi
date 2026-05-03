export default function CapsuleIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.4 16.6a4.8 4.8 0 0 1 0-6.8l2.4-2.4a4.8 4.8 0 0 1 6.8 6.8l-2.4 2.4a4.8 4.8 0 0 1-6.8 0Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.55 14.45 4.9-4.9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.25 18.2 5 19.45M18.95 5.5 20.2 4.25"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
