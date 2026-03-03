// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateSignedCsrfToken,
  verifyCsrfSignature
} from '@/lib/csrf'

// Rate limiting en middleware: primera línea de defensa (in-memory, Edge Runtime).
// El rate limiting persistente con Redis se aplica en las rutas de API
// individuales (ver src/lib/rate-limit.ts).
const requestCounts = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMITS = {
  api: { requests: 1000, window: 60000 },      // 1000 req/min
  auth: { requests: 10, window: 300000 },      // 10 req/5min
  search: { requests: 500, window: 60000 }     // 500 req/min
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
  const path = request.nextUrl.pathname

  // Generar nonce para CSP (per-request)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Pasar nonce a layouts via request header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  })
  
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
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '0') // Desactivado - CSP lo reemplaza, el modo block puede causar vulnerabilidades
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload') // 2 años HSTS
  }
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()') // Restringir APIs del browser

  // CSP - única fuente de verdad (eliminada de next.config.js)
  // Nonce-based strict CSP: 'strict-dynamic' permite que scripts cargados por scripts con nonce sean confiables.
  // 'unsafe-inline' y https: son fallbacks para browsers que no soportan nonces/strict-dynamic.
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: nonce reemplaza unsafe-inline, strict-dynamic propaga confianza a scripts cargados dinámicamente (GTM, GA, AdSense)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} 'unsafe-inline' https:`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com https://images.unsplash.com https://img.youtube.com https://i.ytimg.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://www.google.com.ar https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://*.cloudinary.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://www.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://csi.gstatic.com",
    "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://upload-widget.cloudinary.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://www.googletagmanager.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.google.com",
    "media-src 'self' https://res.cloudinary.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === 'production' ? ["upgrade-insecure-requests"] : [])
  ]
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))
  
  // ============ RATE LIMITING ============
  // Excluir assets estáticos del rate limiting
  if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf)$/)) {
    return response
  }
  
  const clientKey = getRateLimitKey(request)
  
  // Determinar límite según el tipo de ruta
  let rateLimit = RATE_LIMITS.api
  if (path.startsWith('/api/auth/') || path === '/admin/login') {
    rateLimit = RATE_LIMITS.auth
  } else if (path.includes('/search') || path.includes('/autocomplete')) {
    rateLimit = RATE_LIMITS.search
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
  
  // ============ PROTECCIÓN CSRF + CORS PARA API ============
  if (path.startsWith('/api/')) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://cinenacional.com', 'https://www.cinenacional.com']
      : ['http://localhost:3000']

    // CSRF: rechazar mutaciones de orígenes externos + validar token CSRF
    // /api/auth/ se excluye: NextAuth maneja su propia validación CSRF
    // /api/analytics/ se excluye: usa sendBeacon que no puede enviar headers custom
    // Si no hay Origin ni Referer (same-origin request), se permite (el browser no los envía en same-origin)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && !path.startsWith('/api/auth/') && !path.startsWith('/api/analytics/')) {
      const origin = request.headers.get('origin')
      const referer = request.headers.get('referer')

      if (origin) {
        // Hay Origin header — verificar que sea nuestro dominio
        if (!allowedOrigins.includes(origin)) {
          console.log(`CSRF blocked: origin=${origin}, path=${path}`)
          return new NextResponse(JSON.stringify({ error: 'Origen no permitido' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } else if (referer) {
        // No hay Origin pero sí Referer — verificar
        if (!allowedOrigins.some(o => referer.startsWith(o))) {
          console.log(`CSRF blocked: referer=${referer}, path=${path}`)
          return new NextResponse(JSON.stringify({ error: 'Origen no permitido' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
      // Si no hay ni Origin ni Referer: same-origin request, permitir

      // CSRF Token: validar signed double-submit cookie
      // El token se genera en el middleware y se setea como cookie no-httpOnly.
      // El cliente lo lee del cookie y lo envía como header X-CSRF-Token.
      const csrfSecret = process.env.NEXTAUTH_SECRET
      if (csrfSecret) {
        const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
        const headerToken = request.headers.get(CSRF_HEADER_NAME)

        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
          return new NextResponse(JSON.stringify({ error: 'Token CSRF inválido' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const isValid = await verifyCsrfSignature(cookieToken, csrfSecret)
        if (!isValid) {
          return new NextResponse(JSON.stringify({ error: 'Token CSRF inválido' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }

    // CORS headers
    const corsOrigin = request.headers.get('origin')
    if (corsOrigin && allowedOrigins.includes(corsOrigin)) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin)
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token')
    response.headers.set('Access-Control-Max-Age', '86400')

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  // ============ CSRF TOKEN COOKIE ============
  // Generar y setear cookie CSRF si no existe. El token es non-httpOnly para
  // que JavaScript pueda leerlo y enviarlo como header en requests de mutación.
  const existingCsrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const csrfSecret = process.env.NEXTAUTH_SECRET
  if (!existingCsrfToken && csrfSecret) {
    const csrfToken = await generateSignedCsrfToken(csrfSecret)
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400 // 24 horas
    })
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