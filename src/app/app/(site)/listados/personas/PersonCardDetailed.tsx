// src/app/(site)/listados/personas/PersonCardDetailed.tsx
'use client';

import Link from 'next/link';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { formatPersonName, formatPartialDate, calculateAge } from '@/lib/people/personListUtils';

interface PersonCardDetailedProps {
  person: PersonWithMovie;
}

export default function PersonCardDetailed({ person }: PersonCardDetailedProps) {
  const personName = formatPersonName(person);
  const photoUrl = person.photoUrl;
  
  // Calcular edad
  const age = calculateAge(
    person.birthYear,
    person.birthMonth,
    person.birthDay,
    person.deathYear,
    person.deathMonth,
    person.deathDay
  );

  // Formatear fecha de nacimiento
  const birthDateFormatted = formatPartialDate(
    person.birthYear,
    person.birthMonth,
    person.birthDay
  );

  // Formatear lugar de nacimiento
  const birthLocationFormatted = person.birthLocation
    ? person.birthLocation.parent
      ? `${person.birthLocation.name}, ${person.birthLocation.parent.name}`
      : person.birthLocation.name
    : null;

  // Obtener nacionalidad principal
  const primaryNationality = person.nationalities?.find(n => n.isPrimary)?.location?.name
    || person.nationalities?.[0]?.location?.name;

  // Determinar si está fallecida
  const isDeceased = !!person.deathYear;

  return (
    <Link 
      href={`/persona/${person.slug}`}
      className="group block"
    >
      <div className="flex gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-all hover:bg-gray-900">
        {/* Imagen */}
        <div className="relative w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
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
                className="w-10 h-10 text-gray-600" 
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

          {/* Badge de fallecida */}
          {isDeceased && (
            <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              †
            </div>
          )}
        </div>

        {/* Información */}
        <div className="flex-1 min-w-0">
          {/* Nombre */}
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate text-lg">
            {personName}
          </h3>

          {/* Fecha y lugar de nacimiento */}
          {(birthDateFormatted || birthLocationFormatted) && (
            <p className="text-sm text-gray-400 mt-1">
              {birthDateFormatted && (
                <span>
                  n. {birthDateFormatted}
                  {age !== null && !person.hideAge && !isDeceased && ` (${age} años)`}
                </span>
              )}
              {birthDateFormatted && birthLocationFormatted && ' · '}
              {birthLocationFormatted && <span>{birthLocationFormatted}</span>}
            </p>
          )}

          {/* Fecha de muerte si aplica */}
          {isDeceased && (
            <p className="text-sm text-gray-500 mt-0.5">
              † {formatPartialDate(person.deathYear, person.deathMonth, person.deathDay)}
              {age !== null && !person.hideAge && ` (${age} años)`}
            </p>
          )}

          {/* Nacionalidad */}
          {primaryNationality && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                {primaryNationality}
              </span>
            </p>
          )}

          {/* Película destacada */}
          {person.featuredMovie && (
            <p className="text-sm text-gray-500 mt-2 truncate">
              <span className="text-orange-400/80">{person.featuredMovie.role}</span>
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
