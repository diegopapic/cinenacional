// src/app/api/movies/home-feed/route.ts - VERSIÓN OPTIMIZADA CON CACHÉ

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cachear el resultado en memoria por 5 minutos
let cachedData: any = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  try {
    // Verificar si tenemos caché válido
    const now = Date.now();
    if (cachedData && (now - cacheTime) < CACHE_DURATION) {
      console.log('✅ Sirviendo desde caché en memoria');
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      });
    }

    console.log('🔄 Generando nuevo caché');
    
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
      })
    };

    // Actualizar caché
    cachedData = formattedData;
    cacheTime = now;

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching home feed:', error);
    
    // Si hay error, servir caché viejo si existe
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE'
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Error al cargar los datos de la home' },
      { status: 500 }
    );
  }
}