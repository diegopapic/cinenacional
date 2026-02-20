// src/app/(site)/listados/personas/PersonCardCompact.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { formatPersonName, calculateAge } from '@/lib/people/personListUtils';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface PersonCardCompactProps {
  person: PersonWithMovie;
}

export default function PersonCardCompact({ person }: PersonCardCompactProps) {
  const personName = formatPersonName(person);
  const photoUrl = getPersonPhotoUrl(person.photoUrl, 'sm');

  const age = calculateAge(
    person.birthYear,
    person.birthMonth,
    person.birthDay,
    person.deathYear,
    person.deathMonth,
    person.deathDay
  );

  const isDeceased = !!person.deathYear;

  return (
    <Link
      href={`/persona/${person.slug}`}
      className="group flex flex-col items-center text-center"
    >
      {/* Portrait circular */}
      <div className="relative h-20 w-20 overflow-hidden rounded-full md:h-24 md:w-24">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={personName}
            fill
            sizes="(min-width: 768px) 96px, 80px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <User className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Overlay borde interior */}
        <div className="pointer-events-none absolute inset-0 rounded-full border border-foreground/[0.04]" />
      </div>

      {/* Nombre */}
      <h3 className="mt-2.5 text-[12px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[13px]">
        {personName}
      </h3>

      {/* Años */}
      {person.birthYear && (
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/40">
          ({person.birthYear}
          {isDeceased && `–${person.deathYear}`}
          )
          {age !== null && ` · ${age} años`}
        </p>
      )}

      {/* Films */}
      {person.movieCount !== undefined && person.movieCount > 0 && (
        <p className="text-[11px] text-muted-foreground/35">
          {person.movieCount} película{person.movieCount !== 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}
