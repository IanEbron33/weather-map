// Gemini 4-pointed star with authentic Google brand colors
// Red(top) → Blue(right) → Green(bottom) → Yellow(left)
export default function GeminiIcon({ size = 18, id = 'g' }) {
  const star = "M12 2C11.5 7.2 9.1 9.6 2 12C9.1 14.4 11.5 16.8 12 22C12.5 16.8 14.9 14.4 22 12C14.9 9.6 12.5 7.2 12 2Z";

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`cp-${id}`}>
          <path d={star} />
        </clipPath>
        {/* Top-right: Red → Blue */}
        <linearGradient id={`ga-${id}`} x1="12" y1="0" x2="24" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA4335" />
          <stop offset="100%" stopColor="#4285F4" />
        </linearGradient>
        {/* Bottom-right: Blue → Green */}
        <linearGradient id={`gb-${id}`} x1="24" y1="12" x2="12" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
        {/* Bottom-left: Green → Yellow */}
        <linearGradient id={`gc-${id}`} x1="12" y1="24" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34A853" />
          <stop offset="100%" stopColor="#FBBC04" />
        </linearGradient>
        {/* Top-left: Yellow → Red */}
        <linearGradient id={`gd-${id}`} x1="0" y1="12" x2="12" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBC04" />
          <stop offset="100%" stopColor="#EA4335" />
        </linearGradient>
      </defs>

      {/* 4 quadrant rects, all clipped to the star shape */}
      <rect x="12" y="0"  width="12" height="12" fill={`url(#ga-${id})`} clipPath={`url(#cp-${id})`} />
      <rect x="12" y="12" width="12" height="12" fill={`url(#gb-${id})`} clipPath={`url(#cp-${id})`} />
      <rect x="0"  y="12" width="12" height="12" fill={`url(#gc-${id})`} clipPath={`url(#cp-${id})`} />
      <rect x="0"  y="0"  width="12" height="12" fill={`url(#gd-${id})`} clipPath={`url(#cp-${id})`} />
    </svg>
  );
}
