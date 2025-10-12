// src/app/api/people/[id]/filmography/route.ts - ACTUALIZADO
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms
const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const personId = parseInt(params.id);
    
    // Generar clave de caché única - VERSIÓN v2 para invalidar cache anterior
    const cacheKey = `person:filmography:${personId}:v2`;

    // 1. Intentar obtener de Redis
    try {
      const redisCached = await RedisClient.get(cacheKey);

      if (redisCached) {
        console.log(`✅ Cache HIT desde Redis para filmografía de persona: ${personId}`);
        return NextResponse.json(
          JSON.parse(redisCached),
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
              'X-Cache': 'HIT',
              'X-Cache-Source': 'redis',
              'X-Person-Id': params.id
            }
          }
        );
      }
    } catch (redisError) {
      console.error('Redis error (non-fatal):', redisError);
    }

    // 2. Verificar caché en memoria como fallback
    const now = Date.now();
    const memoryCached = memoryCache.get(cacheKey);

    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      console.log(`✅ Cache HIT desde memoria para filmografía de persona: ${personId}`);

      // Intentar guardar en Redis para próximas requests
      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_CACHE_TTL)
        .catch(err => console.error('Error guardando en Redis:', err));

      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory',
          'X-Person-Id': params.id
        }
      });
    }

    // 3. No hay caché, consultar base de datos
    console.log(`🔄 Cache MISS - Consultando BD para filmografía de persona: ${personId}`);

    // Obtener roles como actor/actriz
    const castRoles = await prisma.movieCast.findMany({
      where: {
        personId: personId
      },
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            releaseMonth: true,
            releaseDay: true,
            posterUrl: true,
            stage: true,
            tipoDuracion: true // ✅ AGREGADO
          }
        }
      },
      orderBy: [
        { movie: { releaseYear: 'desc' } },
        { movie: { year: 'desc' } }
      ]
    });

    // Obtener roles en el equipo técnico
    const crewRoles = await prisma.movieCrew.findMany({
      where: {
        personId: personId
      },
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            releaseMonth: true,
            releaseDay: true,
            posterUrl: true,
            stage: true,
            tipoDuracion: true // ✅ AGREGADO
          }
        },
        role: true // Incluir la referencia al rol si existe
      },
      orderBy: [
        { movie: { releaseYear: 'desc' } },
        { movie: { year: 'desc' } }
      ]
    });

    const filmography = {
      castRoles,
      crewRoles,
      totalMovies: [...new Set([
        ...castRoles.map(r => r.movie.id),
        ...crewRoles.map(r => r.movie.id)
      ])].length
    };

    // 4. Guardar en ambos cachés
    // Redis con TTL de 1 hora
    RedisClient.set(cacheKey, JSON.stringify(filmography), REDIS_CACHE_TTL)
      .then(saved => {
        if (saved) {
          console.log(`✅ Filmografía de persona ${personId} guardada en Redis`);
        }
      })
      .catch(err => console.error('Error guardando en Redis:', err));

    // Memoria como fallback
    memoryCache.set(cacheKey, {
      data: filmography,
      timestamp: now
    });

    // Limpiar caché de memoria viejo (mantener máximo 50 filmografías)
    if (memoryCache.size > 50) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    return NextResponse.json(filmography, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
        'X-Person-Id': params.id
      }
    });
  } catch (error) {
    console.error('Error fetching person filmography:', error);

    // Intentar servir desde caché stale si hay error
    const cacheKey = `person:filmography:${parseInt(params.id)}:v2`;
    const staleCache = memoryCache.get(cacheKey);

    if (staleCache) {
      console.log('⚠️ Sirviendo caché stale de filmografía debido a error');
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch filmography' },
      { status: 500 }
    );
  }
}