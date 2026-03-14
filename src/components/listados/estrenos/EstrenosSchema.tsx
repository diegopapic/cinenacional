const BASE_URL = 'https://cinenacional.com'

interface EstrenosSchemaProps {
  year: number
  movies: { title: string; slug: string }[]
}

export function EstrenosSchema({ year, movies }: EstrenosSchemaProps) {
  if (movies.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Estrenos de cine argentino ${year}`,
    description: `Películas argentinas estrenadas en ${year}`,
    url: `${BASE_URL}/listados/estrenos/${year}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: movies.length,
      itemListElement: movies.map((movie, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: movie.title,
        url: `${BASE_URL}/pelicula/${movie.slug}`,
      })),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
