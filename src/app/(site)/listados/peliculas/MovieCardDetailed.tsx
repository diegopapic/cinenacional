// src/app/(site)/listados/peliculas/MovieCardDetailed.tsx
'use client';

import Link from 'next/link';
import { MovieListItem } from '@/lib/movies/movieListTypes';
import {
  formatDuration,
  formatReleaseDate,
  getDisplayYear,
  getDurationTypeLabel,
  getStageLabel
} from '@/lib/movies/movieListUtils';

interface MovieCardDetailedProps {
  movie: MovieListItem;
}

export default function MovieCardDetailed({ movie }: MovieCardDetailedProps) {
  const displayYear = getDisplayYear(movie);
  const releaseDateFormatted = formatReleaseDate(
    movie.releaseYear,
    movie.releaseMonth,
    movie.releaseDay
  );
  const durationFormatted = formatDuration(movie.duration);
  const durationTypeLabel = getDurationTypeLabel(movie.tipoDuracion);

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group block"
    >
      <div className="flex gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all hover:bg-gray-900">
        {/* Poster */}
        <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-600"
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
            </div>
          )}
        </div>

        {/* Información */}
        <div className="flex-1 min-w-0">
          {/* Título y año */}
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors text-lg">
            {movie.title}
            {displayYear && (
              <span className="font-normal text-gray-400 ml-2">({displayYear})</span>
            )}
          </h3>

          {/* Directores */}
          {movie.directors.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Dir. {movie.directors.map(d => d.name).join(', ')}
            </p>
          )}

          {/* Fecha de estreno */}
          {releaseDateFormatted && movie.releaseYear !== displayYear && (
            <p className="text-sm text-gray-500 mt-0.5">
              Estrenada: {releaseDateFormatted}
            </p>
          )}

          {/* Sinopsis */}
          {movie.synopsis && (
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
              {movie.synopsis}
            </p>
          )}

          {/* Géneros */}
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.map(genre => (
                <span
                  key={genre.id}
                  className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          {/* Metadatos: Duración, tipo, sonido, color */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            {durationFormatted && (
              <span>{durationFormatted}</span>
            )}
            {durationTypeLabel && (
              <span>{durationTypeLabel}</span>
            )}
            {movie.soundType && (
              <span>{movie.soundType.charAt(0).toUpperCase() + movie.soundType.slice(1).toLowerCase()}</span>
            )}
            {movie.colorType && (
              <span>{movie.colorType.name}</span>
            )}
            {movie.stage && movie.stage !== 'COMPLETA' && (
              <span className="text-orange-400/80">{getStageLabel(movie.stage)}</span>
            )}
          </div>

          {/* Países coproductores */}
          {movie.countries.length > 1 && (
            <p className="text-xs text-gray-600 mt-1">
              Coproducción: {movie.countries.map(c => c.name).join(', ')}
            </p>
          )}
        </div>

        {/* Flecha de navegación */}
        <div className="flex items-center text-gray-600 group-hover:text-orange-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
