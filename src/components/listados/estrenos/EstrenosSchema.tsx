const BASE_URL = 'https://cinenacional.com'

interface SchemaMovie {
  title: string
  slug: string
  posterUrl: string | null
  releaseMonth: number | null
  releaseDay: number | null
}

interface EstrenosSchemaProps {
  year: number
  movies: SchemaMovie[]
}

function buildDateCreated(
  year: number,
  month: number | null,
  day: number | null,
): string {
  if (month && day) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (month) return `${year}-${String(month).padStart(2, '0')}`
  return `${year}`
}

export function EstrenosSchema({ year, movies }: EstrenosSchemaProps) {
  if (movies.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Estrenos de cine argentino ${year}`,
    numberOfItems: movies.length,
    itemListElement: movies.map((movie, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Movie',
        name: movie.title,
        url: `${BASE_URL}/pelicula/${movie.slug}`,
        ...(movie.posterUrl && { image: movie.posterUrl }),
        dateCreated: buildDateCreated(year, movie.releaseMonth, movie.releaseDay),
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
