'use client';

import Link from 'next/link';

interface Movie {
  id?: string;
  slug?: string;
  title: string;
  year: string | number;
  posterUrl?: string;
}

interface SimilarMoviesProps {
  movies: Movie[];
}

export function SimilarMovies({ movies }: SimilarMoviesProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
      <h2 className="serif-heading text-2xl text-white mb-6">Películas Similares</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {movies.map((movie, index) => {
          const movieLink = movie.slug || movie.id || '#';
          
          return (
            <Link 
              key={movie.id || index} 
              href={`/peliculas/${movieLink}`}
              className="group cursor-pointer block"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform">
                {movie.posterUrl ? (
                  <img 
                    src={movie.posterUrl}
                    alt={`Poster de ${movie.title}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="placeholder-small w-full h-full">
                    <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-xs text-gray-400 text-center">Sin imagen</p>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-white group-hover:text-cine-accent transition-colors">
                {movie.title}
              </p>
              <p className="text-xs text-gray-400">{movie.year}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}