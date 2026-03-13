interface MovieSchemaProps {
  title: string
  slug: string
  year?: number | null
  duration?: number | null
  synopsis?: string | null
  posterUrl?: string | null
  rating?: { name: string; abbreviation?: string | null } | null
  genres: { name: string }[]
  directors: { name: string }[]
  cast: { name: string }[]
  countries: { name: string }[]
  alternativeTitles: { title: string }[]
}

function formatDurationISO(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`
  if (hours > 0) return `PT${hours}H`
  return `PT${mins}M`
}

const BASE_URL = 'https://cinenacional.com'

export function MovieSchema({
  title,
  slug,
  year,
  duration,
  synopsis,
  posterUrl,
  rating,
  genres,
  directors,
  cast,
  countries,
  alternativeTitles,
}: MovieSchemaProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title,
    url: `${BASE_URL}/pelicula/${slug}`,
  }

  if (year) {
    jsonLd.dateCreated = String(year)
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
