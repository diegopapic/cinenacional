'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface Person {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  slug: string;
  photoUrl?: string | null;
}

interface CrewMember {
  person: Person;
  roleId?: number | null;
  role?: string;
  department?: string | null;
}

interface MovieWithCrew {
  id: number;
  slug: string;
  title: string;
  synopsis?: string | null;
  trailerUrl?: string | null;
  crew?: CrewMember[];
}

interface Director {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string | null;
}

interface MovieInfoProps {
  movie: MovieWithCrew;
  onTrailerClick?: () => void;
  onShareClick?: () => void;
}

export function MovieInfo({ movie, onTrailerClick, onShareClick }: MovieInfoProps) {
  const [directors, setDirectors] = useState<Director[]>([]);

  useEffect(() => {
    if (movie.crew && Array.isArray(movie.crew) && movie.crew.length > 0) {
      // Filtrar todos los miembros del crew que sean directores (roleId === 2)
      const directorsCrew = movie.crew.filter(member => member.roleId === 2);
      
      const directorsData = directorsCrew.map(directorCrew => {
        if (directorCrew?.person) {
          const { id, firstName, lastName, slug, photoUrl } = directorCrew.person;
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          return {
            id,
            name: fullName || 'Director desconocido',
            slug: slug || '',
            photoUrl: photoUrl || null
          };
        }
        return null;
      }).filter(Boolean) as Director[];
      
      setDirectors(directorsData);
    }
  }, [movie]);

  // Sanitizar la sinopsis para prevenir XSS
  const sanitizedSynopsis = movie.synopsis 
    ? DOMPurify.sanitize(movie.synopsis, {
        ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'b', 'i', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        ADD_ATTR: ['target'],
      })
    : 'Sinopsis no disponible.';

  return (
    <div className="space-y-6">
      {/* Sinopsis - Renderiza HTML sanitizado */}
      <div 
        className="serif-body text-lg text-gray-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizedSynopsis }}
      />

      {/* Directores */}
      {directors.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-cine-accent">Dirección</h3>
            <div className="flex flex-wrap gap-4">
              {directors.map((director) => (
                <div key={director.id} className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full person-placeholder">
                    {director.photoUrl ? (
                      <img 
                        src={director.photoUrl} 
                        alt={director.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <a 
                      href={`/persona/${director.slug}`}
                      className="font-medium text-white hover:text-cine-accent transition-colors"
                    >
                      {director.name}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={onShareClick}
          className="border border-gray-600 hover:border-cine-accent px-6 py-3 rounded-lg font-medium transition-colors text-white"
        >
          Compartir
        </button>
      </div>
    </div>
  );
}