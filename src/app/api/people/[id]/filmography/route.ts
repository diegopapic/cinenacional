// src/app/api/people/[id]/filmography/route.ts - ACTUALIZADO
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';

const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params;
  try {
    const personId = parseInt(paramId);

    if (isNaN(personId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

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
              'X-Person-Id': paramId
            }
          }
        );
      }
    } catch (redisError) {
      console.error('Redis error (non-fatal):', redisError);
    }

    // 2. No hay caché, consultar base de datos
    console.log(`🔄 Cache MISS - Consultando BD para filmografía de persona: ${personId}`);

    // Obtener roles como actor/actriz
    const castRoles = await prisma.movieCast.findMany({
      where: {
        personId: personId
      },
      select: {
        id: true,
        characterName: true,
        billingOrder: true,
        isPrincipal: true,
        isActor: true, // Para diferenciar actuaciones de apariciones como si mismo
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
            tipoDuracion: true
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

    // 3. Guardar en Redis
    RedisClient.set(cacheKey, JSON.stringify(filmography), REDIS_CACHE_TTL)
      .catch(err => console.error('Error guardando en Redis:', err));

    return NextResponse.json(filmography, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
        'X-Person-Id': paramId
      }
    });
  } catch (error) {
    console.error('Error fetching person filmography:', error);

    return NextResponse.json(
      { error: 'Failed to fetch filmography' },
      { status: 500 }
    );
  }
}