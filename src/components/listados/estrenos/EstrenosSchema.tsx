const BASE_URL = 'https://cinenacional.com'

interface EstrenosSchemaProps {
  year: number
  movies: { title: string; slug: string }[]
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
