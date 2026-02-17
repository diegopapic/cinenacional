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
    <section>
      {/* Encabezado de sección */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
          Últimas películas ingresadas
        </h2>
        <Link
          href="/listados/peliculas"
          className="shrink-0 text-[12px] md:text-[13px] tracking-wide text-muted-foreground/40 transition-colors hover:text-accent"
        >
          Ver más
        </Link>
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
          <p className="text-[13px] text-muted-foreground/40">No hay películas recientes</p>
        ) : (
          <>
            {/* Mobile: scroll horizontal */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:hidden">
              {movies.map((pelicula) => (
                <Link
                  key={pelicula.id}
                  href={`/pelicula/${pelicula.slug}`}
                  className="group shrink-0"
                >
                  <div className="relative w-28 overflow-hidden rounded-sm shadow-lg shadow-black/30">
                    <div className="aspect-[2/3]">
                      {pelicula.posterUrl ? (
                        <img
                          src={pelicula.posterUrl}
                          alt={pelicula.title}
                          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-full w-full bg-muted/20 flex items-center justify-center ${pelicula.posterUrl ? 'hidden' : ''}`}>
                        <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    </div>
                    {/* Borde sutil overlay */}
                    <div className="absolute inset-0 rounded-sm border border-foreground/[0.04]" />
                  </div>
                  <h3 className="mt-2 w-28 truncate text-[12px] font-medium leading-snug text-foreground/80 group-hover:text-accent">
                    {pelicula.title}
                  </h3>
                </Link>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden md:grid grid-cols-5 lg:grid-cols-6 gap-4 lg:gap-5">
              {movies.map((pelicula) => (
                <Link
                  key={pelicula.id}
                  href={`/pelicula/${pelicula.slug}`}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-sm shadow-lg shadow-black/30">
                    <div className="aspect-[2/3] w-full">
                      {pelicula.posterUrl ? (
                        <img
                          src={pelicula.posterUrl}
                          alt={pelicula.title}
                          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`h-full w-full bg-muted/20 flex items-center justify-center ${pelicula.posterUrl ? 'hidden' : ''}`}>
                        <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    </div>
                    {/* Borde sutil overlay */}
                    <div className="absolute inset-0 rounded-sm border border-foreground/[0.04]" />
                  </div>
                  <h3 className="mt-2.5 truncate text-[13px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent">
                    {pelicula.title}
                  </h3>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
