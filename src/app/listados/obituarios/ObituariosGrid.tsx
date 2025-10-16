// src/components/listados/obituarios/ObituariosGrid.tsx
'use client';

import PersonCard from '@/components/home/PersonCard';
import { PersonWithDeath } from '@/lib/obituarios/obituariosTypes';

interface ObituariosGridProps {
  people: PersonWithDeath[];
  isLoading: boolean;
}

export default function ObituariosGrid({ people, isLoading }: ObituariosGridProps) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-2" />
            <div className="h-4 bg-gray-800 rounded mb-1" />
            <div className="h-3 bg-gray-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }
  
  if (people.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 text-lg mb-2">
          No se encontraron obituarios para este año
        </div>
        <p className="text-gray-500 text-sm">
          Intenta seleccionar otro año
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {people.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  );
}