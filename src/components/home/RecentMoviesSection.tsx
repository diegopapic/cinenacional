// src/components/home/RecentMoviesSection.tsx
import Link from 'next/link';
import { SimpleMovie } from '@/types/home.types';
import SkeletonLoader from './SkeletonLoader';

interface RecentMoviesSectionProps {
  movies: SimpleMovie[];
  loading: boolean;
}

export default function RecentMoviesSection({ movies, loading }: RecentMoviesSectionProps) {
  return (
    <section className="mb-12">
      <h2 className="serif-heading text-3xl mb-6 text-white">Últimas Películas Ingresadas</h2>
      
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[2/3] rounded bg-gray-800 mb-1"></div>
              <div className="h-3 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay películas recientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {movies.map((pelicula) => (
            <Link
              key={pelicula.id}
              href={`/peliculas/${pelicula.slug}`}
              className="group cursor-pointer"
            >
              <div className="aspect-[2/3] rounded overflow-hidden mb-1 transform group-hover:scale-105 transition-transform">
                {pelicula.posterUrl ? (
                  <img
                    src={pelicula.posterUrl}
                    alt={pelicula.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`placeholder-small w-full h-full ${pelicula.posterUrl ? 'hidden' : ''}`}>
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xs font-medium text-white truncate">{pelicula.title}</h3>
            </Link>
          ))}
        </div>
      )}
{/*
      <div className="mt-6 text-center">
        <Link
          href="/listados/peliculas?sort=createdAt"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más películas recientes
        </Link>
      </div>
      */}
    </section>
  );
}