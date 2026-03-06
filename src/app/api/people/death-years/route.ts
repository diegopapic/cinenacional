// src/app/api/people/death-years/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:people:death-years');

// Esta ruta debe ser dinámica
export const dynamic = 'force-dynamic';

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en ms

/**
 * GET /api/people/death-years
 * Obtiene todos los años únicos en que hay personas fallecidas
 * Retorna array ordenado descendente (más reciente primero)
 * 
 * CACHÉ: 24 horas (los años históricos no cambian)
 */
export async function GET() {
  const cacheKey = 'people:death-years:v1';
  const redisTTL = 86400; // 24 horas
  const now = Date.now();

  try {
    // 1. Intentar obtener de Redis
    try {
      const redisCached = await RedisClient.get(cacheKey);
      
      if (redisCached) {
        log.debug('Cache HIT (Redis)', { key: cacheKey });
        return NextResponse.json(
          JSON.parse(redisCached),
          {
            headers: {
              'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
              'X-Cache': 'HIT',
              'X-Cache-Source': 'redis'
            }
          }
        );
      }
    } catch (redisError) {
      log.warn('Redis error (non-fatal)', { error: String(redisError) });
    }

    // 2. Verificar caché en memoria como fallback
    const memoryCached = memoryCache.get(cacheKey);

    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      log.debug('Cache HIT (memory)', { key: cacheKey });

      // Intentar guardar en Redis para próximas requests
      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), redisTTL)
        .catch(err => log.warn('Redis save error', { error: String(err) }));
      
      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory'
        }
      });
    }
    
    // 3. No hay caché, consultar base de datos
    log.debug('Cache MISS', { key: cacheKey });
    
    // Obtener años únicos de defunción
    const result = await prisma.person.findMany({
      where: {
        deathYear: {
          not: null
        }
      },
      select: {
        deathYear: true
      },
      distinct: ['deathYear'],
      orderBy: {
        deathYear: 'desc'
      }
    });

    // Extraer solo los años y filtrar nulls
    const years = result
      .map(r => r.deathYear)
      .filter((year): year is number => year !== null);

    const response = {
      years,
      count: years.length
    };
    
    // 4. Guardar en ambos cachés
    RedisClient.set(cacheKey, JSON.stringify(response), redisTTL)
      .catch(err => log.warn('Redis save error', { error: String(err) }));
    
    memoryCache.set(cacheKey, {
      data: response,
      timestamp: now
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database'
      }
    });

  } catch (error) {
    log.error('Failed to fetch death years', error);

    // Intentar servir desde caché stale si hay error
    const staleCache = memoryCache.get(cacheKey);

    if (staleCache) {
      log.warn('Serving stale cache');
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener años de defunción' },
      { status: 500 }
    );
  }
}