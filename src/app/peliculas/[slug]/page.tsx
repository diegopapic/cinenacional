// src/app/peliculas/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { MoviePageClient } from './MoviePageClient';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    slug: string;
  };
}

// Función para obtener los datos de la película directamente desde la base de datos
async function getMovieData(slug: string) {
  try {
    const movie = await prisma.movie.findFirst({
      where: { 
        slug: slug 
      },
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          },
          orderBy: [
            { isPrincipal: 'desc' },
            { billingOrder: 'asc' }
          ]
        },
        crew: {
          include: {
            person: true
          },
          orderBy: {
            billingOrder: 'asc'
          }
        },
        movieCountries: {
          include: {
            country: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        rating: true,
        colorType: true,
        productionCompanies: {
          include: {
            company: true
          }
        },
        distributionCompanies: {
          include: {
            company: true
          }
        },
        images: true,
        videos: true,
        alternativeTitles: true,
        links: true
      }
    });

    return movie;
  } catch (error) {
    console.error('Error fetching movie:', error);
    return null;
  }
}

// Metadata dinámica
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await getMovieData(params.slug);
  
  if (!movie) {
    return {
      title: 'Película no encontrada - CineNacional',
    };
  }
  
  return {
    title: `${movie.title} - cinenacional.com`,
    description: movie.synopsis || `${movie.title} (${movie.releaseYear || movie.year})`,
  };
}

// Función helper para formatear el nombre completo de una persona
function formatPersonName(person: any): string {
  const parts = [];
  if (person.firstName) parts.push(person.firstName);
  if (person.lastName) parts.push(person.lastName);
  return parts.join(' ') || person.realName || 'Sin nombre';
}

export default async function MoviePage({ params }: PageProps) {
  const movie = await getMovieData(params.slug);
  
  if (!movie) {
    notFound();
  }

  // Formatear duración total en minutos
  const totalDuration = movie.duration || 0;
  
  // Procesar géneros con estructura correcta
  const genres = movie.genres?.map((g: any) => ({
    id: g.genre.id,
    name: g.genre.name
  })).filter(Boolean) || [];
  
  // Procesar temas con estructura correcta
  const themes = movie.themes?.map((t: any) => ({
    id: t.theme.id,
    name: t.theme.name
  })).filter(Boolean) || [];
  
  // Procesar países coproductores (excluyendo Argentina si es el único)
  const countries = movie.movieCountries?.map((c: any) => ({
    id: c.country.id,
    name: c.country.name
  }))
  .filter((c: any) => c.name !== 'Argentina' || movie.movieCountries.length > 1) || [];

  const rating = movie.rating ? {
    id: movie.rating.id,
    name: movie.rating.name,
    description: movie.rating.description || undefined
  } : null;
  
  const colorType = movie.colorType ? {
    id: movie.colorType.id,
    name: movie.colorType.name
  } : null;

  // Formatear año - usar releaseYear si existe, sino year
  const displayYear = movie.releaseYear || movie.year;

  // PROCESAR CAST - LÓGICA CORREGIDA CON DEBUG
  // Formatear todo el cast con estructura correcta
  const allCast = movie.cast?.map((c: any) => ({
    name: formatPersonName(c.person),
    character: c.characterName || 'Sin especificar',
    isPrincipal: c.isPrincipal || false,
    billingOrder: c.billingOrder || 999,
    personId: c.person.id,
    image: c.person.photoUrl || undefined
  })) || [];

  console.log('📽️ Película:', movie.title);
  console.log('👥 Total de actores:', allCast.length);
  console.log('🌟 Actores con isPrincipal:', allCast.filter((c: any) => c.isPrincipal).length);
  
  // Separar cast principal del cast completo
  let mainCast: any[] = [];
  let fullCast: any[] = [];
  
  // Primero buscar los que tienen isPrincipal = true
  const principalActors = allCast.filter((c: any) => c.isPrincipal === true);
  
  console.log('✨ Actores principales encontrados:', principalActors.length);
  
  if (principalActors.length > 0) {
    // Si hay actores marcados como principales, usarlos
    mainCast = principalActors;
    // El resto va a fullCast
    fullCast = allCast.filter((c: any) => !c.isPrincipal);
    console.log('Usando actores con isPrincipal=true');
  } else if (allCast.length > 0) {
    // Si no hay ninguno marcado como principal, tomar EXACTAMENTE los primeros 3
    mainCast = allCast.slice(0, Math.min(3, allCast.length));
    // El resto (desde el 4to en adelante) va a fullCast
    if (allCast.length > 3) {
      fullCast = allCast.slice(3);
    }
    console.log('No hay principales marcados. Tomando los primeros 3');
  }

  console.log('📊 Reparto principal:', mainCast.length, 'actores');
  console.log('📊 Reparto completo adicional:', fullCast.length, 'actores');
  console.log('Actores principales:', mainCast.map(a => a.name));
  console.log('Actores en fullCast:', fullCast.map(a => a.name));

  // Pasar los datos procesados al componente cliente
  return (
    <MoviePageClient
      movie={movie}
      displayYear={displayYear}
      totalDuration={totalDuration}
      durationSeconds={movie.durationSeconds}
      genres={genres}
      themes={themes}
      countries={countries}
      rating={rating}
      colorType={colorType}
      soundType={movie.soundType}
      mainCast={mainCast}
      fullCast={fullCast}
    />
  );
}