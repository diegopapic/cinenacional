// src/components/movies/ReviewsSection.tsx
'use client';

import Link from 'next/link';
import { ExternalLink, Lock, Star } from 'lucide-react';

interface ReviewAuthor {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  slug: string;
}

interface ReviewMediaOutlet {
  id: number;
  name: string;
  url?: string | null;
}

interface Review {
  id: number;
  title?: string | null;
  summary?: string | null;
  url?: string | null;
  content?: string | null;
  language: string;
  hasPaywall: boolean;
  score?: number | null;
  publishYear?: number | null;
  publishMonth?: number | null;
  publishDay?: number | null;
  author?: ReviewAuthor | null;
  mediaOutlet?: ReviewMediaOutlet | null;
}

interface ReviewsSectionProps {
  reviews: Review[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Castellano',
  en: 'Inglés',
  pt: 'Portugués',
  fr: 'Francés',
  it: 'Italiano',
  de: 'Alemán'
};

function formatAuthorName(author: ReviewAuthor): string {
  return `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Sin nombre';
}

function formatPublishDate(year?: number | null, month?: number | null, day?: number | null): string | null {
  if (!year) return null;

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  if (day && month) {
    return `${day} de ${months[month - 1]} de ${year}`;
  }
  if (month) {
    return `${months[month - 1]} de ${year}`;
  }
  return String(year);
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <div>
      <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">
        Críticas
      </h2>

      <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
        <div className="flex flex-col gap-5">
          {reviews.map((review) => {
            const authorName = review.author ? formatAuthorName(review.author) : null;
            const publishDate = formatPublishDate(review.publishYear, review.publishMonth, review.publishDay);
            const languageLabel = review.language !== 'es' ? LANGUAGE_LABELS[review.language] || review.language.toUpperCase() : null;

            return (
              <article key={review.id} className="flex flex-col gap-1.5">
                {/* Línea principal: título o medio/autor */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Puntaje + Título */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {review.score && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 relative -top-px" />
                          <span className="text-yellow-500/90">{review.score}/10</span>
                        </span>
                      )}
                      {review.title ? (
                        review.url ? (
                          <a
                            href={review.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium leading-snug text-foreground/90 hover:text-accent transition-colors md:text-sm"
                          >
                            {review.title}
                          </a>
                        ) : (
                          <span className="text-[13px] font-medium leading-snug text-foreground/90 md:text-sm">
                            {review.title}
                          </span>
                        )
                      ) : review.url ? (
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[13px] leading-snug text-foreground/70 hover:text-accent transition-colors md:text-sm"
                        >
                          Ver crítica
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null}

                      {review.hasPaywall && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40" title="Detrás de paywall">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Metadata: autor, medio, fecha, idioma */}
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {authorName && (
                        review.author?.slug ? (
                          <Link
                            href={`/persona/${review.author.slug}`}
                            className="text-[12px] text-muted-foreground/60 hover:text-accent transition-colors md:text-[13px]"
                          >
                            {authorName}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/60 md:text-[13px]">
                            {authorName}
                          </span>
                        )
                      )}

                      {authorName && review.mediaOutlet && (
                        <span className="text-[12px] text-muted-foreground/30 md:text-[13px]">·</span>
                      )}

                      {review.mediaOutlet && (
                        review.mediaOutlet.url ? (
                          <a
                            href={review.mediaOutlet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-muted-foreground/60 hover:text-accent transition-colors md:text-[13px]"
                          >
                            {review.mediaOutlet.name}
                          </a>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/60 md:text-[13px]">
                            {review.mediaOutlet.name}
                          </span>
                        )
                      )}

                      {(authorName || review.mediaOutlet) && publishDate && (
                        <span className="text-[12px] text-muted-foreground/30 md:text-[13px]">·</span>
                      )}

                      {publishDate && (
                        <span className="text-[12px] text-muted-foreground/40 md:text-[13px]">
                          {publishDate}
                        </span>
                      )}

                      {languageLabel && (
                        <>
                          <span className="text-[12px] text-muted-foreground/30 md:text-[13px]">·</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px]">
                            {languageLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumen */}
                {review.summary && (
                  <p className="text-[13px] leading-relaxed text-muted-foreground/60 md:text-sm">
                    {review.summary}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
