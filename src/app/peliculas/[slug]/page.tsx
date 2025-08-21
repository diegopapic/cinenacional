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

export default async function MoviePage({ params }: PageProps) {
  const movie = await getMovieData(params.slug);
  
  if (!movie) {
    notFound();
  }

  // Formatear duración total en minutos (sin procesar segundos aquí, lo haremos en el componente)
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
  
  // Formatear año - usar releaseYear si existe, sino year
  const displayYear = movie.releaseYear || movie.year;

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
      rating={movie.rating}
      colorType={movie.colorType}
      soundType={movie.soundType}
    />
  );
}