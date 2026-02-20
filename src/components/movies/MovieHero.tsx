'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, X } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { BACKGROUND_PLACEHOLDER, POSTER_PLACEHOLDER } from '@/lib/movies/movieConstants';

interface Director {
  id: number;
  name: string;
  slug: string;
}

interface MovieHeroProps {
  title: string;
  year: number | null;
  duration: number;
  genres: Array<{ id: number; name: string }>;
  posterUrl?: string | null;
  premiereVenues: string;
  releaseDate?: {
    day: number | null;
    month: number | null;
    year: number | null;
  } | null;
  rating?: {
    id: number;
    name: string;
    abbreviation?: string | null;
  } | null;
  heroBackgroundImage?: string | null;
  synopsis?: string | null;
  countries?: Array<{ id: number; name: string }>;
  trailerUrl?: string | null;
  colorType?: { id: number; name: string } | null;
  soundType?: string | null;
  stage?: string | null;
  directors?: Director[];
  productionType?: string | null;
}

// Extraer YouTube ID
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Traducir stage a español
function getStageLabel(stage: string): string | null {
  const labels: Record<string, string> = {
    EN_DESARROLLO: 'En desarrollo',
    EN_PREPRODUCCION: 'En preproducción',
    EN_RODAJE: 'En rodaje',
    EN_POSTPRODUCCION: 'En postproducción',
    INCONCLUSA: 'Inconclusa',
    INEDITA: 'Inédita',
  };
  return labels[stage] || null;
}

