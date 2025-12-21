// src/app/(site)/listados/personas/PersonCardDetailed.tsx
'use client';

import Link from 'next/link';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { formatPersonName, formatPartialDate } from '@/lib/people/personListUtils';

interface PersonCardDetailedProps {
  person: PersonWithMovie;
}

export default function PersonCardDetailed({ person }: PersonCardDetailedProps) {
  const personName = formatPersonName(person);
  const photoUrl = person.photoUrl;

  // Formatear fecha de nacimiento
  const birthDateFormatted = formatPartialDate(
    person.birthYear,
    person.birthMonth,
    person.birthDay
  );

  // Usar el path completo que viene de la API
  const birthLocationFormatted = (person as any).birthLocationPath || null;
  const deathLocationFormatted = (person as any).deathLocationPath || null;

  // Determinar si está fallecida
  const isDeceased = !!person.deathYear;

  // Determinar el rol a mostrar (Actor/Actriz según género)
  const getActorLabel = () => {
    if (person.gender === 'FEMALE') return 'Actriz';
    if (person.gender === 'MALE') return 'Actor';
    return 'Actor/Actriz';
  };

  // Formatear rol de la película destacada
  const getFeaturedRole = () => {
    if (!person.featuredMovie) return null;
    if (person.featuredMovie.role === 'Actor') {
      return getActorLabel();
    }
    return person.featuredMovie.role;
  };

  return (
    <Link 
      href={`/persona/${person.slug}`}
      className="group block"
    >
      <div className="flex gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all hover:bg-gray-900">
        {/* Imagen */}
        <div className="relative w-28 h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={personName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="1.5" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
          )}
        </div>

        {/* Información */}
        <div className="flex-1 min-w-0">
          {/* Nombre */}
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors text-lg">
            {personName}
          </h3>

          {/* Fecha y lugar de nacimiento */}
          {(birthDateFormatted || birthLocationFormatted) && (
            <p className="text-sm text-gray-400 mt-1">
              {birthDateFormatted && <span>n. {birthDateFormatted}</span>}
              {birthDateFormatted && birthLocationFormatted && ' · '}
              {birthLocationFormatted && <span>{birthLocationFormatted}</span>}
            </p>
          )}

          {/* Fecha y lugar de muerte si aplica */}
          {isDeceased && (
            <p className="text-sm text-gray-500 mt-0.5">
              m. {formatPartialDate(person.deathYear, person.deathMonth, person.deathDay)}
              {deathLocationFormatted && ` · ${deathLocationFormatted}`}
            </p>
          )}

          {/* Película destacada */}
          {person.featuredMovie && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-orange-400/80">{getFeaturedRole()}</span>
              {' en '}
              <span className="text-gray-300 italic">
                {person.featuredMovie.title}
              </span>
              {person.featuredMovie.year && (
                <span className="text-gray-500"> ({person.featuredMovie.year})</span>
              )}
            </p>
          )}

          {/* Cantidad de películas */}
          {person.movieCount !== undefined && person.movieCount > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              {person.movieCount} película{person.movieCount !== 1 ? 's' : ''} en el sitio
            </p>
          )}
        </div>

        {/* Flecha de navegación */}
        <div className="flex items-center text-gray-600 group-hover:text-orange-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}