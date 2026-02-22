import Link from 'next/link';
import Image from 'next/image';
import { Efemeride, DirectorInfo } from '@/types/home.types';
import { getPersonPhotoUrl } from '@/lib/images/imageUtils';

interface EfemeridesSectionProps {
  efemerides: Efemeride[];
  noPadding?: boolean;
}

/**
 * Renderiza los links de directores
 * Si hay múltiples directores, los separa con comas y "y"
 */
function renderDirectorLinks(item: Efemeride) {
  const directors = item.directors;

  // Si hay array de directores, usarlo
  if (directors && directors.length > 0) {
    if (directors.length === 1) {
      return (
        <Link
          href={`/persona/${directors[0].slug}`}
          className="text-foreground/80 transition-colors hover:text-accent"
        >
          {directors[0].name}
        </Link>
      );
    }

    if (directors.length === 2) {
      return (
        <>
          <Link
            href={`/persona/${directors[0].slug}`}
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            {directors[0].name}
          </Link>
          {' y '}
          <Link
            href={`/persona/${directors[1].slug}`}
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            {directors[1].name}
          </Link>
        </>
      );
    }

    // 3 o más directores: "A, B y C"
    return (
      <>
        {directors.slice(0, -1).map((director, index) => (
          <span key={director.slug}>
            <Link
              href={`/persona/${director.slug}`}
              className="text-foreground/80 transition-colors hover:text-accent"
            >
              {director.name}
            </Link>
            {index < directors.length - 2 ? ', ' : ' '}
          </span>
        ))}
        {'y '}
        <Link
          href={`/persona/${directors[directors.length - 1].slug}`}
          className="text-foreground/80 transition-colors hover:text-accent"
        >
          {directors[directors.length - 1].name}
        </Link>
      </>
    );
  }

  // Fallback al campo director/directorSlug único (compatibilidad)
  if (item.director && item.directorSlug) {
    return (
      <Link
        href={`/persona/${item.directorSlug}`}
        className="text-foreground/80 transition-colors hover:text-accent"
      >
        {item.director}
      </Link>
    );
  }

  // Si solo hay nombre pero no slug
  if (item.director) {
    return <span>{item.director}</span>;
  }

  return null;
}

export default function EfemeridesSection({ efemerides, noPadding }: EfemeridesSectionProps) {
  const renderEvento = (item: Efemeride) => {
    const directorLinks = renderDirectorLinks(item);
    const hasDirector = item.directors?.length || item.director;

    if (item.tipo === 'pelicula') {
      switch (item.tipoEvento) {
        case 'estreno':
          return (
            <>
              Se estrenó{' '}
              {item.slug ? (
                <Link
                  href={`/pelicula/${item.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        case 'inicio_rodaje':
          return (
            <>
              Empezó el rodaje de{' '}
              {item.slug ? (
                <Link
                  href={`/pelicula/${item.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        case 'fin_rodaje':
          return (
            <>
              Terminó el rodaje de{' '}
              {item.slug ? (
                <Link
                  href={`/pelicula/${item.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        default:
          return <span>{item.evento}</span>;
      }
    } else if (item.tipo === 'persona') {
      switch (item.tipoEvento) {
        case 'nacimiento':
          return (
            <>
              Nació{' '}
              {item.slug ? (
                <Link
                  href={`/persona/${item.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
            </>
          );
        case 'muerte':
          return (
            <>
              Murió{' '}
              {item.slug ? (
                <Link
                  href={`/persona/${item.slug}`}
                  className="text-foreground/80 transition-colors hover:text-accent"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
            </>
          );
        default:
          return <span>{item.evento}</span>;
      }
    }

    // Fallback al texto original si no hay tipoEvento
    return <span>{item.evento}</span>;
  };

  // Calcular el año del evento a partir de "Hace X años"
  const getYear = (item: Efemeride): string => {
    if (item.fecha) {
      const fecha = new Date(item.fecha);
      if (!isNaN(fecha.getTime())) {
        return fecha.getFullYear().toString();
      }
    }
    const match = item.hace?.match(/\d+/);
    if (match) {
      const yearsAgo = parseInt(match[0], 10);
      const currentYear = new Date().getFullYear();
      return (currentYear - yearsAgo).toString();
    }
    return '';
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

  const content = (
    <>
      {/* Encabezado de sección */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground">
          Efemérides
          <span className="ml-2 font-sans text-sm md:text-base font-normal text-muted-foreground/40">
            {dateString}
          </span>
        </h2>
        <Link
          href="/efemerides"
          className="shrink-0 text-[12px] md:text-[13px] tracking-wide text-muted-foreground/40 transition-colors hover:text-accent"
        >
          Ver más
        </Link>
      </div>

      {/* Separador */}
      <div className="mt-5 md:mt-6 border-t border-border/30 pt-5 md:pt-6">
        {efemerides.length > 0 ? (
          <div className="flex flex-col gap-0">
            {efemerides.map((item, index) => {
              const imageUrl = item.tipo === 'pelicula' ? item.posterUrl : getPersonPhotoUrl(item.photoUrl, 'sm');
              const isRound = item.tipo === 'persona';
              const linkHref = item.slug
                ? item.tipo === 'pelicula' ? `/pelicula/${item.slug}` : `/persona/${item.slug}`
                : null;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 md:gap-4 border-b border-border/10 py-3 ${
                    index === efemerides.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  {/* Imagen: afiche (aspect 2:3, centrado) o retrato (circular) */}
                  {linkHref ? (
                    <Link href={linkHref} className="shrink-0 flex items-center justify-center w-16 md:w-20">
                      <div className={`relative overflow-hidden ${
                        isRound
                          ? 'h-16 w-16 md:h-20 md:w-20 rounded-full'
                          : 'h-16 md:h-20 aspect-[2/3] rounded-sm'
                      }`}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.titulo || ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted/20">
                            {isRound ? (
                              <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className={`absolute inset-0 ${isRound ? 'rounded-full' : 'rounded-sm'} border border-foreground/[0.04]`} />
                      </div>
                    </Link>
                  ) : (
                    <div className="shrink-0 flex items-center justify-center w-16 md:w-20">
                      <div className={`relative overflow-hidden ${
                        isRound
                          ? 'h-16 w-16 md:h-20 md:w-20 rounded-full'
                          : 'h-16 md:h-20 aspect-[2/3] rounded-sm'
                      }`}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.titulo || ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted/20">
                            <svg className="h-6 w-6 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                        )}
                        <div className={`absolute inset-0 ${isRound ? 'rounded-full' : 'rounded-sm'} border border-foreground/[0.04]`} />
                      </div>
                    </div>
                  )}

                  {/* Año + texto */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] md:text-[12px] tabular-nums text-muted-foreground/35">
                      {getYear(item)}
                    </p>
                    <p className="text-[13px] md:text-sm leading-snug text-muted-foreground/50">
                      {renderEvento(item)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground/40">
            No hay efemérides para la fecha
          </p>
        )}
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
