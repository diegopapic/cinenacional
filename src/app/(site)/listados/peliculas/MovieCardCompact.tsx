// src/app/(site)/listados/peliculas/MovieCardCompact.tsx
'use client';

import Link from 'next/link';
import { MovieListItem } from '@/lib/movies/movieListTypes';
import { getDisplayYear } from '@/lib/movies/movieListUtils';

interface MovieCardCompactProps {
  movie: MovieListItem;
}

export default function MovieCardCompact({ movie }: MovieCardCompactProps) {
  const displayYear = getDisplayYear(movie);
  const director = movie.directors[0];

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group block"
    >
      {/* Poster con aspect ratio 2:3 */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-3 transition-transform duration-300 group-hover:scale-[1.02] shadow-lg">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          // Placeholder SVG
          <div className="w-full h-full flex flex-col items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span className="text-xs text-gray-500">Sin póster</span>
          </div>
        )}

        {/* Overlay en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Información */}
      <div className="space-y-1">
        <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-2">
          {movie.title}
        </h3>

        {/* Año */}
        {displayYear && (
          <p className="text-sm text-gray-400">
            {displayYear}
          </p>
        )}

        {/* Director */}
        {director && (
          <p className="text-xs text-gray-500 line-clamp-1">
            Dir. {director.name}
          </p>
        )}
      </div>
    </Link>
  );
}
