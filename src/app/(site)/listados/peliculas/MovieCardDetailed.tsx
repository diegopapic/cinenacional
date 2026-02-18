// src/app/(site)/listados/peliculas/MovieCardDetailed.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
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

/**
 * Formatea la lista de países coproductores (excluyendo Argentina)
 * con "y" entre los últimos dos.
 */
function formatCoproduction(countries: Array<{ id: number; name: string }>): string | null {
  const others = countries.filter(c => c.name.toLowerCase() !== 'argentina');
  if (others.length === 0) return null;
  if (others.length === 1) return others[0].name;
  if (others.length === 2) return `${others[0].name} y ${others[1].name}`;
  const last = others[others.length - 1].name;
  const rest = others.slice(0, -1).map(c => c.name).join(', ');
  return `${rest} y ${last}`;
}

export default function MovieCardDetailed({ movie }: MovieCardDetailedProps) {
  const displayYear = getDisplayYear(movie);
  const releaseDateFormatted = formatReleaseDate(
    movie.releaseYear,
    movie.releaseMonth,
    movie.releaseDay
  );
  const durationFormatted = formatDuration(movie.duration);
  // Solo mostrar tipo de duración si no hay duración numérica
  const durationTypeLabel = !movie.duration ? getDurationTypeLabel(movie.tipoDuracion) : '';
  const stageLabel = movie.stage && movie.stage !== 'COMPLETA' ? getStageLabel(movie.stage) : null;
  const coproductionText = movie.countries.length > 1 ? formatCoproduction(movie.countries) : null;

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group flex gap-4 border-b border-border/10 py-4 last:border-b-0 md:gap-5"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-sm md:w-24">
        {movie.posterUrl ? (
          <Image
            fill
            src={movie.posterUrl}
            alt={movie.title}
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <svg
              className="h-8 w-8 text-muted-foreground/20"
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
        <div className="absolute inset-0 border border-foreground/[0.04]" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Title + Year + Stage badge */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-[14px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[15px]">
            {movie.title}
            {displayYear && (
              <span className="ml-1.5 text-[12px] font-normal tabular-nums text-muted-foreground/40">
                ({displayYear})
              </span>
            )}
          </p>
          {stageLabel && (
            <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-400/80">
              {stageLabel}
            </span>
          )}
        </div>

        {/* Directors */}
        {movie.directors.length > 0 && (
          <p className="text-[12px] text-muted-foreground/50">
            Dir: {movie.directors.map(d => d.name).join(', ')}
          </p>
        )}

        {/* Metadata row: genres, duration, duration type (only if no duration) */}
        {(movie.genres.length > 0 || durationFormatted || durationTypeLabel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/40">
            {movie.genres.length > 0 && (
              <span>{movie.genres.map(g => g.name).join(', ')}</span>
            )}
            {durationFormatted && <span>{durationFormatted}</span>}
            {durationTypeLabel && <span>{durationTypeLabel}</span>}
          </div>
        )}

        {/* Release date */}
        {releaseDateFormatted && (
          <p className="text-[11px] text-muted-foreground/40">
            Estreno en Argentina: {releaseDateFormatted}
          </p>
        )}

        {/* Co-production */}
        {coproductionText && (
          <p className="text-[11px] text-muted-foreground/35">
            Coproducción con {coproductionText}
          </p>
        )}

        {/* Synopsis */}
        {movie.synopsis && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/45">
            {movie.synopsis}
          </p>
        )}
      </div>
    </Link>
  );
}
