// ===== Helper Functions =====

// Pass the IANA timezone string from the weather API response (e.g. "Asia/Manila")
// so radar timestamps are consistent with the forecast data's timezone.
// Falls back to the user's local timezone if not provided.

export function formatUnixShort(unix, timezone) {
  return new Date(unix * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

export function formatUnixFull(unix, timezone) {
  return new Date(unix * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

export function isMobile() {
  return window.innerWidth <= 768;
}