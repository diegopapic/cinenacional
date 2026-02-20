// src/app/(site)/listados/personas/PersonasGrid.tsx
'use client';

import PersonCardCompact from './PersonCardCompact';
import PersonCardDetailed from './PersonCardDetailed';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { ViewMode } from '@/components/shared/ViewToggle';

interface PersonasGridProps {
  people: PersonWithMovie[];
  isLoading: boolean;
  viewMode: ViewMode;
}

export default function PersonasGrid({ people, isLoading, viewMode }: PersonasGridProps) {
  if (isLoading) {
    const skeletonCount = viewMode === 'compact' ? 24 : 12;
    return (
      <div className={
        viewMode === 'compact'
          ? 'mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6'
          : 'mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'
      }>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {viewMode === 'compact' ? (
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-muted/30 md:h-24 md:w-24" />
                <div className="mx-auto mt-3 h-4 w-20 rounded bg-muted/30" />
                <div className="mx-auto mt-1 h-3 w-14 rounded bg-muted/30" />
              </div>
            ) : (
              <div className="flex gap-4 py-4 md:gap-5">
                <div className="h-28 w-20 shrink-0 rounded-sm bg-muted/30 md:h-32 md:w-24" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <div className="h-5 w-3/4 rounded bg-muted/30" />
                  <div className="h-4 w-1/2 rounded bg-muted/30" />
                  <div className="h-4 w-2/3 rounded bg-muted/30" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground/40">
        No se encontraron personas con los filtros seleccionados.
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6">
        {people.map((person) => (
          <PersonCardCompact key={person.id} person={person} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {people.map((person) => (
        <PersonCardDetailed key={person.id} person={person} />
      ))}
    </div>
  );
}
