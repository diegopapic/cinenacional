// src/components/home/PersonCard.tsx
'use client';

import Link from 'next/link';
import { PersonWithDeath } from '@/lib/obituarios/obituariosTypes';
import { formatPersonName, calculateAge } from '@/lib/obituarios/obituariosUtils';

interface PersonCardProps {
  person: PersonWithDeath;
}

export default function PersonCard({ person }: PersonCardProps) {
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

  return (
    <Link 
      href={`/persona/${person.slug}`}
      className="group block text-center"
    >
      {/* Imagen circular */}
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-gray-800 mb-3 transition-transform duration-300 group-hover:scale-105">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={personName}
            className="w-full h-full object-cover"
          />
        ) : (
          // Placeholder SVG - igual al de la home
          <div className="w-full h-full flex items-center justify-center">
            <svg 
              className="w-1/2 h-1/2 text-gray-500" 
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
        
        {/* Overlay en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Información */}
      <div className="space-y-1">
        <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-2">
          {personName}
        </h3>
        
        {/* Fechas: 1950 - 2024 (74 años) */}
        {person.birthYear && person.deathYear && (
          <p className="text-sm text-gray-400">
            {person.birthYear} - {person.deathYear}
            {age !== null && ` (${age} años)`}
          </p>
        )}
        
        {/* Si solo tiene año de muerte */}
        {!person.birthYear && person.deathYear && (
          <p className="text-sm text-gray-400">
            † {person.deathYear}
          </p>
        )}
      </div>
    </Link>
  );
}