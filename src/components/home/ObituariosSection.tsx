// src/components/home/ObituariosSection.tsx
import Link from 'next/link';
import { formatPartialDate, calculateYearsBetween } from '@/lib/shared/dateUtils';

interface ObituariosSectionProps {
  obituarios: any[];
  loading?: boolean;
  noPadding?: boolean;
}

export default function ObituariosSection({ obituarios, loading = false, noPadding }: ObituariosSectionProps) {
  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
            Obituarios
          </h2>
        </div>
        <div className="mt-5 md:mt-6 border-t border-border/30 pt-5 md:pt-6">
          <div className="flex flex-col gap-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4 border-b border-border/10 py-3 last:border-b-0">
                <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-full bg-muted/30 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted/30 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si no hay obituarios, no mostrar la sección
  if (!obituarios || obituarios.length === 0) {
    return null;
  }

  // Función para calcular la edad al fallecer
  const calcularEdad = (person: any) => {
    if (!person.birthYear || !person.deathYear) {
      return null;
    }

    const birthDate = {
      year: person.birthYear,
      month: person.birthMonth,
      day: person.birthDay
    };

    const deathDate = {
      year: person.deathYear,
      month: person.deathMonth,
      day: person.deathDay
    };

    return calculateYearsBetween(birthDate, deathDate);
  };

  // Función para formatear el nombre completo
  const formatearNombre = (person: any) => {
    const parts = [];
    if (person.firstName) parts.push(person.firstName);
    if (person.lastName) parts.push(person.lastName);
    return parts.join(' ') || 'Sin nombre';
  };

  const content = (
    <>
      {/* Encabezado de sección */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
          Obituarios
        </h2>
        <Link
          href="/listados/obituarios"
          className="shrink-0 text-[12px] md:text-[13px] tracking-wide text-muted-foreground/40 transition-colors hover:text-accent"
        >
          Ver más
        </Link>
      </div>

      {/* Separador */}
      <div className="mt-5 md:mt-6 border-t border-border/30 pt-5 md:pt-6">
        <div className="flex flex-col gap-0">
          {obituarios.map((persona, index) => {
            const edad = calcularEdad(persona);

            return (
              <Link
                key={persona.id}
                href={`/persona/${persona.slug}`}
                className={`group flex items-center gap-3 md:gap-4 border-b border-border/10 py-3 ${
                  index === obituarios.length - 1 ? 'border-b-0' : ''
                }`}
              >
                {/* Retrato circular */}
                <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-full">
                  {persona.photoUrl ? (
                    <img
                      src={persona.photoUrl}
                      alt={formatearNombre(persona)}
                      className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/20">
                      <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {/* Borde sutil overlay */}
                  <div className="absolute inset-0 rounded-full border border-foreground/[0.04]" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] md:text-sm font-medium text-foreground/80 transition-colors group-hover:text-accent">
                    {formatearNombre(persona)}
                    {persona.birthYear && persona.deathYear && (
                      <span className="ml-1.5 font-normal text-muted-foreground/25">
                        ({persona.birthYear}–{persona.deathYear})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] md:text-[12px] text-muted-foreground/40">
                    {edad ? `${edad} años` : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );

  if (noPadding) {
    return <section>{content}</section>;
  }

  return (
    <section>
      {content}
    </section>
  );
}
