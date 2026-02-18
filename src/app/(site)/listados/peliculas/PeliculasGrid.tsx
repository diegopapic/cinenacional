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
          ? "mt-6 grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6"
          : "mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
      }>
        {Array.from({ length: viewMode === 'compact' ? 12 : 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {viewMode === 'compact' ? (
              <>
                <div className="aspect-[2/3] rounded-sm bg-muted/30" />
                <div className="mt-2 h-3 rounded bg-muted/20" />
                <div className="mt-1 h-2.5 w-2/3 rounded bg-muted/15" />
              </>
            ) : (
              <div className="flex gap-4 py-4 md:gap-5">
                <div className="aspect-[2/3] w-20 shrink-0 rounded-sm bg-muted/30 md:w-24" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <div className="h-4 w-3/4 rounded bg-muted/20" />
                  <div className="h-3 w-1/2 rounded bg-muted/15" />
                  <div className="h-3 w-2/3 rounded bg-muted/15" />
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
      <div className="py-20 text-center text-sm text-muted-foreground/40">
        No se encontraron películas con los filtros seleccionados.
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCardCompact key={movie.id} movie={movie} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {movies.map((movie) => (
        <MovieCardDetailed key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
