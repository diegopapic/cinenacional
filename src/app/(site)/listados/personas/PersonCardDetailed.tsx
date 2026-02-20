// src/app/(site)/listados/personas/PersonCardDetailed.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { PersonWithMovie } from '@/lib/people/personListTypes';
import { formatPersonName, formatPartialDate } from '@/lib/people/personListUtils';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface PersonCardDetailedProps {
  person: PersonWithMovie;
}

export default function PersonCardDetailed({ person }: PersonCardDetailedProps) {
  const personName = formatPersonName(person);
  const photoUrl = getPersonPhotoUrl(person.photoUrl, 'sm');

  const birthDateFormatted = formatPartialDate(
    person.birthYear,
    person.birthMonth,
    person.birthDay
  );

  const birthLocationFormatted = (person as any).birthLocationPath || null;
  const deathLocationFormatted = (person as any).deathLocationPath || null;

  const isDeceased = !!person.deathYear;

  const getActorLabel = () => {
    if (person.gender === 'FEMALE') return 'Actriz';
    if (person.gender === 'MALE') return 'Actor';
    return 'Actor/Actriz';
  };

  const getFeaturedRole = () => {
    if (!person.featuredMovie) return null;
    if (person.featuredMovie.role === 'Actor') {
      return getActorLabel();
    }
    return person.featuredMovie.role;
  };

  return (
    <div className="flex gap-4 border-b border-border/10 py-4 last:border-b-0 md:gap-5">
      {/* Portrait rectangular */}
      <Link href={`/persona/${person.slug}`} className="group relative h-28 w-20 shrink-0 overflow-hidden rounded-sm md:h-32 md:w-24">
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
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Nombre */}
        <h3 className="text-[14px] font-medium leading-snug md:text-[15px]">
          <Link href={`/persona/${person.slug}`} className="text-foreground/80 transition-colors hover:text-accent">
            {personName}
          </Link>
        </h3>

        {/* Nacimiento */}
        {(birthDateFormatted || birthLocationFormatted) && (
          <p className="text-[12px] leading-snug text-muted-foreground/50">
            {birthDateFormatted && <span>Naci&oacute; el {birthDateFormatted}</span>}
            {birthLocationFormatted && (
              <span className="text-muted-foreground/40">
                {birthDateFormatted ? ' en ' : ''}{birthLocationFormatted}
              </span>
            )}
          </p>
        )}

        {/* Muerte */}
        {isDeceased && (
          <p className="text-[12px] leading-snug text-muted-foreground/50">
            Falleci&oacute; el {formatPartialDate(person.deathYear, person.deathMonth, person.deathDay)}
            {deathLocationFormatted && (
              <span className="text-muted-foreground/40"> en {deathLocationFormatted}</span>
            )}
          </p>
        )}

        {/* Crédito ejemplo */}
        {person.featuredMovie && (
          <p className="text-[12px] text-muted-foreground/40">
            {getFeaturedRole()}
            {' en '}
            <Link href={`/pelicula/${person.featuredMovie.slug}`} className="transition-colors hover:text-accent">
              {person.featuredMovie.title}
            </Link>
            {person.featuredMovie.year && (
              <span> ({person.featuredMovie.year})</span>
            )}
          </p>
        )}

        {/* Films */}
        {person.movieCount !== undefined && person.movieCount > 0 && (
          <p className="text-[11px] text-muted-foreground/35">
            {person.movieCount} pel&iacute;cula{person.movieCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
