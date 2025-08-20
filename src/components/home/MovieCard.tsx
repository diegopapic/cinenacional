// src/components/home/MovieCard.tsx
import Link from 'next/link';
import { MovieWithRelease } from '@/types/home.types';
import { formatPartialDate } from '@/lib/shared/dateUtils';

interface MovieCardProps {
  movie: MovieWithRelease;
  showDate?: boolean;
  dateFormatter?: (movie: MovieWithRelease) => string;
  dateType?: 'past' | 'future'; // Nuevo prop para diferenciar el badge
}

export default function MovieCard({ 
  movie, 
  showDate, 
  dateFormatter,
  dateType = 'past' 
}: MovieCardProps) {
  const obtenerDirector = (movie: MovieWithRelease): string => {
    if (movie.crew && movie.crew.length > 0) {
      const director = movie.crew.find((c) => 
        c.roleId === 2 || 
        c.role?.toLowerCase() === 'director' || 
        c.role?.toLowerCase() === 'dirección'
      );
      
      if (director?.person) {
        const firstName = director.person.firstName || '';
        const lastName = director.person.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) return fullName;
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
      href={`/peliculas/${movie.slug}`}
      className="group cursor-pointer"
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform poster-shadow relative">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`movie-placeholder w-full h-full ${movie.posterUrl ? 'hidden' : ''}`}>
          <svg className="w-12 h-12 text-cine-accent mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-xs text-gray-400">Afiche</p>
        </div>
        {showDate && (
          <div className={`absolute top-2 right-2 ${badgeColor} backdrop-blur-sm px-2 py-1 rounded text-xs text-white`}>
            {formatDate(movie)}
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm text-white line-clamp-2">{movie.title}</h3>
      <p className="text-gray-400 text-xs">{obtenerGeneros(movie)}</p>
      <p className="text-gray-400 text-xs">Dir: {obtenerDirector(movie)}</p>
    </Link>
  );
}