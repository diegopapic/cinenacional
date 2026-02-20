// src/components/movies/CastSection.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface CastMember {
  name: string;
  character: string;
  image?: string;
  personId?: number;
  personSlug?: string;
  isPrincipal?: boolean;
  billingOrder?: number;
  creditedAs?: string | null;
  gender?: string | null;
}

interface CastSectionProps {
  mainCast: CastMember[];
  fullCast?: CastMember[];
}

function getCreditedLabel(gender?: string | null): string {
  return gender === 'FEMALE' ? 'Acreditada' : 'Acreditado';
}

export function CastSection({ mainCast, fullCast = [] }: CastSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const allCast = [...mainCast, ...fullCast];

  if (allCast.length === 0) return null;

  // Colapsado: solo actores principales. Expandido: todo el cast.
  const hasMore = fullCast.length > 0;
  const visible = expanded ? allCast : mainCast;

  const toggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setExpanded(prev => !prev);
      setTimeout(() => setIsAnimating(false), 20);
    }, 150);
  };

  // Render actor card content (shared between mobile and desktop)
  const renderActorPhoto = (actor: CastMember, size: 'sm' | 'md') => {
    const sizeClasses = size === 'sm'
      ? 'h-20 w-20'
      : 'h-28 w-28';

    return (
      <div className={`relative ${sizeClasses} overflow-hidden rounded-full ring-1 ring-border/20 group-hover:ring-accent/40 transition-all`}>
        {actor.image ? (
          <img
            src={getPersonPhotoUrl(actor.image, 'sm')!}
            alt={actor.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <svg className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} text-muted-foreground/30`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
        )}
      </div>
    );
  };

  const renderActorInfo = (actor: CastMember, variant: 'mobile' | 'desktop') => {
    const nameClass = variant === 'mobile'
      ? 'text-[12px] font-medium leading-tight text-foreground/80 group-hover:text-accent'
      : 'text-[13px] font-medium leading-tight text-foreground/80 group-hover:text-accent';
    const charClass = variant === 'mobile'
      ? 'text-[10px] leading-tight text-muted-foreground/50'
      : 'text-[11px] leading-tight text-muted-foreground/50';
    const creditClass = variant === 'mobile'
      ? 'text-[9px] italic leading-tight text-muted-foreground/30'
      : 'text-[10px] italic leading-tight text-muted-foreground/30';

    return (
      <>
        <p className={nameClass}>{actor.name}</p>
        {actor.character && (
          <p className={charClass}>{actor.character}</p>
        )}
        {actor.creditedAs && (
          <p className={creditClass}>
            {getCreditedLabel(actor.gender)} como: {actor.creditedAs}
          </p>
        )}
      </>
    );
  };

  const renderActorItem = (actor: CastMember, index: number, variant: 'mobile' | 'desktop-collapsed' | 'desktop-expanded') => {
    const photoSize = variant === 'mobile' ? 'sm' : 'md' as const;

    const itemClasses = {
      'mobile': 'group flex flex-col items-center gap-2',
      'desktop-collapsed': 'group flex w-28 flex-col items-center gap-3',
      'desktop-expanded': 'group flex flex-col items-center gap-3',
    }[variant];

    const infoVariant = variant === 'mobile' ? 'mobile' : 'desktop' as const;

    const content = (
      <>
        {renderActorPhoto(actor, photoSize)}
        <div className="text-center">
          {renderActorInfo(actor, infoVariant)}
        </div>
      </>
    );

    if (actor.personSlug) {
      return (
        <Link
          key={`cast-${index}`}
          href={`/persona/${actor.personSlug}`}
          className={itemClasses}
        >
          {content}
        </Link>
      );
    }

    return (
      <div key={`cast-${index}`} className={itemClasses}>
        {content}
      </div>
    );
  };

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Intérpretes</h2>
        {hasMore && (
          <button
            onClick={toggle}
            className="shrink-0 text-xs tracking-wide text-muted-foreground/50 transition-colors hover:text-accent"
          >
            {expanded ? 'Ver menos' : 'Ver todos'}
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-border/30 pt-5 md:mt-6 md:pt-6">
        <div
          className="transition-opacity duration-150"
          style={{ opacity: isAnimating ? 0 : 1 }}
        >
          {/* MOBILE */}
          <div className="grid grid-cols-3 gap-4 md:hidden">
            {visible.map((actor, i) => renderActorItem(actor, i, 'mobile'))}
          </div>

          {/* DESKTOP collapsed */}
          {!expanded && (
            <div className="hidden md:flex md:flex-wrap md:gap-8">
              {visible.map((actor, i) => renderActorItem(actor, i, 'desktop-collapsed'))}
            </div>
          )}

          {/* DESKTOP expanded */}
          {expanded && (
            <div className="hidden md:grid md:grid-cols-4 md:gap-6 lg:grid-cols-6 lg:gap-8">
              {visible.map((actor, i) => renderActorItem(actor, i, 'desktop-expanded'))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
