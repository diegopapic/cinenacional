// src/app/(site)/listados/peliculas/MovieCardCompact.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
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
      className="group flex flex-col"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm">
        {movie.posterUrl ? (
          <Image
            fill
            src={movie.posterUrl}
            alt={movie.title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30">
            <svg
              className="mb-2 h-10 w-10 text-muted-foreground/20"
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

      {/* Info */}
      <div className="mt-2">
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[13px]">
          {movie.title}
          {displayYear && (
            <span className="ml-1 text-[11px] font-normal tabular-nums text-muted-foreground/40">
              ({displayYear})
            </span>
          )}
        </p>
        {director && (
          <p className="truncate text-[11px] text-muted-foreground/40">
            Dir: {director.name}
          </p>
        )}
      </div>
    </Link>
  );
}
