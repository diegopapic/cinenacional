// src/components/home/RecentPeopleSection.tsx
import Link from 'next/link';
import { SimplePerson } from '@/types/home.types';
import SkeletonLoader from './SkeletonLoader';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface RecentPeopleSectionProps {
  people: SimplePerson[];
  loading: boolean;
}

export default function RecentPeopleSection({ people, loading }: RecentPeopleSectionProps) {
  const formatPersonName = (person: SimplePerson): string => {
    const parts = [];
    if (person.firstName) parts.push(person.firstName);
    if (person.lastName) parts.push(person.lastName);
    return parts.join(' ') || 'Sin nombre';
  };

  return (
    <section>
      {/* Encabezado de sección */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
          Últimas personas ingresadas
        </h2>
        <Link
          href="/listados/personas"
          className="shrink-0 text-[12px] md:text-[13px] tracking-wide text-muted-foreground/40 transition-colors hover:text-accent"
        >
          Ver más
        </Link>
      </div>

      {/* Separador */}
      <div className="mt-5 md:mt-6 border-t border-border/30 pt-5 md:pt-6">
        {loading ? (
          <>
            {/* Mobile skeleton */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:hidden">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="shrink-0 w-20">
                  <SkeletonLoader type="person" />
                </div>
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:grid grid-cols-8 lg:grid-cols-10 gap-5">
              {[...Array(10)].map((_, index) => (
                <SkeletonLoader key={index} type="person" />
              ))}
            </div>
          </>
        ) : people.length === 0 ? (
          <p className="text-[13px] text-muted-foreground/40">No hay personas recientes</p>
        ) : (
          <>
            {/* Mobile: scroll horizontal */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:hidden">
              {people.map((persona) => (
                <Link
                  key={persona.id}
                  href={`/persona/${persona.slug}`}
                  className="group shrink-0 text-center"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full shadow-lg shadow-black/30">
                    {persona.photoUrl ? (
                      <img
                        src={getPersonPhotoUrl(persona.photoUrl, 'sm')!}
                        alt={formatPersonName(persona)}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('bg-muted/20');
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted/20">
                        <svg className="h-8 w-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Borde sutil overlay */}
                    <div className="absolute inset-0 rounded-full border border-foreground/[0.04]" />
                  </div>
                  <p className="mt-2 w-20 truncate text-center text-[11px] font-medium text-foreground/80 group-hover:text-accent">
                    {formatPersonName(persona)}
                  </p>
                  <p className="w-20 text-center text-[10px] leading-tight text-muted-foreground/35">
                    {persona.role || 'Profesional del cine'}
                  </p>
                </Link>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden md:grid grid-cols-8 lg:grid-cols-10 gap-5">
              {people.map((persona) => (
                <Link
                  key={persona.id}
                  href={`/persona/${persona.slug}`}
                  className="group text-center"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-lg shadow-black/30">
                    {persona.photoUrl ? (
                      <img
                        src={getPersonPhotoUrl(persona.photoUrl, 'sm')!}
                        alt={formatPersonName(persona)}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('bg-muted/20');
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted/20">
                        <svg className="h-8 w-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Borde sutil overlay */}
                    <div className="absolute inset-0 rounded-full border border-foreground/[0.04]" />
                  </div>
                  <p className="mt-2.5 truncate text-center text-[12px] font-medium text-foreground/80 transition-colors group-hover:text-accent">
                    {formatPersonName(persona)}
                  </p>
                  <p className="text-center text-[11px] leading-tight text-muted-foreground/35">
                    {persona.role || 'Profesional del cine'}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
