interface ReviewForSchema {
  title?: string | null
  summary?: string | null
  score?: number | null
  publishYear?: number | null
  publishMonth?: number | null
  publishDay?: number | null
  author?: { firstName?: string | null; lastName?: string | null } | null
  mediaOutlet?: { name: string; url?: string | null } | null
}

interface MovieSchemaProps {
  title: string
  slug: string
  year?: number | null
  releaseMonth?: number | null
  releaseDay?: number | null
  duration?: number | null
  synopsis?: string | null
  posterUrl?: string | null
  rating?: { name: string; abbreviation?: string | null } | null
  genres: { name: string }[]
  directors: { name: string }[]
  cast: { name: string }[]
  countries: { name: string }[]
  alternativeTitles: { title: string }[]
  reviews?: ReviewForSchema[]
  imdbId?: string | null
  trailerUrl?: string | null
  links?: { type: string; url: string }[]
  productionCompanies?: { name: string }[]
}

function formatDurationISO(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`
  if (hours > 0) return `PT${hours}H`
  return `PT${mins}M`
}

const BASE_URL = 'https://cinenacional.com'

function formatReviewDate(year?: number | null, month?: number | null, day?: number | null): string | null {
  if (!year) return null
  const y = String(year)
  if (month && day) return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (month) return `${y}-${String(month).padStart(2, '0')}`
  return y
}

function formatAuthorName(author: { firstName?: string | null; lastName?: string | null }): string {
  const parts: string[] = []
  if (author.firstName) parts.push(author.firstName)
  if (author.lastName) parts.push(author.lastName)
  return parts.join(' ')
}

export function MovieSchema({
  title,
  slug,
  year,
  releaseMonth,
  releaseDay,
  duration,
  synopsis,
  posterUrl,
  rating,
  genres,
  directors,
  cast,
  countries,
  alternativeTitles,
  reviews = [],
  imdbId,
  trailerUrl,
  links = [],
  productionCompanies = [],
}: MovieSchemaProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title,
    url: `${BASE_URL}/pelicula/${slug}`,
  }

  if (year) {
    jsonLd.dateCreated = formatReviewDate(year, releaseMonth, releaseDay) || String(year)
  }

  jsonLd.inLanguage = 'es'

  // sameAs: IMDB + external links
  const sameAsUrls: string[] = []
  if (imdbId) sameAsUrls.push(`https://www.imdb.com/title/${imdbId}/`)
  for (const link of links) {
    if (link.url) sameAsUrls.push(link.url)
  }
  if (sameAsUrls.length > 0) {
    jsonLd.sameAs = sameAsUrls
  }

  // trailer
  if (trailerUrl) {
    const trailer: Record<string, unknown> = {
      '@type': 'VideoObject',
      name: `Trailer de ${title}`,
      url: trailerUrl,
    }
    // YouTube embed URL
    const ytMatch = trailerUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) {
      trailer.embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
      trailer.thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
    }
    jsonLd.trailer = trailer
  }

  // productionCompany
  if (productionCompanies.length > 0) {
    jsonLd.productionCompany = productionCompanies.map(c => ({
      '@type': 'Organization',
      name: c.name,
    }))
  }

  if (directors.length > 0) {
    jsonLd.director = directors.map(d => ({
      '@type': 'Person',
      name: d.name,
    }))
  }

  if (cast.length > 0) {
    jsonLd.actor = cast.map(a => ({
      '@type': 'Person',
      name: a.name,
    }))
  }

  if (duration && duration > 0) {
    jsonLd.duration = formatDurationISO(duration)
  }

  if (rating) {
    jsonLd.contentRating = rating.abbreviation || rating.name
  }

  if (genres.length > 0) {
    jsonLd.genre = genres.map(g => g.name)
  }

  if (posterUrl) {
    jsonLd.image = posterUrl.startsWith('http') ? posterUrl : `${BASE_URL}${posterUrl}`
  }

  if (synopsis) {
    jsonLd.description = synopsis
  }

  const argentina = { '@type': 'Country' as const, name: 'Argentina' }
  const otherCountries = countries
    .filter(c => c.name !== 'Argentina')
    .map(c => ({ '@type': 'Country' as const, name: c.name }))
  jsonLd.countryOfOrigin = [argentina, ...otherCountries]

  if (alternativeTitles.length > 0) {
    if (alternativeTitles.length === 1) {
      jsonLd.alternativeHeadline = alternativeTitles[0].title
    } else {
      jsonLd.alternativeHeadline = alternativeTitles.map(t => t.title)
    }
  }

  if (reviews.length > 0) {
    const schemaReviews = reviews.map(r => {
      const review: Record<string, unknown> = {
        '@type': 'Review',
      }

      if (r.title) review.name = r.title

      if (r.summary) review.reviewBody = r.summary

      if (r.author) {
        const name = formatAuthorName(r.author)
        if (name) review.author = { '@type': 'Person', name }
      }

      if (r.mediaOutlet) {
        const publisher: Record<string, unknown> = {
          '@type': 'Organization',
          name: r.mediaOutlet.name,
        }
        if (r.mediaOutlet.url) publisher.url = r.mediaOutlet.url
        review.publisher = publisher
      }

      const dateStr = formatReviewDate(r.publishYear, r.publishMonth, r.publishDay)
      if (dateStr) review.datePublished = dateStr

      if (r.score) {
        review.reviewRating = {
          '@type': 'Rating',
          ratingValue: r.score,
          bestRating: 10,
          worstRating: 1,
        }
      }

      return review
    })

    jsonLd.review = schemaReviews

    const scoredReviews = reviews.filter(r => r.score && r.score > 0)
    if (scoredReviews.length > 0) {
      const sum = scoredReviews.reduce((acc, r) => acc + r.score!, 0)
      jsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Math.round((sum / scoredReviews.length) * 10) / 10,
        bestRating: 10,
        worstRating: 1,
        ratingCount: scoredReviews.length,
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
