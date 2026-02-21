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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] rounded-sm bg-muted/30 mb-2" />
            <div className="h-3 rounded bg-muted/20 mb-1" />
            <div className="h-2.5 rounded bg-muted/15 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-muted-foreground/50 text-lg mb-2">
          No se encontraron obituarios para este año
        </div>
        <p className="text-muted-foreground/30 text-[13px]">
          Intenta seleccionar otro año
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-6">
      {people.map((person) => (
        <PersonCard key={person.id} person={person} />
      ))}
    </div>
  );
}
