// src/components/home/MoviesGrid.tsx
import Link from 'next/link';
import { MovieWithRelease } from '@/types/home.types';
import MovieCard from './MovieCard';
import SkeletonLoader from './SkeletonLoader';

interface MoviesGridProps {
  title: string;
  movies: MovieWithRelease[];
  loading: boolean;
  emptyMessage?: string;
  showDate?: boolean;
  dateFormatter?: (movie: MovieWithRelease) => string;
  dateType?: 'past' | 'future';
  showFutureBadge?: boolean;
  ctaText?: string;
  ctaHref?: string;
}

export default function MoviesGrid({
  title,
  movies,
  loading,
  emptyMessage = 'No hay películas disponibles',
  showDate = false,
  dateFormatter,
  dateType = 'past',
  showFutureBadge = true,
  ctaText,
  ctaHref
}: MoviesGridProps) {
  return (
    <section>
      {/* Encabezado de sección */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
          {title}
        </h2>
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className="shrink-0 text-[12px] md:text-[13px] tracking-wide text-muted-foreground/40 transition-colors hover:text-accent"
          >
            Ver más
          </Link>
        )}
      </div>

      {/* Separador */}
      <div className="mt-5 md:mt-6 border-t border-border/30 pt-5 md:pt-6">
        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:hidden">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="shrink-0 w-28">
                  <SkeletonLoader type="movie" />
                </div>
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:grid grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-5">
              {[...Array(6)].map((_, index) => (
                <SkeletonLoader key={index} type="movie" />
              ))}
            </div>
          </>
        ) : movies.length === 0 ? (
          <p className="text-[13px] text-muted-foreground/40">{emptyMessage}</p>
        ) : (
          <>
            {/* Mobile: scroll horizontal */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:hidden">
              {movies.map((movie) => (
                <div key={movie.id} className="shrink-0 w-28">
                  <MovieCard
                    movie={movie}
                    showDate={showDate}
                    dateFormatter={dateFormatter}
                    dateType={dateType}
                    showFutureBadge={showFutureBadge}
                  />
                </div>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden md:grid grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-5">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  showDate={showDate}
                  dateFormatter={dateFormatter}
                  dateType={dateType}
                  showFutureBadge={showFutureBadge}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
