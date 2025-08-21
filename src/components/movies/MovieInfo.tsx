'use client';

import { useEffect, useState } from 'react';

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
  const [director, setDirector] = useState<Director | null>(null);

  useEffect(() => {
    if (movie.crew && Array.isArray(movie.crew) && movie.crew.length > 0) {
      const directorCrew = movie.crew.find(member => member.roleId === 2);
      if (directorCrew?.person) {
        const { id, firstName, lastName, slug, photoUrl } = directorCrew.person;
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        setDirector({
          id,
          name: fullName || 'Director desconocido',
          slug: slug || '',
          photoUrl: photoUrl || null
        });
      }
    }
  }, [movie]);

  const synopsis = movie.synopsis || 'Sinopsis no disponible.';

  return (
    <div className="space-y-6">
      <div>
        <p className="serif-body text-lg text-gray-300 leading-relaxed">
          {synopsis}
        </p>
      </div>
      {director && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-cine-accent">Dirección</h3>
            <div className="flex items-center space-x-3">
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
                  href={`/personas/${director.slug}`}
                  className="font-medium text-white hover:text-cine-accent transition-colors"
                >
                  {director.name}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        {movie.trailerUrl && (
          <button 
            onClick={onTrailerClick}
            className="bg-cine-accent hover:bg-blue-600 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Ver Trailer</span>
          </button>
        )}
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