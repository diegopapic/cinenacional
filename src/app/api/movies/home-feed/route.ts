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

    // Obtener todas las películas con fechas para procesarlas
    const allMoviesWithDates = await prisma.movie.findMany({
      where: {
        releaseYear: { not: null }
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
          include: {
            genre: true
          },
          take: 3
        },
        crew: {
          where: {
            roleId: 2 // Solo buscar Director (roleId = 2)
          },
          include: {
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
      orderBy: {
        createdAt: 'desc'
      },
      take: 200
    });

    // Función helper para comparar fechas parciales
    const isDateInPast = (movie: any): boolean => {
      const year = movie.releaseYear;
      const month = movie.releaseMonth || 12;
      const day = movie.releaseDay || 31;

      if (year < currentYear) return true;
      if (year > currentYear) return false;
      
      if (month < currentMonth) return true;
      if (month > currentMonth) return false;
      
      return day <= currentDay;
    };

    const isDateInFuture = (movie: any): boolean => {
      const year = movie.releaseYear;
      const month = movie.releaseMonth || 1;
      const day = movie.releaseDay || 1;

      if (year > currentYear) return true;
      if (year < currentYear) return false;
      
      if (month > currentMonth) return true;
      if (month < currentMonth) return false;
      
      return day > currentDay;
    };

    // Función para calcular fecha efectiva para ordenamiento
    const getEffectiveDate = (movie: any): Date => {
      const year = movie.releaseYear;
      const month = movie.releaseMonth || 1;
      const day = movie.releaseDay || 1;
      return new Date(year, month - 1, day);
    };

    // Filtrar últimos estrenos (películas con fecha completa en el pasado)
    const ultimosEstrenosCompletos = allMoviesWithDates.filter(movie => {
      // Solo películas con fecha completa (día, mes y año)
      const hasCompleteDate = movie.releaseYear && movie.releaseMonth && movie.releaseDay;
      if (!hasCompleteDate) return false;
      
      // Verificar que la fecha esté en el pasado
      return isDateInPast(movie);
    });

    // Ordenar por fecha de estreno descendente (más recientes primero)
    const ultimosEstrenos = ultimosEstrenosCompletos
      .sort((a, b) => {
        const dateA = getEffectiveDate(a);
        const dateB = getEffectiveDate(b);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6);

    // Filtrar próximos estrenos (películas con fecha futura)
    const proximosEstrenosFiltrados = allMoviesWithDates.filter(movie => {
      // Debe tener al menos el año
      if (!movie.releaseYear) return false;
      
      // Verificar que la fecha esté en el futuro
      return isDateInFuture(movie);
    });

    // Ordenar por fecha de estreno ascendente (próximos primero)
    const proximosEstrenos = proximosEstrenosFiltrados
      .sort((a, b) => {
        const dateA = getEffectiveDate(a);
        const dateB = getEffectiveDate(b);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 6);

    // Obtener últimas películas ingresadas
    const ultimasPeliculas = await prisma.movie.findMany({
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
    });

    // Obtener últimas personas ingresadas
    const ultimasPersonas = await prisma.person.findMany({
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
    });

    // Agregar rol principal basado en el conteo
    const ultimasPersonasConRol = ultimasPersonas.map(person => {
      const castCount = person._count.castRoles;
      const crewCount = person._count.crewRoles;
      let role = 'Profesional del cine';
      
      if (castCount > crewCount && castCount > 0) {
        role = 'Actor/Actriz';
      } else if (crewCount > 0) {
        role = 'Equipo técnico';
      }
      
      const { _count, ...personData } = person;
      return { ...personData, role };
    });

    console.log('📊 Resultados del home-feed:', {
      ultimosEstrenos: ultimosEstrenos.length,
      proximosEstrenos: proximosEstrenos.length,
      ultimasPeliculas: ultimasPeliculas.length,
      ultimasPersonas: ultimasPersonasConRol.length
    });

    // Log de debug
    if (ultimosEstrenos.length > 0) {
      console.log('🎬 Últimos estrenos (muestra):', ultimosEstrenos.slice(0, 3).map(m => ({
        title: m.title,
        date: `${m.releaseDay}/${m.releaseMonth}/${m.releaseYear}`
      })));
    }

    if (proximosEstrenos.length > 0) {
      console.log('🎬 Próximos estrenos (muestra):', proximosEstrenos.slice(0, 3).map(m => ({
        title: m.title,
        date: `${m.releaseDay || '??'}/${m.releaseMonth || '??'}/${m.releaseYear}`
      })));
    }

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