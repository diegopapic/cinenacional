'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BACKGROUND_PLACEHOLDER } from '@/lib/movies/movieConstants';

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
  heroBackgroundImage?: string | null;
}

export function MovieHero({ 
  title, 
  year, 
  duration, 
  genres, 
  posterUrl, 
  premiereVenues, 
  releaseDate, 
  rating,
  heroBackgroundImage 
}: MovieHeroProps) {
  const [heroImageError, setHeroImageError] = useState(false);

  // Determinar si tenemos una imagen de hero válida
  const hasValidHeroImage = heroBackgroundImage && heroBackgroundImage.trim() !== '' && !heroImageError;

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
    <div className="relative h-[50vh] min-h-[400px] overflow-hidden bg-[#0f1419]">
      {/* Contenedor de imagen con gradientes - mismo estilo que HeroSection */}
      <div className="absolute inset-0 flex items-center justify-center">
        {hasValidHeroImage ? (
          <div className="relative w-full h-full">
            {/* Imagen de fondo centrada */}
            <img
              src={heroBackgroundImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setHeroImageError(true)}
            />
            
            {/* Gradientes en los 4 costados - mismo estilo que HeroSection */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, #0f1419 0%, rgba(15,20,25,0.7) 40%, transparent 100%)'
              }}
            />
            
            <div 
              className="absolute right-0 top-0 bottom-0 w-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(270deg, #0f1419 0%, rgba(15,20,25,0.7) 40%, transparent 100%)'
              }}
            />
            
            <div 
              className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, #0f1419 0%, rgba(15,20,25,0.6) 50%, transparent 100%)'
              }}
            />
            
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
              style={{
                background: 'linear-gradient(0deg, #0f1419 0%, rgba(15,20,25,0.7) 50%, transparent 100%)'
              }}
            />

            {/* Viñeta radial */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15,20,25,0.3) 100%)'
              }}
            />
          </div>
        ) : (
          /* Placeholder cuando no hay imagen */
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${BACKGROUND_PLACEHOLDER.url})`,
              filter: 'brightness(0.3)'
            }}
          />
        )}
      </div>

      {/* Content - siempre visible sobre la imagen */}
      <div className="relative h-full flex items-end z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {title}{displayYear && ` (${displayYear})`}
          </h1>

          {hasCompleteReleaseDate && dayMonthText && efemeridesUrl && estrenosYearUrl && (
            <p className="text-gray-300 mb-3 drop-shadow-md">
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

          <div className="flex flex-wrap items-center gap-4 text-gray-300 drop-shadow-md">
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