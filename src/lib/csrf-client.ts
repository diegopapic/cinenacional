// src/lib/csrf-client.ts
// Client-side CSRF token utilities.
// Reads the CSRF token from the cookie set by middleware and provides
// headers for fetch() calls.

const CSRF_COOKIE_NAME = 'csrf-token'

/**
 * Read the CSRF token from the cookie.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Returns headers object with the CSRF token for use in fetch() calls.
 * Spread into your headers: `headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() }`
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { 'x-csrf-token': token } : {}
}
