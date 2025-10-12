// src/components/listados/estrenos/EstrenosGrid.tsx
'use client';

import MovieCard from '@/components/home/MovieCard';
import { MovieWithRelease } from '@/types/home.types';

interface EstrenosGridProps {
  movies: MovieWithRelease[];
  isLoading: boolean;
  showDates?: boolean;
  dateType?: 'past' | 'future';
}

export default function EstrenosGrid({ 
  movies, 
  isLoading, 
  showDates = true,
  dateType = 'past'
}: EstrenosGridProps) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-2" />
            <div className="h-4 bg-gray-800 rounded mb-1" />
            <div className="h-3 bg-gray-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }
  
  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 text-lg mb-2">
          No se encontraron estrenos
        </div>
        <p className="text-gray-500 text-sm">
          Intenta seleccionar otro período
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {movies.map((movie) => (
        <MovieCard 
          key={movie.id} 
          movie={movie} 
          showDate={showDates}
          dateType={dateType}
        />
      ))}
    </div>
  );
}