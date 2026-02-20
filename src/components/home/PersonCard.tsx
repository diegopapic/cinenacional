// src/components/home/PersonCard.tsx
'use client';

import Link from 'next/link';
import { PersonWithDeath } from '@/lib/obituarios/obituariosTypes';
import { formatPersonName, calculateAge, formatDeathDate } from '@/lib/obituarios/obituariosUtils';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface PersonCardProps {
  person: PersonWithDeath;
}

export default function PersonCard({ person }: PersonCardProps) {
  const personName = formatPersonName(person);
  const photoUrl = getPersonPhotoUrl(person.photoUrl, 'md');
  
  // Calcular edad
  const age = calculateAge(
    person.birthYear,
    person.birthMonth,
    person.birthDay,
    person.deathYear,
    person.deathMonth,
    person.deathDay
  );

  // Formatear fecha de muerte (sin año)
  const deathDateLabel = formatDeathDate(person.deathMonth, person.deathDay);

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

        {/* Badge de fecha de muerte */}
        {deathDateLabel && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
            {deathDateLabel}
          </div>
        )}
      </div>

      {/* Información */}
      <div className="space-y-1">
        <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-2">
          {personName}
        </h3>
        
        {/* Fechas: 1950 - 2024 (74 años) o ???? - 2024 si no hay año de nacimiento */}
        {person.deathYear && (
          <p className="text-sm text-gray-400">
            {person.birthYear || '????'} - {person.deathYear}
            {age !== null && ` (${age} años)`}
          </p>
        )}
      </div>
    </Link>
  );
}