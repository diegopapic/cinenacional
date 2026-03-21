// src/app/api/efemerides/route.ts
// Delegates data fetching to lib/queries/efemerides.ts.
// Keeps Redis + memory cache layer for API consumers.

import { NextRequest, NextResponse } from 'next/server'
import { getEfemerides } from '@/lib/queries/efemerides'
import { parseIntClamped } from '@/lib/api/parse-params'
import RedisClient from '@/lib/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:efemerides')

export const dynamic = 'force-dynamic'

const memoryCache = new Map<string, { data: string; timestamp: number }>()
const MEMORY_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h
const REDIS_TTL = 86400 // 24h

function getCacheKey(day: number, month: number): string {
  return `efemerides:${month}-${day}:v4`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hoy = new Date()
    const dia = parseIntClamped(searchParams.get('day') || searchParams.get('dia'), hoy.getDate(), 1, 31)
    const mes = parseIntClamped(searchParams.get('month') || searchParams.get('mes'), hoy.getMonth() + 1, 1, 12)

    const cacheKey = getCacheKey(dia, mes)
    const now = Date.now()

    // 1. Redis cache
    try {
      const redisCached = await RedisClient.get(cacheKey)
      if (redisCached) {
        log.debug('Cache HIT (Redis)')
        return NextResponse.json(JSON.parse(redisCached), {
          headers: {
            'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
            'X-Cache': 'HIT',
            'X-Cache-Source': 'redis',
          },
        })
      }
    } catch (redisError) {
      log.warn('Redis error (non-fatal)', { error: String(redisError) })
    }

    // 2. Memory cache
    const memoryCached = memoryCache.get(cacheKey)
    if (memoryCached && now - memoryCached.timestamp < MEMORY_CACHE_TTL) {
      log.debug('Cache HIT (memory)')
      RedisClient.set(cacheKey, memoryCached.data, REDIS_TTL).catch(() => {})
      return NextResponse.json(JSON.parse(memoryCached.data), {
        headers: {
          'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory',
        },
      })
    }

    // 3. Fetch from DB via shared query function
    log.debug('Cache MISS')
    const { efemerides } = await getEfemerides(mes, dia)
    const resultado = { efemerides }
    const json = JSON.stringify(resultado)

    // Save to caches
    RedisClient.set(cacheKey, json, REDIS_TTL).catch(err => log.warn('Redis save error', err))
    memoryCache.set(cacheKey, { data: json, timestamp: now })

    // Evict oldest entry if cache grows too large
    if (memoryCache.size > 365) {
      const oldestKey = memoryCache.keys().next().value
      if (oldestKey) memoryCache.delete(oldestKey)
    }

    return NextResponse.json(resultado, {
      headers: {
        'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
      },
    })
  } catch (error) {
    log.error('Failed to fetch efemerides', error)

    // Try stale memory cache
    const searchParams = request.nextUrl.searchParams
    const hoy = new Date()
    const dia = parseIntClamped(searchParams.get('day') || searchParams.get('dia'), hoy.getDate(), 1, 31)
    const mes = parseIntClamped(searchParams.get('month') || searchParams.get('mes'), hoy.getMonth() + 1, 1, 12)
    const stale = memoryCache.get(getCacheKey(dia, mes))

    if (stale) {
      log.warn('Serving stale cache')
      return NextResponse.json(JSON.parse(stale.data), {
        headers: { 'Cache-Control': 'public, s-maxage=60', 'X-Cache': 'STALE' },
      })
    }

    return NextResponse.json({ error: 'Error al obtener efemérides' }, { status: 500 })
  }
}
