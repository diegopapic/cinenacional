// src/lib/csrf.ts
// Signed Double-Submit Cookie CSRF protection (Edge Runtime compatible).
//
// Flow:
// 1. Middleware generates a signed CSRF token and sets it as a cookie (non-httpOnly)
// 2. Client JavaScript reads the cookie and sends the value as X-CSRF-Token header
// 3. Middleware validates: header === cookie AND signature is valid (HMAC-SHA256)
//
// The signing prevents subdomain cookie injection attacks: an attacker who can
// set cookies for the parent domain cannot forge a valid signature without the secret.

export const CSRF_COOKIE_NAME = 'csrf-token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * HMAC-SHA256 sign a token with a secret key.
 * Returns hex-encoded signature.
 */
async function hmacSign(token: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(token))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a signed CSRF token: `{uuid}.{hmac-signature}`
 */
export async function generateSignedCsrfToken(secret: string): Promise<string> {
  const token = crypto.randomUUID()
  const signature = await hmacSign(token, secret)
  return `${token}.${signature}`
}

/**
 * Verify that a signed CSRF token has a valid signature.
 */
export async function verifyCsrfSignature(signedToken: string, secret: string): Promise<boolean> {
  const dotIndex = signedToken.indexOf('.')
  if (dotIndex === -1) return false

  const token = signedToken.substring(0, dotIndex)
  const signature = signedToken.substring(dotIndex + 1)
  if (!token || !signature) return false

  const expectedSignature = await hmacSign(token, secret)
  return timingSafeEqual(signature, expectedSignature)
}
