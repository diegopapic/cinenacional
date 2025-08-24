// src/app/api/movies/home-feed/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    console.log('📅 Fecha actual para filtrado:', { 
      year: currentYear, 
      month: currentMonth, 
      day: currentDay 
    });

    // OPTIMIZACIÓN 1: Query específica para últimos estrenos (solo 6, no 200)
    const ultimosEstrenos = await prisma.movie.findMany({
      where: {
        // Solo películas con fecha completa
        releaseYear: { not: null },
        releaseMonth: { not: null },
        releaseDay: { not: null },
        // Fecha en el pasado o hoy
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
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            isPrimary: 'desc'
          },
          take: 2 // Solo los 2 géneros principales
        },
        crew: {
          where: {
            roleId: 2 // Director
          },
          select: {
            roleId: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          take: 1 // Solo el primer director
        }
      },
      orderBy: [
        { releaseYear: 'desc' },
        { releaseMonth: 'desc' },
        { releaseDay: 'desc' }
      ],
      take: 6 // Solo 6, no 200
    });

    // OPTIMIZACIÓN 2: Query específica para próximos estrenos
    const proximosEstrenos = await prisma.movie.findMany({
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
          },
          {
            // Películas con solo año futuro (sin mes ni día)
            releaseYear: { gt: currentYear },
            releaseMonth: null,
            releaseDay: null
          },
          {
            // Películas del año actual con solo mes futuro
            releaseYear: currentYear,
            releaseMonth: { gt: currentMonth },
            releaseDay: null
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
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            isPrimary: 'desc'
          },
          take: 2
        },
        crew: {
          where: {
            roleId: 2
          },
          select: {
            roleId: true,
            person: {
              select: {
                id: true,
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
    });

    // OPTIMIZACIÓN 3: Queries paralelas con Promise.all
    const [ultimasPeliculas, ultimasPersonas] = await Promise.all([
      // Últimas películas (solo campos mínimos)
      prisma.movie.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          posterUrl: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 8
      }),
      
      // Últimas personas (con count optimizado)
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
        orderBy: {
          createdAt: 'desc'
        },
        take: 6
      })
    ]);

    // Procesar personas (mínimo procesamiento en memoria)
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