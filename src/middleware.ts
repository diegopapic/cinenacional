// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting con memoria (el middleware no soporta Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// LÍMITES ACTUALIZADOS PARA PRODUCCIÓN
const RATE_LIMITS = {
  api: { requests: 1000, window: 60000 },      // 1000 req/min
  static: { requests: 2000, window: 60000 },   // 2000 req/min  
  auth: { requests: 10, window: 300000 },      // 10 req/5min
  search: { requests: 500, window: 60000 }     // 500 req/min para búsquedas
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
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of requestCounts.entries()) {
      if (value.resetTime < now) {
        requestCounts.delete(key)
      }
    }
  }, 300000)
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const path = request.nextUrl.pathname
  
  // ============ PROTECCIÓN DE ADMIN ============
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') {
      return response
    }
    
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('callbackUrl', path)
        return NextResponse.redirect(loginUrl)
      }
      
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
  
  // CSP actualizado con Google Analytics, Cloudinary y AdSense
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://res.cloudinary.com https://upload-widget.cloudinary.com https://pagead2.googlesyndication.com https://adservice.google.com https://*.googlesyndication.com https://*.google; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://*.cloudinary.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.google https://*.doubleclick.net; " +
    "frame-src 'self' https://upload-widget.cloudinary.com https://*.cloudinary.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.google; " +
    "media-src 'self' https://res.cloudinary.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';"
  )
  
  // ============ RATE LIMITING ============
  // Excluir assets estáticos del rate limiting
  if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf)$/)) {
    return response
  }
  
  const clientKey = getRateLimitKey(request)
  
  // Determinar límite según el tipo de ruta
  let rateLimit = RATE_LIMITS.static
  if (path.startsWith('/api/')) {
    // Límite especial para búsquedas
    if (path.includes('/search') || path.includes('/autocomplete')) {
      rateLimit = RATE_LIMITS.search
    } else {
      rateLimit = RATE_LIMITS.api
    }
  } else if (path.startsWith('/api/auth/') || path === '/admin/login') {
    rateLimit = RATE_LIMITS.auth
  }
  
  // Verificar rate limit
  if (!checkRateLimit(clientKey, rateLimit)) {
    console.log(`Rate limit exceeded for IP: ${clientKey} on path: ${path}`)
    
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
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://cinenacional.com', 'https://www.cinenacional.com', 'https://5.161.58.106:3000']
      : ['http://localhost:3000', 'http://5.161.58.106:3000']
    
    const origin = request.headers.get('origin')
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
    
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}