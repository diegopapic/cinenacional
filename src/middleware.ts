// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

// Rate limiting con memoria (temporal hasta tener Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Límites por tipo de ruta
const RATE_LIMITS = {
  api: { requests: 100, window: 60000 }, // 100 req/min para API
  static: { requests: 200, window: 60000 }, // 200 req/min para páginas
  auth: { requests: 5, window: 300000 }, // 5 req/5min para auth (futuro)
}

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown'
  return ip
}

function checkRateLimit(key: string, limit: typeof RATE_LIMITS.api): boolean {
  const now = Date.now()
  const record = requestCounts.get(key)
  
  if (!record || record.resetTime < now) {
    requestCounts.set(key, { count: 1, resetTime: now + limit.window })
    return true
  }
  
  if (record.count >= limit.requests) {
    return false
  }
  
  record.count++
  return true
}

// Limpiar registros viejos cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < now) {
      requestCounts.delete(key)
    }
  }
}, 300000)

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 1. Headers de seguridad
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // CSP básico (ajustar según necesidades)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.cloudinary.com; " +
    "frame-ancestors 'none';"
  )
  
  // 2. Rate limiting
  const path = request.nextUrl.pathname
  const clientKey = getRateLimitKey(request)
  
  let rateLimit = RATE_LIMITS.static
  if (path.startsWith('/api/')) {
    rateLimit = RATE_LIMITS.api
  } else if (path.startsWith('/auth/')) {
    rateLimit = RATE_LIMITS.auth
  }
  
  if (!checkRateLimit(clientKey, rateLimit)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': rateLimit.requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rateLimit.window).toISOString(),
      },
    })
  }
  
  // 3. CORS para API (ajustar origins según necesidad)
  if (path.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*') // Cambiar a dominio específico en producción
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  // 4. Protección básica contra bots maliciosos
  const userAgent = request.headers.get('user-agent') || ''
  const blockedBots = ['bot', 'crawler', 'spider', 'scraper']
  const isBlockedBot = blockedBots.some(bot => 
    userAgent.toLowerCase().includes(bot) && 
    !userAgent.includes('googlebot') && 
    !userAgent.includes('bingbot')
  )
  
  if (isBlockedBot && path.startsWith('/api/')) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  return response
}

// Configurar en qué rutas aplicar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}