// src/components/home/MovieCard.tsx
import Link from 'next/link';
import { MovieWithRelease } from '@/types/home.types';
import { formatPartialDate } from '@/lib/shared/dateUtils';
import { PosterPlaceholder } from '@/components/film/PosterPlaceholder';

interface MovieCardProps {
  movie: MovieWithRelease;
  showDate?: boolean;
  dateFormatter?: (movie: MovieWithRelease) => string;
  dateType?: 'past' | 'future';
  showFutureBadge?: boolean;
}

export default function MovieCard({
  movie,
  showDate,
  dateFormatter,
  dateType = 'past',
  showFutureBadge = true
}: MovieCardProps) {

  const obtenerDirectores = (movie: MovieWithRelease): string => {
    if (movie.crew && movie.crew.length > 0) {
      const directores = movie.crew.filter((c) => c.roleId === 2);

      if (directores.length > 0) {
        const nombresDirectores = directores
          .map((director) => {
            if (director?.person) {
              const firstName = director.person.firstName || '';
              const lastName = director.person.lastName || '';
              return `${firstName} ${lastName}`.trim();
            }
            return null;
          })
          .filter(Boolean);

        if (nombresDirectores.length > 0) {
          if (nombresDirectores.length > 2) {
            return `${nombresDirectores.slice(0, 2).join(', ')} y otros`;
          }
          return nombresDirectores.join(' y ');
        }
      }
    }
    return '';
  };

  const defaultDateFormatter = (movie: MovieWithRelease): string => {
    if (!movie.releaseYear) return 'Sin fecha';

    const partialDate = {
      year: movie.releaseYear,
      month: movie.releaseMonth,
      day: movie.releaseDay
    };

    return formatPartialDate(partialDate, {
      monthFormat: 'short',
      includeDay: true,
      fallback: movie.releaseYear.toString()
    });
  };

  const formatDate = dateFormatter || defaultDateFormatter;
  const director = obtenerDirectores(movie);
  const year = movie.releaseYear;
  const tituloConAnio = year ? `${movie.title} (${year})` : movie.title;
  const subtitulo = director ? `Dir: ${director}` : '';

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group cursor-pointer"
    >
      {/* Poster container */}
      <div className="relative overflow-hidden rounded-sm shadow-lg shadow-black/30">
        <div className="aspect-[2/3] w-full">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
              loading="lazy"
            />
          ) : (
            <PosterPlaceholder className="h-full w-full" />
          )}
        </div>

        {/* Borde sutil overlay */}
        <div className="absolute inset-0 rounded-sm border border-foreground/[0.04]" />

        {/* Badge fecha */}
        {showDate && (
          <div className="absolute left-1.5 top-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 text-[9px] text-foreground/80 backdrop-blur-sm">
            {formatDate(movie)}
          </div>
        )}

        {/* Badge formato */}
        {showDate && dateType === 'future' && showFutureBadge && (
          <div className="absolute right-1.5 top-1.5 rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-foreground/70 backdrop-blur-sm">
            Próx.
          </div>
        )}
      </div>

      {/* Título (Año) */}
      <h3 className="mt-2.5 line-clamp-2 text-[13px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent">
        {tituloConAnio}
      </h3>

      {/* Subtítulo: Dir: Director */}
      {subtitulo && (
        <p className="truncate text-[12px] text-muted-foreground/40">
          {subtitulo}
        </p>
      )}
    </Link>
  );
}
