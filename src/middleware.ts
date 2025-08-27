// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting con memoria (temporal hasta tener Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Límites por tipo de ruta
const RATE_LIMITS = {
  api: { requests: 100, window: 60000 }, // 100 req/min para API
  static: { requests: 200, window: 60000 }, // 200 req/min para páginas
  auth: { requests: 5, window: 300000 }, // 5 req/5min para auth
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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const path = request.nextUrl.pathname
  
  // ============ PROTECCIÓN DE ADMIN ============
  if (path.startsWith('/admin')) {
    // Permitir acceso a la página de login
    if (path === '/admin/login') {
      return response
    }
    
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      // No autenticado
      if (!token) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('callbackUrl', path)
        return NextResponse.redirect(loginUrl)
      }
      
      // Verificar rol (considerando el campo legacy isAdmin)
      const hasAdminAccess = 
        token.role === 'ADMIN' || 
        token.role === 'EDITOR' ||
        token.isAdmin === true
      
      if (!hasAdminAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  
  // ============ HEADERS DE SEGURIDAD ============
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // CSP ACTUALIZADO PARA CLOUDINARY Y GOOGLE ANALYTICS
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://res.cloudinary.com https://upload-widget.cloudinary.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob: https://www.googletagmanager.com https://www.google-analytics.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://*.cloudinary.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; " +
    "frame-src 'self' https://upload-widget.cloudinary.com https://*.cloudinary.com; " +
    "media-src 'self' https://res.cloudinary.com; " +
    "frame-ancestors 'none';"
  )
  
  // ============ RATE LIMITING ============
  const clientKey = getRateLimitKey(request)
  
  let rateLimit = RATE_LIMITS.static
  if (path.startsWith('/api/')) {
    rateLimit = RATE_LIMITS.api
  } else if (path.startsWith('/api/auth/') || path === '/admin/login') {
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
  
  // ============ CORS PARA API ============
  if (path.startsWith('/api/')) {
    // Solo permitir desde el dominio en producción
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://cinenacional.com', 'https://www.cinenacional.com']
      : ['http://localhost:3000', 'http://5.161.58.106:3000']
    
    const origin = request.headers.get('origin')
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  // ============ PROTECCIÓN CONTRA BOTS ============
  const userAgent = request.headers.get('user-agent') || ''
  const blockedBots = ['bot', 'crawler', 'spider', 'scraper']
  const allowedBots = ['googlebot', 'bingbot', 'facebookexternalhit', 'twitterbot']
  
  const isBlockedBot = blockedBots.some(bot => 
    userAgent.toLowerCase().includes(bot) && 
    !allowedBots.some(allowed => userAgent.toLowerCase().includes(allowed))
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