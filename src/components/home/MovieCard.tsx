// src/components/home/MovieCard.tsx
import Link from 'next/link';
import { MovieWithRelease } from '@/types/home.types';
import { formatPartialDate } from '@/lib/shared/dateUtils';
import { POSTER_PLACEHOLDER } from '@/lib/movies/movieConstants';

interface MovieCardProps {
  movie: MovieWithRelease;
  showDate?: boolean;
  dateFormatter?: (movie: MovieWithRelease) => string;
  dateType?: 'past' | 'future';
}

export default function MovieCard({ 
  movie, 
  showDate, 
  dateFormatter,
  dateType = 'past' 
}: MovieCardProps) {
  
  // Función actualizada para obtener TODOS los directores (solo roleId === 2)
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
    return 'Director no especificado';
  };

  const obtenerGeneros = (movie: MovieWithRelease): string => {
    if (movie.genres && movie.genres.length > 0) {
      const genreNames = movie.genres
        .map((g) => g.genre?.name || g.name || null)
        .filter(Boolean);

      if (genreNames.length > 0) {
        return genreNames.slice(0, 2).join(', ');
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
  
  // Color del badge según si es fecha pasada o futura
  const badgeColor = dateType === 'future' 
    ? 'bg-blue-600/80' 
    : 'bg-black/80';

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group cursor-pointer"
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform poster-shadow relative">
        <img
          src={movie.posterUrl || POSTER_PLACEHOLDER.cloudinaryUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          style={{
            // Oscurecer un poco el placeholder para que se note que es genérico
            filter: !movie.posterUrl ? 'brightness(0.5)' : 'none'
          }}
        />
        
        {showDate && (
          <div className={`absolute top-2 right-2 ${badgeColor} backdrop-blur-sm px-2 py-1 rounded text-xs text-white`}>
            {formatDate(movie)}
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm text-white line-clamp-2">{movie.title}</h3>
      <p className="text-gray-400 text-xs">{obtenerGeneros(movie)}</p>
      <p className="text-gray-400 text-xs">Dir: {obtenerDirectores(movie)}</p>
    </Link>
  );
}