import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'

interface PersonReview {
  id: number
  title?: string | null
  summary?: string | null
  url?: string | null
  content?: string | null
  publishYear?: number | null
  publishMonth?: number | null
  publishDay?: number | null
  movie: {
    slug: string
    title: string
    year?: number | null
    releaseYear?: number | null
    crew: { person: { firstName?: string | null; lastName?: string | null } }[]
  }
  mediaOutlet?: { name: string } | null
}

interface PersonReviewsProps {
  reviews: PersonReview[]
}

function formatPublishDate(year?: number | null, month?: number | null, day?: number | null): string | null {
  if (!year) return null
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  if (day && month) return `${day} de ${months[month - 1]} de ${year}`
  if (month) return `${months[month - 1]} de ${year}`
  return String(year)
}

export function PersonReviews({ reviews }: PersonReviewsProps) {
  if (reviews.length === 0) return null

  return (
    <section className="py-12 border-t border-border/10">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">
          Críticas
        </h2>

        <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
          <div className="flex flex-col gap-5">
            {reviews.map((review) => {
              const movieYear = review.movie.releaseYear || review.movie.year
              const director = review.movie.crew[0]
              const directorName = director
                ? [director.person.firstName, director.person.lastName].filter(Boolean).join(' ')
                : null
              const publishDate = formatPublishDate(review.publishYear, review.publishMonth, review.publishDay)

              return (
                <article key={review.id} className="flex flex-col gap-1.5">
                  {/* Película */}
                  <div>
                    <Link
                      href={`/pelicula/${review.movie.slug}`}
                      className="text-[13px] font-medium leading-snug text-foreground/90 hover:text-accent transition-colors md:text-sm"
                    >
                      {review.movie.title}
                      {movieYear ? ` (${movieYear})` : ''}
                    </Link>
                  </div>

                  {/* Metadata: director, medio, fecha */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {directorName && (
                      <span className="text-[12px] text-muted-foreground/60 md:text-[13px]">
                        Dir: {directorName}
                      </span>
                    )}

                    {directorName && review.mediaOutlet && (
                      <span className="text-[12px] text-muted-foreground/30 md:text-[13px]">·</span>
                    )}

                    {review.mediaOutlet && (
                      <span className="text-[12px] italic text-muted-foreground/60 md:text-[13px]">
                        {review.mediaOutlet.name}
                      </span>
                    )}

                    {(directorName || review.mediaOutlet) && publishDate && (
                      <span className="text-[12px] text-muted-foreground/30 md:text-[13px]">·</span>
                    )}

                    {publishDate && (
                      <span className="text-[12px] text-muted-foreground/40 md:text-[13px]">
                        {publishDate}
                      </span>
                    )}
                  </div>

                  {/* Resumen */}
                  {review.summary && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground/60 md:text-sm">
                      {review.summary}
                    </p>
                  )}

                  {/* Link a la crítica */}
                  {(review.url || review.content) && (
                    review.content ? (
                      <Link
                        href={`/pelicula/${review.movie.slug}/criticas/${review.id}`}
                        className="inline-flex items-center gap-1 text-[12px] text-accent/80 hover:text-accent transition-colors md:text-[13px]"
                      >
                        Leé la crítica
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : review.url ? (
                      <a
                        href={review.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-accent/80 hover:text-accent transition-colors md:text-[13px]"
                      >
                        Leé la crítica
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