export function MovieHero({
  title,
  year,
  duration,
  genres,
  posterUrl,
  premiereVenues,
  releaseDate,
  rating,
  heroBackgroundImage,
  synopsis,
  countries = [],
  trailerUrl,
  colorType,
  soundType,
  stage,
  directors = [],
  productionType,
}: MovieHeroProps) {
  const [heroImageError, setHeroImageError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const hasValidHeroImage = heroBackgroundImage && heroBackgroundImage.trim() !== '' && !heroImageError;

  // Meses
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const hasCompleteReleaseDate = releaseDate?.day && releaseDate?.month && releaseDate?.year;

  const formatDayMonth = () => {
    if (!releaseDate?.day || !releaseDate?.month) return null;
    return `${releaseDate.day} de ${months[releaseDate.month - 1]}`;
  };

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

  const dayMonthText = formatDayMonth();
  const efemeridesUrl = getEfemeridesUrl();
  const estrenosYearUrl = getEstrenosYearUrl();
  const displayYear = year || releaseDate?.year;
  const ratingAbbreviation = rating?.abbreviation || rating?.name;

  // Badge de tipo de producción (solo si no es largometraje)
  const productionTypeLabel = productionType && productionType.toLowerCase() !== 'largometraje'
    ? productionType
    : null;

  // Badge de estado de producción (solo si no es COMPLETA)
  const stageLabel = stage && stage !== 'COMPLETA' ? getStageLabel(stage) : null;

  // Sanitizar sinopsis
  const sanitizedSynopsis = synopsis
    ? DOMPurify.sanitize(synopsis, {
        ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'b', 'i', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        ADD_ATTR: ['target'],
      })
    : null;

  // YouTube
  const videoId = trailerUrl ? getYouTubeId(trailerUrl) : null;

  const openTrailer = useCallback(() => {
    if (videoId) {
      setTrailerOpen(true);
      document.body.style.overflow = 'hidden';
    } else if (trailerUrl) {
      window.open(trailerUrl, '_blank');
    }
  }, [videoId, trailerUrl]);

  const closeTrailer = useCallback(() => {
    setTrailerOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  // Escape cierra modal
  useEffect(() => {
    if (!trailerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTrailer();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [trailerOpen, closeTrailer]);

  const showPosterPlaceholder = !posterUrl || posterError;

  // Render poster image
  const renderPoster = (className: string) => (
    <div className={className}>
      <img
        src={posterUrl || POSTER_PLACEHOLDER.cloudinaryUrl}
        alt={`Poster de ${title}`}
        className="h-full w-full object-cover"
        style={{ filter: showPosterPlaceholder ? 'brightness(0.4)' : 'none' }}
        onError={() => setPosterError(true)}
      />
    </div>
  );

  // Render genre badges inline
  const renderGenres = (mobile = false) => {
    if (genres.length === 0) return null;
    return genres.map((g) => (
      <Link
        key={g.id}
        href={`/listados/peliculas?genreId=${g.id}`}
        className="border border-border/40 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:border-accent/40 hover:text-accent transition-colors"
      >
        {g.name}
      </Link>
    ));
  };

  // Format country list with proper separators: "A", "A y B", "A, B y C"
  const formatCountryList = (countryList: Array<{ id: number; name: string }>) => {
    return countryList.map((c, i) => (
      <span key={c.id}>
        {i > 0 && (
          <span className="text-muted-foreground/40">
            {i === countryList.length - 1 ? ' y ' : ', '}
          </span>
        )}
        <Link href={`/listados/peliculas?countryId=${c.id}`} className="text-foreground/80 transition-colors hover:text-accent">
          {c.name}
        </Link>
      </span>
    ));
  };

  // Render production type / status badges
  const renderBadges = () => {
    if (!productionTypeLabel && !stageLabel) return null;
    return (
      <div className="mb-3 flex flex-wrap gap-1.5">
        {productionTypeLabel && (
          <span className="rounded-sm bg-accent/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-accent/80">
            {productionTypeLabel}
          </span>
        )}
        {stageLabel && (
          <span className="rounded-sm bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-400/80">
            {stageLabel}
          </span>
        )}
      </div>
    );
  };

  // Render estreno info
  const renderEstreno = () => {
    if (!hasCompleteReleaseDate || !dayMonthText || !efemeridesUrl || !estrenosYearUrl) return null;
    return (
      <p className="text-[13px] text-muted-foreground/50">
        Estreno en Argentina:
        <Link href={efemeridesUrl} className="ml-1 text-foreground/80 transition-colors hover:text-accent">
          {dayMonthText}
        </Link>
        {' de '}
        <Link href={estrenosYearUrl} className="text-foreground/80 transition-colors hover:text-accent">
          {releaseDate?.year}
        </Link>
        {premiereVenues && <span className="text-muted-foreground/40"> en {premiereVenues}</span>}
      </p>
    );
  };

  // Render coproducción
  const renderCoproduction = () => {
    if (countries.length === 0) return null;
    return (
      <p className="text-sm text-muted-foreground/60 md:text-sm">
        <span className="text-muted-foreground/40">Coproducción con </span>
        {formatCountryList(countries)}
      </p>
    );
  };

  // Render trailer button
  const renderTrailerButton = (mobile = false) => {
    if (!trailerUrl) return null;
    return (
      <button
        onClick={openTrailer}
        className={`group inline-flex items-center border border-border/40 tracking-wide text-muted-foreground/70 transition-all hover:border-accent/40 hover:text-accent ${
          mobile
            ? 'w-fit gap-2 px-3.5 py-2 text-[13px]'
            : 'w-fit gap-2.5 px-4 py-2.5 text-sm'
        }`}
      >
        <Play className={`${mobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform group-hover:scale-110`} />
        Ver trailer
      </button>
    );
  };

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Background image */}
        {hasValidHeroImage ? (
          <>
            <img
              src={heroBackgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
              onError={() => setHeroImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${BACKGROUND_PLACEHOLDER.url})`,
              filter: 'brightness(0.15)',
            }}
          />
        )}

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 md:pb-10 md:pt-12 lg:px-6 lg:pb-12 lg:pt-16">

          {/* ===== MOBILE LAYOUT ===== */}
          <div className="md:hidden">
            {renderBadges()}

            <div className="flex gap-4">
              {/* Poster mobile */}
              {renderPoster('relative aspect-[2/3] w-32 shrink-0 overflow-hidden shadow-xl shadow-black/40')}

              {/* Info mobile */}
              <div className="flex min-w-0 flex-col gap-1.5 py-0.5">
                <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
                  {title}{displayYear ? ` (${displayYear})` : ''}
                </h1>

                {/* Director */}
                {directors.length > 0 && (
                  <p className="text-[13px] text-muted-foreground/70">
                    Dir.{' '}
                    {directors.map((d, i) => (
                      <span key={d.id}>
                        {i > 0 && ', '}
                        <Link href={`/persona/${d.slug}`} className="text-foreground/80 transition-colors hover:text-accent">
                          {d.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}

                {/* Runtime + Rating + Genres */}
                <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground/50">
                  {duration > 0 && <span>{duration} min</span>}
                  {duration > 0 && ratingAbbreviation && <span className="text-muted-foreground/20">|</span>}
                  {ratingAbbreviation && (
                    <Link href={`/listados/peliculas?ratingId=${rating?.id}`} className="transition-colors hover:text-accent" title={rating?.name}>
                      {ratingAbbreviation}
                    </Link>
                  )}
                  {(duration > 0 || ratingAbbreviation) && genres.length > 0 && <span className="text-muted-foreground/20">|</span>}
                  {renderGenres(true)}
                </div>

                {/* Estreno mobile */}
                <div className="mt-1.5">
                  {renderEstreno()}
                </div>

                {/* Coproduction mobile */}
                {renderCoproduction()}
              </div>
            </div>

            {/* Below fold mobile: synopsis, trailer */}
            <div className="mt-5 flex flex-col gap-4">

              {sanitizedSynopsis && (
                <div
                  className="text-[13px] leading-relaxed text-muted-foreground/70"
                  dangerouslySetInnerHTML={{ __html: sanitizedSynopsis }}
                />
              )}

              {renderTrailerButton(true)}
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT ===== */}
          <div className="hidden md:flex md:items-end md:gap-10 lg:gap-14">
            {/* Poster desktop */}
            {renderPoster('shrink-0 relative aspect-[2/3] w-56 lg:w-64 shadow-2xl shadow-black/50 overflow-hidden')}

            {/* Info desktop */}
            <div className="flex flex-1 flex-col gap-5">
              {/* Upper group */}
              <div className="flex flex-col gap-3">
                {renderBadges()}

                <h1 className="font-serif text-4xl tracking-tight text-foreground lg:text-5xl">
                  {title}{displayYear ? ` (${displayYear})` : ''}
                </h1>

                {/* Metadata inline + Genres */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground/70">
                  {directors.length > 0 && (
                    <span>
                      Dirigida por{' '}
                      {directors.map((d, i) => (
                        <span key={d.id}>
                          {i > 0 && ', '}
                          <Link href={`/persona/${d.slug}`} className="text-foreground/80 transition-colors hover:text-accent">
                            {d.name}
                          </Link>
                        </span>
                      ))}
                    </span>
                  )}
                  {directors.length > 0 && duration > 0 && <span className="text-muted-foreground/30" aria-hidden="true">|</span>}
                  {duration > 0 && <span>{duration} min</span>}
                  {duration > 0 && ratingAbbreviation && <span className="text-muted-foreground/30" aria-hidden="true">|</span>}
                  {ratingAbbreviation && (
                    <Link href={`/listados/peliculas?ratingId=${rating?.id}`} className="transition-colors hover:text-accent" title={rating?.name}>
                      {ratingAbbreviation}
                    </Link>
                  )}
                  {(duration > 0 || ratingAbbreviation) && genres.length > 0 && <span className="text-muted-foreground/30" aria-hidden="true">|</span>}
                  {renderGenres()}
                </div>

                {/* Estreno */}
                {renderEstreno()}

                {/* Coproducción */}
                {renderCoproduction()}
              </div>

              {/* Synopsis desktop */}
              {sanitizedSynopsis && (
                <div
                  className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80"
                  dangerouslySetInnerHTML={{ __html: sanitizedSynopsis }}
                />
              )}

              {/* Trailer button desktop */}
              {renderTrailerButton()}
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      {trailerOpen && videoId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          onClick={closeTrailer}
        >
          <button
            onClick={closeTrailer}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white"
            aria-label="Cerrar trailer"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="w-[90vw] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&color=white`}
                title={`Trailer de ${title}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
