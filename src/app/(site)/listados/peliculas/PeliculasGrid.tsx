// src/app/(site)/listados/peliculas/PeliculasGrid.tsx
'use client';

import MovieCardCompact from './MovieCardCompact';
import MovieCardDetailed from './MovieCardDetailed';
import { MovieListItem, ViewMode } from '@/lib/movies/movieListTypes';

interface PeliculasGridProps {
  movies: MovieListItem[];
  isLoading: boolean;
  viewMode: ViewMode;
}

export default function PeliculasGrid({ movies, isLoading, viewMode }: PeliculasGridProps) {

  if (isLoading) {
    return (
      <div className={
        viewMode === 'compact'
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
          : "grid grid-cols-1 lg:grid-cols-2 gap-4"
      }>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {viewMode === 'compact' ? (
              <>
                <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-2" />
                <div className="h-4 bg-gray-800 rounded mb-1" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </>
            ) : (
              <div className="flex gap-4 p-4 bg-gray-900 rounded-lg">
                <div className="w-24 h-36 bg-gray-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded w-1/2" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 text-lg mb-2">
          No se encontraron películas con los filtros seleccionados
        </div>
        <p className="text-gray-500 text-sm">
          Intenta ajustar los filtros o limpiarlos para ver más resultados
        </p>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {movies.map((movie) => (
          <MovieCardCompact key={movie.id} movie={movie} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {movies.map((movie) => (
        <MovieCardDetailed key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
