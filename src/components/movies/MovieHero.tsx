'use client';

import { useState } from 'react';
import { POSTER_PLACEHOLDER, BACKGROUND_PLACEHOLDER } from '@/lib/movies/movieConstants';

interface MovieHeroProps {
  title: string;
  year: number | null;
  duration: number;
  genres: string[];
  posterUrl?: string | null;
  premiereVenues: string;
  releaseDate?: {
    day: number | null;
    month: number | null;
    year: number | null;
  } | null;
}

export function MovieHero({ title, year, duration, genres, posterUrl, premiereVenues, releaseDate }: MovieHeroProps) {
  const [imageError, setImageError] = useState(false);

  // Determinar si tenemos un poster válido
  const hasValidPoster = posterUrl && posterUrl.trim() !== '' && !imageError;

  // Usar poster o placeholder
  const backgroundImage = BACKGROUND_PLACEHOLDER.url;

  // Formatear fecha de estreno
  const formatReleaseDate = () => {
    if (!releaseDate || !releaseDate.day || !releaseDate.month || !releaseDate.year) {
      return null;
    }

    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    return `${releaseDate.day} de ${months[releaseDate.month - 1]} de ${releaseDate.year}`;
  };

  const formattedReleaseDate = formatReleaseDate();

  return (
    <div className="relative h-[50vh] overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: hasValidPoster ? 'brightness(0.7)' : 'brightness(0.3)'
        }}
      />

      {/* Detectar errores solo si hay posterUrl válido */}
      {posterUrl && posterUrl.trim() !== '' && (
        <img
          src={posterUrl}
          alt=""
          className="hidden"
          onError={() => setImageError(true)}
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-cine-dark" />

      {/* Content */}
      <div className="relative h-full flex items-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {title}
          </h1>

          {formattedReleaseDate && (
            <p className="text-gray-100 mb-3 font-light">
              Estreno comercial en Argentina:
              <span className="font-medium ml-2">{formattedReleaseDate}</span>
              {premiereVenues && <span className="font-medium"> en {premiereVenues}</span>}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-gray-300">
            {duration > 0 && (
              <>
                <span>{duration} min</span>
              </>
            )}
            {genres.length > 0 && (
              <>
                <span>•</span>
                <span>{genres.join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}