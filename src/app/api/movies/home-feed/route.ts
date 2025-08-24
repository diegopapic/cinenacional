// src/app/api/movies/home-feed/route.ts - VERSIÓN OPTIMIZADA CON REDIS

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';

// Mantener caché en memoria como fallback si Redis falla
let memoryCachedData: any = null;
let memoryCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  const cacheKey = 'home-feed:movies:v1';
  
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
      // Últimos estrenos - solo películas con fecha completa
      prisma.movie.findMany({
        where: {
          AND: [
            { releaseYear: { not: null } },
            { releaseMonth: { not: null } },
            { releaseDay: { not: null } },
            {
              OR: [
                { releaseYear: { lt: currentYear } },
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: { lte: currentMonth } }
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
              person: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 1
          }
        },
        orderBy: [
          { releaseYear: 'desc' },
          { releaseMonth: 'desc' },
          { releaseDay: 'desc' }
        ],
        take: 6
      }),

      // Próximos estrenos
      prisma.movie.findMany({
        where: {
          AND: [
            { releaseYear: { not: null } },
            {
              OR: [
                { releaseYear: { gt: currentYear } },
                {
                  AND: [
                    { releaseYear: currentYear },
                    { releaseMonth: { gt: currentMonth } }
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
              person: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 1
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
        take: 8
      }),

      // Últimas personas - simplificado
      prisma.person.findMany({
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          _count: {
            select: {
              castRoles: true,
              crewRoles: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      })
    ]);

    // Formatear los datos de manera eficiente
    const formattedData = {
      ultimosEstrenos: ultimosEstrenos.map(movie => ({
        ...movie,
        director: movie.crew[0]?.person ? 
          `${movie.crew[0].person.firstName || ''} ${movie.crew[0].person.lastName || ''}`.trim() : 
          null,
        genres: movie.genres.map(g => g.genre.name),
        crew: undefined // Eliminar el array crew del resultado
      })),
      
      proximosEstrenos: proximosEstrenos.map(movie => ({
        ...movie,
        director: movie.crew[0]?.person ? 
          `${movie.crew[0].person.firstName || ''} ${movie.crew[0].person.lastName || ''}`.trim() : 
          null,
        genres: movie.genres.map(g => g.genre.name),
        crew: undefined
      })),
      
      ultimasPeliculas,
      
      ultimasPersonas: ultimasPersonas.map(person => {
        const { _count, ...personData } = person;
        return {
          ...personData,
          role: _count.castRoles > _count.crewRoles ? 'Actor/Actriz' : 
                _count.crewRoles > 0 ? 'Equipo técnico' : 'Profesional del cine'
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
    const deleted = await RedisClient.del('home-feed:movies:v1');
    memoryCachedData = null;
    memoryCacheTime = 0;
    
    return NextResponse.json({
      success: true,
      message: 'Caché invalidado exitosamente',
      redisDeleted: deleted
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al invalidar caché' },
      { status: 500 }
    );
  }
}