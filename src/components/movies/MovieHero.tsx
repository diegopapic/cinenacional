'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  rating?: {
    id: number;
    name: string;
    abbreviation?: string | null;
  } | null;
}

export function MovieHero({ title, year, duration, genres, posterUrl, premiereVenues, releaseDate, rating }: MovieHeroProps) {
  const [imageError, setImageError] = useState(false);

  // Determinar si tenemos un poster válido
  const hasValidPoster = posterUrl && posterUrl.trim() !== '' && !imageError;

  // Usar poster o placeholder
  const backgroundImage = BACKGROUND_PLACEHOLDER.url;

  // Nombres de meses para formatear
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Verificar si tenemos fecha completa para mostrar
  const hasCompleteReleaseDate = releaseDate?.day && releaseDate?.month && releaseDate?.year;

  // Formatear día y mes (para el link)
  const formatDayMonth = () => {
    if (!releaseDate?.day || !releaseDate?.month) return null;
    return `${releaseDate.day} de ${months[releaseDate.month - 1]}`;
  };

  // Generar URL de efemérides (formato: /efemerides/MM-DD)
  const getEfemeridesUrl = () => {
    if (!releaseDate?.day || !releaseDate?.month) return null;
    const monthStr = String(releaseDate.month).padStart(2, '0');
    const dayStr = String(releaseDate.day).padStart(2, '0');
    return `/efemerides/${monthStr}-${dayStr}`;
  };

  // Generar URL de listado de estrenos por año (formato: /listados/estrenos?period=2020s&year=2025)
  const getEstrenosYearUrl = () => {
    if (!releaseDate?.year) return null;
    const decade = Math.floor(releaseDate.year / 10) * 10;
    return `/listados/estrenos?period=${decade}s&year=${releaseDate.year}`;
  };

  const dayMonthText = formatDayMonth();
  const efemeridesUrl = getEfemeridesUrl();
  const estrenosYearUrl = getEstrenosYearUrl();

  // Año a mostrar: producción primero, estreno como fallback
  const displayYear = year || releaseDate?.year;

  // Abreviación del rating
  const ratingAbbreviation = rating?.abbreviation || rating?.name;

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
            {title}{displayYear && ` (${displayYear})`}
          </h1>

          {hasCompleteReleaseDate && dayMonthText && efemeridesUrl && estrenosYearUrl && (
            <p className="text-gray-300 mb-3">
              Estreno comercial en Argentina:
              <Link 
                href={efemeridesUrl} 
                className="font-medium ml-2 text-gray-100 hover:text-cine-accent transition-colors"
              >
                {dayMonthText}
              </Link>
              <span> de </span>
              <Link 
                href={estrenosYearUrl} 
                className="font-medium text-gray-100 hover:text-cine-accent transition-colors"
              >
                {releaseDate?.year}
              </Link>
              {premiereVenues && <span className="font-medium text-gray-100"> en {premiereVenues}</span>}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-gray-300">
            {duration > 0 && (
              <span>{duration} min</span>
            )}
            {genres.length > 0 && (
              <>
                <span>•</span>
                <span>{genres.join(', ')}</span>
              </>
            )}
            {ratingAbbreviation && (
              <>
                <span>•</span>
                <span title={rating?.name} className="cursor-default">{ratingAbbreviation}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}