// src/app/api/movies/home-feed/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Ejecutar todas las queries en paralelo para máxima eficiencia
    const [
      ultimosEstrenos,
      proximosEstrenos,
      ultimasPeliculas,
      ultimasPersonas
    ] = await Promise.all([
      
      // QUERY 1: Últimos estrenos (usa el índice nuevo)
      prisma.movie.findMany({
        where: {
          releaseYear: { not: null },
          releaseMonth: { not: null },
          releaseDay: { not: null },
          OR: [
            { releaseYear: { lt: currentYear } },
            {
              releaseYear: currentYear,
              releaseMonth: { lt: currentMonth }
            },
            {
              releaseYear: currentYear,
              releaseMonth: currentMonth,
              releaseDay: { lte: currentDay }
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
                select: { id: true, name: true }
              }
            },
            take: 2
          },
          crew: {
            where: { roleId: 2 }, // Director - usa el índice movie_id_role_id
            select: {
              roleId: true,
              person: {
                select: { id: true, firstName: true, lastName: true }
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
        take: 6 // Solo 6, no 200!
      }),

      // QUERY 2: Próximos estrenos
      prisma.movie.findMany({
        where: {
          releaseYear: { not: null },
          OR: [
            { releaseYear: { gt: currentYear } },
            {
              releaseYear: currentYear,
              releaseMonth: { gt: currentMonth }
            },
            {
              releaseYear: currentYear,
              releaseMonth: currentMonth,
              releaseDay: { gt: currentDay }
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
                select: { id: true, name: true }
              }
            },
            take: 2
          },
          crew: {
            where: { roleId: 2 },
            select: {
              roleId: true,
              person: {
                select: { id: true, firstName: true, lastName: true }
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

      // QUERY 3: Últimas películas (usa índice created_at)
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

      // QUERY 4: Últimas personas (usa índice created_at)
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

    // Procesar personas
    const ultimasPersonasConRol = ultimasPersonas.map(person => {
      const { _count, ...personData } = person;
      const role = _count.castRoles > _count.crewRoles 
        ? 'Actor/Actriz' 
        : _count.crewRoles > 0 
          ? 'Equipo técnico'
          : 'Profesional del cine';
      
      return { ...personData, role };
    });

    console.log('📊 Resultados optimizados:', {
      ultimosEstrenos: ultimosEstrenos.length,
      proximosEstrenos: proximosEstrenos.length,
      ultimasPeliculas: ultimasPeliculas.length,
      ultimasPersonas: ultimasPersonasConRol.length
    });

    return NextResponse.json({
      ultimosEstrenos,
      proximosEstrenos,
      ultimasPeliculas,
      ultimasPersonas: ultimasPersonasConRol
    });

  } catch (error) {
    console.error('❌ Error fetching home feed:', error);
    return NextResponse.json(
      { error: 'Error al cargar los datos de la home' },
      { status: 500 }
    );
  }
}