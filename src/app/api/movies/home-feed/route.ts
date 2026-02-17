// src/app/api/movies/home-feed/route.ts - VERSIÓN CORREGIDA

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';

// Mantener caché en memoria como fallback si Redis falla
let memoryCachedData: any = null;
let memoryCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  const cacheKey = 'home-feed:movies:v2'; // ⚠️ IMPORTANTE: Cambié la versión del cache key para invalidar el caché anterior

  try {
    // 1. Intentar obtener de Redis primero
    const redisCached = await RedisClient.get(cacheKey);

    if (redisCached) {
      console.log('✅ Cache HIT desde Redis');
      return NextResponse.json(
        JSON.parse(redisCached),
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Cache': 'HIT',
            'X-Cache-Source': 'redis'
          }
        }
      );
    }

    // 2. Si Redis falla o no hay caché, verificar caché en memoria como fallback
    const now = Date.now();
    if (memoryCachedData && (now - memoryCacheTime) < CACHE_DURATION) {
      console.log('✅ Cache HIT desde memoria (Redis fallback)');

      // Intentar guardar en Redis para próximas requests
      await RedisClient.set(
        cacheKey,
        JSON.stringify(memoryCachedData),
        300 // 5 minutos
      );

      return NextResponse.json(memoryCachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory'
        }
      });
    }

    // 3. Si no hay caché en ningún lado, generar nuevo
    console.log('🔄 Cache MISS - Generando datos desde la base de datos');

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // OPTIMIZACIÓN: Queries paralelas y específicas
    const [ultimosEstrenos, proximosEstrenos, ultimasPeliculas, ultimasPersonas] = await Promise.all([
      // Últimos estrenos - solo películas con fecha completa Y que ya se estrenaron
      prisma.movie.findMany({
        where: {
          AND: [
            { releaseYear: { not: null } },
            { releaseMonth: { not: null } },
            { releaseDay: { not: null } },
            {
              OR: [
                // Años anteriores
                { releaseYear: { lt: currentYear } },
                // Este año pero meses anteriores
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: { lt: currentMonth } }
                  ]
                },
                // Este año, este mes, pero días anteriores o el día de hoy
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: currentMonth },
                    { releaseDay: { lte: currentDay } }  // ✅ FIX: Verificar también el día
                  ]
                }
              ]
            }
          ]
        },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseYear: true,
          releaseMonth: true,
          releaseDay: true,
          posterUrl: true,
          genres: {
            select: {
              genre: {
                select: { name: true }
              }
            },
            take: 3
          },
          crew: {
            where: { roleId: 2 }, // Solo Director
            select: {
              roleId: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 3 // Tomar hasta 3 directores si hay co-directores
          }
        },
        orderBy: [
          { releaseYear: 'desc' },
          { releaseMonth: 'desc' },
          { releaseDay: 'desc' }
        ],
        take: 6
      }),

      // Próximos estrenos - películas con fechas futuras
      prisma.movie.findMany({
        where: {
          AND: [
            { releaseYear: { not: null } },
            {
              OR: [
                // Años futuros
                { releaseYear: { gt: currentYear } },
                // Este año pero meses futuros
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: { gt: currentMonth } }
                  ]
                },
                // Este año, este mes, pero días futuros (no incluir hoy)
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: currentMonth },
                    { releaseDay: { gt: currentDay } }  // ✅ FIX: Solo días futuros, no el día de hoy
                  ]
                }
              ]
            }
          ]
        },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseYear: true,
          releaseMonth: true,
          releaseDay: true,
          posterUrl: true,
          genres: {
            select: {
              genre: {
                select: { name: true }
              }
            },
            take: 3
          },
          crew: {
            where: { roleId: 2 },
            select: {
              roleId: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 3 // Tomar hasta 3 directores si hay co-directores
          }
        },
        orderBy: [
          { releaseYear: 'asc' },
          { releaseMonth: 'asc' },
          { releaseDay: 'asc' }
        ],
        take: 6
      }),

      // Últimas películas - solo campos esenciales
      prisma.movie.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          posterUrl: true
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),

      // Últimas personas - con género y roles de última película
      // Últimas personas - con género y roles de última película
      prisma.person.findMany({
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          gender: true,
          _count: {
            select: {
              castRoles: true,
              crewRoles: true
            }
          },
          // Obtener los últimos roles de crew para determinar el rol específico
          crewRoles: {
            select: {
              role: {
                select: { name: true }
              },
              movie: {
                select: {
                  id: true,
                  createdAt: true
                }
              }
            },
            orderBy: {
              movie: { createdAt: 'desc' }
            },
            take: 10
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Formatear los datos de manera eficiente
    // IMPORTANTE: NO eliminar el campo crew, el componente MovieCard lo necesita
    const formattedData = {
      ultimosEstrenos: ultimosEstrenos.map(movie => ({
        ...movie,
        // Mantener crew para que MovieCard pueda procesarlo
        // NO agregar: crew: undefined
        genres: movie.genres.map(g => ({ name: g.genre.name }))
      })),

      proximosEstrenos: proximosEstrenos.map(movie => ({
        ...movie,
        // Mantener crew para que MovieCard pueda procesarlo
        genres: movie.genres.map(g => ({ name: g.genre.name }))
      })),

      ultimasPeliculas,

      ultimasPersonas: ultimasPersonas.map(person => {
        const { _count, crewRoles, ...personData } = person;

        let role: string;

        if (_count.castRoles > _count.crewRoles) {
          // Es mayormente actor/actriz - usar género
          if (person.gender === 'MALE') {
            role = 'Actor';
          } else if (person.gender === 'FEMALE') {
            role = 'Actriz';
          } else {
            role = 'Actor/Actriz';
          }
        } else if (_count.crewRoles > 0 && crewRoles && crewRoles.length > 0) {
          // Es mayormente crew - obtener roles de la última película
          const lastMovieId = crewRoles[0]?.movie?.id;

          if (lastMovieId) {
            // Obtener todos los roles de esa película
            const rolesInLastMovie = crewRoles
              .filter(cr => cr.movie?.id === lastMovieId)
              .map(cr => cr.role?.name)
              .filter((r): r is string => !!r);

            // Eliminar duplicados y unir con coma
            const uniqueRoles = [...new Set(rolesInLastMovie)];
            role = uniqueRoles.length > 0 ? uniqueRoles.join(', ') : 'Equipo técnico';
          } else {
            role = 'Equipo técnico';
          }
        } else {
          role = 'Profesional del cine';
        }

        return {
          ...personData,
          role
        };
      }),

      // Agregar timestamp para debugging
      generatedAt: new Date().toISOString()
    };

    // 4. Guardar en ambos cachés
    // Redis con TTL de 5 minutos
    const redisSaved = await RedisClient.set(
      cacheKey,
      JSON.stringify(formattedData),
      300 // 5 minutos en segundos
    );

    if (redisSaved) {
      console.log('✅ Datos guardados en Redis');
    } else {
      console.log('⚠️ No se pudo guardar en Redis, usando solo caché en memoria');
    }

    // Actualizar caché en memoria como fallback
    memoryCachedData = formattedData;
    memoryCacheTime = now;

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching home feed:', error);

    // Si hay error, intentar servir desde caché en memoria
    if (memoryCachedData) {
      console.log('⚠️ Sirviendo caché viejo desde memoria debido a error');
      return NextResponse.json(memoryCachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }

    // Si no hay ningún caché disponible, error 500
    return NextResponse.json(
      { error: 'Error al cargar los datos de la home' },
      { status: 500 }
    );
  }
}

// Endpoint para invalidar caché manualmente (útil para testing)
export async function DELETE() {
  try {
    // Invalidar ambas versiones del caché por si acaso
    const deleted1 = await RedisClient.del('home-feed:movies:v1');
    const deleted2 = await RedisClient.del('home-feed:movies:v2');
    memoryCachedData = null;
    memoryCacheTime = 0;

    return NextResponse.json({
      success: true,
      message: 'Caché invalidado exitosamente',
      redisDeleted: { v1: deleted1, v2: deleted2 }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al invalidar caché' },
      { status: 500 }
    );
  }
}