// src/app/(site)/listados/personas/PersonCardCompact.tsx
'use client';

import Link from 'next/link';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { formatPersonName, calculateAge } from '@/lib/people/personListUtils';

interface PersonCardCompactProps {
  person: PersonWithMovie;
}

export default function PersonCardCompact({ person }: PersonCardCompactProps) {
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

  // Determinar si está fallecida
  const isDeceased = !!person.deathYear;

  return (
    <Link 
      href={`/persona/${person.slug}`}
      className="group block"
    >
      {/* Imagen rectangular con aspect ratio 3:4 */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 mb-3 transition-transform duration-300 group-hover:scale-[1.02] shadow-lg">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={personName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          // Placeholder SVG
          <div className="w-full h-full flex flex-col items-center justify-center">
            <svg 
              className="w-16 h-16 text-gray-600 mb-2" 
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
            <span className="text-xs text-gray-500">Sin foto</span>
          </div>
        )}
        
        {/* Overlay en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      </div>

      {/* Información */}
      <div className="space-y-1">
        <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-2">
          {personName}
        </h3>
        
        {/* Fechas: 1950 - 2024 (74 años) o solo 1950 si vive */}
        {person.birthYear && (
          <p className="text-sm text-gray-400">
            {person.birthYear}
            {isDeceased && ` - ${person.deathYear}`}
            {age !== null && !person.hideAge && ` (${age} años)`}
          </p>
        )}

        {/* Cantidad de películas si tiene */}
        {person.movieCount !== undefined && person.movieCount > 0 && (
          <p className="text-xs text-gray-500">
            {person.movieCount} película{person.movieCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  );
}