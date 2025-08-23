import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularAniosDesde, formatearEfemeride, EfemerideData } from '@/lib/utils/efemerides';
import { Efemeride } from '@/types/home.types';

export async function GET(request: NextRequest) {
  try {
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.getMonth() + 1;
    
    console.log(`🔍 Buscando efemérides para día: ${dia}, mes: ${mes}`);
    
    // Obtener películas con fechas de estreno para hoy
    const peliculasEstreno = await prisma.movie.findMany({
      where: {
        releaseDay: dia,
        releaseMonth: mes,
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
        crew: {
          where: {
            roleId: 2 // Solo buscar por roleId de Director
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          },
          take: 1
        }
      }
    });
    
    console.log(`📽️ Películas con estreno hoy: ${peliculasEstreno.length}`);
    
    // Obtener películas con inicio de rodaje para hoy
    const peliculasInicioRodaje = await prisma.movie.findMany({
      where: {
        filmingStartDay: dia,
        filmingStartMonth: mes,
        filmingStartYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        filmingStartYear: true,
        filmingStartMonth: true,
        filmingStartDay: true,
        posterUrl: true,
        crew: {
          where: {
            roleId: 2
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          },
          take: 1
        }
      }
    });
    
    console.log(`🎬 Películas con inicio de rodaje hoy: ${peliculasInicioRodaje.length}`);
    
    // Obtener películas con fin de rodaje para hoy
    const peliculasFinRodaje = await prisma.movie.findMany({
      where: {
        filmingEndDay: dia,
        filmingEndMonth: mes,
        filmingEndYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        filmingEndYear: true,
        filmingEndMonth: true,
        filmingEndDay: true,
        posterUrl: true,
        crew: {
          where: {
            roleId: 2
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          },
          take: 1
        }
      }
    });
    
    console.log(`🎬 Películas con fin de rodaje hoy: ${peliculasFinRodaje.length}`);
    
    // Obtener personas nacidas hoy
    const personasNacimiento = await prisma.person.findMany({
      where: {
        birthDay: dia,
        birthMonth: mes,
        birthYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        birthYear: true,
        birthMonth: true,
        birthDay: true,
        photoUrl: true
      }
    });
    
    console.log(`👶 Personas nacidas hoy: ${personasNacimiento.length}`);
    
    // Obtener personas fallecidas hoy
    const personasMuerte = await prisma.person.findMany({
      where: {
        deathDay: dia,
        deathMonth: mes,
        deathYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        deathYear: true,
        deathMonth: true,
        deathDay: true,
        photoUrl: true
      }
    });
    
    console.log(`💀 Personas fallecidas hoy: ${personasMuerte.length}`);
    
    // Si no hay efemérides para hoy, buscar algunas de ejemplo para testing
    let totalEfemerides = peliculasEstreno.length + peliculasInicioRodaje.length + 
                          peliculasFinRodaje.length + personasNacimiento.length + 
                          personasMuerte.length;
    
    if (totalEfemerides === 0) {
      console.log('⚠️ No hay efemérides para hoy, buscando algunas de ejemplo...');
      
      // Buscar cualquier película con fecha de estreno completa
      const peliculasEjemplo = await prisma.movie.findMany({
        where: {
          releaseDay: { not: null },
          releaseMonth: { not: null },
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
          crew: {
            where: {
              roleId: 2
            },
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
        take: 5
      });
      
      console.log(`📽️ Películas de ejemplo encontradas: ${peliculasEjemplo.length}`);
      
      // Usar las primeras 2 como ejemplo, cambiando el día y mes al de hoy
      const efemeridesEjemplo = peliculasEjemplo.slice(0, 2).map(pelicula => {
        const director = pelicula.crew[0]?.person;
        const directorName = director 
          ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
          : null;
        
        // Calcular años desde el estreno real
        const añosDesde = hoy.getFullYear() - pelicula.releaseYear!;
        
        return {
          id: `ejemplo-${pelicula.id}`,
          tipo: 'pelicula' as const,
          hace: `Hace ${añosDesde} ${añosDesde === 1 ? 'año' : 'años'}`,
          evento: `se estrenaba "${pelicula.title}"${directorName ? `, de ${directorName}` : ''}`,
          fecha: new Date(pelicula.releaseYear!, pelicula.releaseMonth! - 1, pelicula.releaseDay!),
          slug: pelicula.slug,
          posterUrl: pelicula.posterUrl || undefined
        };
      });
      
      return NextResponse.json({ efemerides: efemeridesEjemplo });
    }
    
    // Formatear todas las efemérides
    const efemerides: (Efemeride | null)[] = [];
    
    // Procesar estrenos
    peliculasEstreno.forEach(pelicula => {
      const director = pelicula.crew[0]?.person;
      const directorName = director 
        ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
        : null;
      const directorSlug = director?.slug;
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'estreno',
        año: pelicula.releaseYear!,
        mes: pelicula.releaseMonth!,
        dia: pelicula.releaseDay!,
        fecha: new Date(pelicula.releaseYear!, pelicula.releaseMonth! - 1, pelicula.releaseDay!),
        titulo: pelicula.title,
        director: directorName || undefined,
        directorSlug: directorSlug || undefined,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar inicio de rodajes
    peliculasInicioRodaje.forEach(pelicula => {
      const director = pelicula.crew[0]?.person;
      const directorName = director 
        ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
        : null;
      const directorSlug = director?.slug;
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'inicio_rodaje',
        año: pelicula.filmingStartYear!,
        mes: pelicula.filmingStartMonth!,
        dia: pelicula.filmingStartDay!,
        fecha: new Date(pelicula.filmingStartYear!, pelicula.filmingStartMonth! - 1, pelicula.filmingStartDay!),
        titulo: pelicula.title,
        director: directorName || undefined,
        directorSlug: directorSlug || undefined, 
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar fin de rodajes
    peliculasFinRodaje.forEach(pelicula => {
      const director = pelicula.crew[0]?.person;
      const directorName = director 
        ? `${director.firstName || ''} ${director.lastName || ''}`.trim()
        : null;
      const directorSlug = director?.slug;
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'fin_rodaje',
        año: pelicula.filmingEndYear!,
        mes: pelicula.filmingEndMonth!,
        dia: pelicula.filmingEndDay!,
        fecha: new Date(pelicula.filmingEndYear!, pelicula.filmingEndMonth! - 1, pelicula.filmingEndDay!),
        titulo: pelicula.title,
        director: directorName || undefined,
        directorSlug: directorSlug || undefined,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar nacimientos
    personasNacimiento.forEach(persona => {
      const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim();
      
      const efemeride = formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'nacimiento',
        año: persona.birthYear!,
        mes: persona.birthMonth!,
        dia: persona.birthDay!,
        fecha: new Date(persona.birthYear!, persona.birthMonth! - 1, persona.birthDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar muertes
    personasMuerte.forEach(persona => {
      const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim();
      
      const efemeride = formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'muerte',
        año: persona.deathYear!,
        mes: persona.deathMonth!,
        dia: persona.deathDay!,
        fecha: new Date(persona.deathYear!, persona.deathMonth! - 1, persona.deathDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Filtrar nulls y ordenar por años (más recientes primero)
    const efemeridesValidas = efemerides
      .filter((e): e is Efemeride => e !== null)
      .sort((a, b) => {
        const añosA = parseInt(a.hace.match(/\d+/)?.[0] || '0');
        const añosB = parseInt(b.hace.match(/\d+/)?.[0] || '0');
        return añosA - añosB; // Menos años primero (más reciente)
      })
      .slice(0, 2); // LIMITAR A 2 EFEMÉRIDES
    
    console.log(`✅ Efemérides válidas encontradas: ${efemeridesValidas.length}`);
    
    return NextResponse.json({ efemerides: efemeridesValidas });
    
  } catch (error) {
    console.error('❌ Error fetching efemerides:', error);
    return NextResponse.json(
      { error: 'Error al obtener efemérides' },
      { status: 500 }
    );
  }
}