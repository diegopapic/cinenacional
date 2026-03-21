// src/app/api/movies/home-feed/route.ts
// Delegates data fetching to lib/queries/home.ts.
// Keeps Redis + memory cache layer for API consumers.

import { NextResponse } from 'next/server'
import { getHomeFeed } from '@/lib/queries/home'
import RedisClient from '@/lib/redis'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:movies:home-feed')

let memoryCachedData: string | null = null
let memoryCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 min

const CACHE_KEY = 'home-feed:movies:v3'

export async function GET() {
  try {
    // 1. Redis cache
    const redisCached = await RedisClient.get(CACHE_KEY)
    if (redisCached) {
      log.debug('Cache HIT (Redis)')
      return NextResponse.json(JSON.parse(redisCached), {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'redis',
        },
      })
    }

    // 2. Memory cache fallback
    const now = Date.now()
    if (memoryCachedData && now - memoryCacheTime < CACHE_DURATION) {
      log.debug('Cache HIT (memory)')
      await RedisClient.set(CACHE_KEY, memoryCachedData, 300)
      return NextResponse.json(JSON.parse(memoryCachedData), {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory',
        },
      })
    }

    // 3. Fetch from DB via shared query function
    log.debug('Cache MISS')
    const data = await getHomeFeed()

    // Flatten genres for API backward compatibility
    const formattedData = {
      ultimosEstrenos: data.ultimosEstrenos.map(m => ({
        ...m,
        genres: m.genres.map((g: { genre: { name: string } }) => ({ name: g.genre.name })),
      })),
      proximosEstrenos: data.proximosEstrenos.map(m => ({
        ...m,
        genres: m.genres.map((g: { genre: { name: string } }) => ({ name: g.genre.name })),
      })),
      ultimasPeliculas: data.ultimasPeliculas,
      ultimasPersonas: data.ultimasPersonas,
      generatedAt: new Date().toISOString(),
    }

    const json = JSON.stringify(formattedData)

    // Save to both caches
    const redisSaved = await RedisClient.set(CACHE_KEY, json, 300)
    if (!redisSaved) log.warn('Redis save failed, using memory cache only')

    memoryCachedData = json
    memoryCacheTime = now

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
      },
    })
  } catch (error) {
    log.error('Failed to fetch home feed', error)

    if (memoryCachedData) {
      log.warn('Serving stale cache')
      return NextResponse.json(JSON.parse(memoryCachedData), {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback',
        },
      })
    }

    return NextResponse.json(
      { error: 'Error al cargar los datos de la home' },
      { status: 500 }
    )
  }
}

// DELETE: invalidate cache (used by admin after movie updates)
export async function DELETE() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    await Promise.all([
      RedisClient.del('home-feed:movies:v1'),
      RedisClient.del('home-feed:movies:v2'),
      RedisClient.del(CACHE_KEY),
    ])
    memoryCachedData = null
    memoryCacheTime = 0

    return NextResponse.json({
      success: true,
      message: 'Caché invalidado exitosamente',
    })
  } catch {
    return NextResponse.json(
      { error: 'Error al invalidar caché' },
      { status: 500 }
    )
  }
}
