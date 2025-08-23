'use client';

import { useState } from 'react';
import { POSTER_PLACEHOLDER, BACKGROUND_PLACEHOLDER } from '@/lib/movies/movieConstants';

interface MovieHeroProps {
  title: string;
  year: number | null;
  duration: number;
  genres: string[];
  posterUrl?: string | null;
}

export function MovieHero({ title, year, duration, genres, posterUrl }: MovieHeroProps) {
  const [imageError, setImageError] = useState(false);

  // Determinar si tenemos un poster válido
  const hasValidPoster = posterUrl && posterUrl.trim() !== '' && !imageError;
  
  // Usar poster o placeholder
  const backgroundImage = BACKGROUND_PLACEHOLDER.url;

  return (
    <div className="relative h-[50vh] overflow-hidden bg-gray-900">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${backgroundImage})`,
          filter: hasValidPoster ? 'brightness(0.7)' : 'brightness(0.3)'  // ← Usar hasValidPoster
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
          
          <div className="flex flex-wrap items-center gap-4 text-gray-300">
            {year && <span>{year}</span>}
            {duration > 0 && (
              <>
                <span>•</span>
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