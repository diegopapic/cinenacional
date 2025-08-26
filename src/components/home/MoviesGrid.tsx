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
  ctaText,
  ctaHref
}: MoviesGridProps) {
  return (
    <section className="mb-12">
      <h2 className="serif-heading text-3xl mb-6 text-white">{title}</h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, index) => (
            <SkeletonLoader key={index} type="movie" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              showDate={showDate}
              dateFormatter={dateFormatter}
              dateType={dateType}
            />
          ))}
        </div>
      )}
      {/*ctaText && ctaHref && (
        <div className="mt-6 text-center">
          <Link
            href={ctaHref}
            className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {ctaText}
          </Link>
        </div>
      )*/}
    </section>
  );
}