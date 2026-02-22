// src/components/movies/FilmTechnical.tsx
'use client';

import Link from 'next/link';

interface FilmTechnicalProps {
  year?: number | null;
  duration: number;
  rating?: { id: number; name: string; abbreviation?: string | null } | null;
  countries?: Array<{ id: number; name: string }>;
  releaseDate?: {
    day: number | null;
    month: number | null;
    year: number | null;
  } | null;
  premiereVenues?: string;
  genres: Array<{ id: number; name: string }>;
  themes: Array<{ id: number; name: string; slug?: string }>;
  colorType?: { id: number; name: string } | null;
  soundType?: string | null;
  productionType?: string | null;
}

const months = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function FilmTechnical({
  year,
  duration,
  rating,
  countries = [],
  releaseDate,
  premiereVenues,
  genres,
  themes,
  colorType,
  soundType,
  productionType,
}: FilmTechnicalProps) {

  // Helper: color label
  const getColorLabel = () => {
    if (!colorType || colorType.id === 12) return null;
    if (colorType.name === 'COLOR') return 'Color';
    if (colorType.name === 'BLACK_AND_WHITE') return 'Blanco y Negro';
    if (colorType.name === 'MIXED') return 'Mixto';
    return colorType.name;
  };

  // Helper: sound label
  const getSoundLabel = () => {
    if (!soundType) return null;
    return soundType === 'SOUND' || soundType === 'Sonora' ? 'Sonora' : 'Muda';
  };

  // Estreno
  const hasCompleteReleaseDate = releaseDate?.day && releaseDate?.month && releaseDate?.year;

  const formatEstreno = () => {
    if (!hasCompleteReleaseDate) return null;
    const dayMonth = `${releaseDate!.day} de ${months[releaseDate!.month! - 1]} de ${releaseDate!.year}`;
    return dayMonth;
  };

  const estrenoText = formatEstreno();

  // Efemerides URL
  const getEfemeridesUrl = () => {
    if (!releaseDate?.day || !releaseDate?.month) return null;
    const monthStr = String(releaseDate.month).padStart(2, '0');
    const dayStr = String(releaseDate.day).padStart(2, '0');
    return `/efemerides/${monthStr}-${dayStr}`;
  };

  const getEstrenosYearUrl = () => {
    if (!releaseDate?.year) return null;
    const decade = Math.floor(releaseDate.year / 10) * 10;
    return `/listados/estrenos?period=${decade}s&year=${releaseDate.year}`;
  };

  const colorLabel = getColorLabel();
  const soundLabel = getSoundLabel();
  const ratingAbbreviation = rating?.abbreviation || rating?.name;
  const hasCoproduction = countries.filter(c => c.name !== 'Argentina').length > 0;
  const coproductionCountries = countries.filter(c => c.name !== 'Argentina');

  // Format duration
  const formatDuration = () => {
    if (!duration || duration === 0) return null;
    return `${duration} min`;
  };

  const durationText = formatDuration();

  // Label + value helper
  const renderDataItem = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
        {label}
      </span>
      <span className="text-[13px] leading-snug text-foreground/80 md:text-sm">
        {value}
      </span>
    </div>
  );

  return (
    <div>
      {/* Section header */}
      <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Ficha técnica</h2>

      <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
        {/* Data items */}
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-3">
          {year && renderDataItem('Año', year)}
          {durationText
            ? renderDataItem('Duración', durationText)
            : productionType && renderDataItem('Tipo', productionType.charAt(0).toUpperCase() + productionType.slice(1))
          }
          {ratingAbbreviation && renderDataItem('Calificación', (
            <Link
              href={`/listados/peliculas?ratingId=${rating?.id}`}
              className="text-foreground/80 transition-colors hover:text-accent"
              title={rating?.name}
            >
              {ratingAbbreviation}
            </Link>
          ))}

          {/* Coproducción (conditional) */}
          {hasCoproduction && renderDataItem('Coproducción con', (
            <>
              {coproductionCountries.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && (
                    <span className="text-muted-foreground/40">
                      {i === coproductionCountries.length - 1 ? ' y ' : ', '}
                    </span>
                  )}
                  <Link
                    href={`/listados/peliculas?countryId=${c.id}`}
                    className="text-foreground/80 transition-colors hover:text-accent"
                  >
                    {c.name}
                  </Link>
                </span>
              ))}
            </>
          ))}

          {/* Estreno (conditional) */}
          {estrenoText && (() => {
            const efemeridesUrl = getEfemeridesUrl();
            const estrenosYearUrl = getEstrenosYearUrl();
            return renderDataItem('Estreno en Argentina', (
              <>
                {efemeridesUrl ? (
                  <Link href={efemeridesUrl} className="text-foreground/80 transition-colors hover:text-accent">
                    {releaseDate!.day} de {months[releaseDate!.month! - 1]}
                  </Link>
                ) : (
                  <span>{releaseDate!.day} de {months[releaseDate!.month! - 1]}</span>
                )}
                {' de '}
                {estrenosYearUrl ? (
                  <Link href={estrenosYearUrl} className="text-foreground/80 transition-colors hover:text-accent">
                    {releaseDate!.year}
                  </Link>
                ) : (
                  <span>{releaseDate!.year}</span>
                )}
                {premiereVenues && (
                  <span className="text-muted-foreground/40"> en {premiereVenues}</span>
                )}
              </>
            ));
          })()}
        </div>

        {/* Badges: genres (outline) + sound/color (filled) */}
        {(genres.length > 0 || colorLabel || soundLabel) && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/listados/peliculas?genreId=${g.id}`}
                className="border border-border/40 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:border-accent/40 hover:text-accent transition-colors"
              >
                {g.name}
              </Link>
            ))}
            {colorLabel && (
              <span className="rounded-full bg-muted/40 px-3 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/40">
                {colorLabel}
              </span>
            )}
            {soundLabel && (
              <span className="rounded-full bg-muted/40 px-3 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/40">
                {soundLabel}
              </span>
            )}
          </div>
        )}

        {/* Keywords / Themes */}
        {themes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
              Temas
            </span>
            {themes.map((t, i) => (
              <span key={t.id}>
                {i > 0 && <span className="text-muted-foreground/20">, </span>}
                <Link
                  href={`/listados/peliculas?themeId=${t.id}`}
                  className="text-[13px] text-foreground/80 transition-colors hover:text-accent md:text-sm"
                >
                  {t.name}
                </Link>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
