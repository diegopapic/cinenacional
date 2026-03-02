// src/lib/rate-limit.ts
// Rate limiting persistente con Redis + fallback in-memory.

import { NextResponse } from 'next/server'
import RedisClient from '@/lib/redis'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Máximo de requests permitidos en la ventana */
  max: number
  /** Ventana de tiempo en segundos */
  windowSec: number
  /** Prefijo para la key de Redis (e.g., 'auth', 'search', 'api') */
  prefix: string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // timestamp en ms
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const RATE_LIMIT_PRESETS = {
  auth: { max: 10, windowSec: 300, prefix: 'rl:auth' },      // 10 req / 5 min
  search: { max: 60, windowSec: 60, prefix: 'rl:search' },    // 60 req / min
  api: { max: 100, windowSec: 60, prefix: 'rl:api' },         // 100 req / min
} satisfies Record<string, RateLimitConfig>

// ---------------------------------------------------------------------------
// Fallback in-memory (para desarrollo sin Redis)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Limpieza periódica del store en memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetAt < now) memoryStore.delete(key)
    }
  }, 60_000)
}

function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const record = memoryStore.get(key)

  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowSec * 1000
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.max - 1, resetAt }
  }

  record.count++
  const allowed = record.count <= config.max
  return {
    allowed,
    remaining: Math.max(0, config.max - record.count),
    resetAt: record.resetAt,
  }
}

// ---------------------------------------------------------------------------
// Redis rate limiting (fixed window con INCR + EXPIRE)
// ---------------------------------------------------------------------------

async function checkRedis(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const client = RedisClient.getInstance()
  if (!client) return null

  try {
    const count = await client.incr(key)

    // Primera request en la ventana: setear TTL
    if (count === 1) {
      await client.expire(key, config.windowSec)
    }

    const ttl = await client.ttl(key)
    const resetAt = Date.now() + ttl * 1000

    return {
      allowed: count <= config.max,
      remaining: Math.max(0, config.max - count),
      resetAt,
    }
  } catch {
    return null // fallback a in-memory
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Verifica el rate limit para un identificador (IP, userId, etc.).
 * Usa Redis si está disponible, con fallback a in-memory.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.prefix}:${identifier}`

  // Intentar con Redis primero
  const redisResult = await checkRedis(key, config)
  if (redisResult) return redisResult

  // Fallback in-memory
  return checkMemory(key, config)
}

/**
 * Aplica rate limiting a un request de API.
 * Retorna null si el request está permitido, o un NextResponse 429 si excede el límite.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
 *   const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.auth)
 *   if (limited) return limited
 *   // ... handler normal
 * }
 */
export async function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier, config)

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Demasiadas solicitudes. Intentá de nuevo más tarde.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        },
      }
    )
  }

  return null
}

/**
 * Extrae la IP del cliente desde los headers del request.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}
