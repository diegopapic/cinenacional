import type { ReleaseEntry } from '@/components/FilmReleasesByYear'

const BASE_URL = 'https://cinenacional.com'

interface EstrenosSchemaProps {
  year: number
  entries: ReleaseEntry[]
}

export function EstrenosSchema({ year, entries }: EstrenosSchemaProps) {
  if (entries.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Estrenos de cine argentino ${year}`,
    description: `Películas argentinas estrenadas en ${year}`,
    url: `${BASE_URL}/listados/estrenos/${year}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => {
        const item: Record<string, unknown> = {
          '@type': 'ListItem',
          position: index + 1,
        }
        if (entry.title) item.name = entry.title
        if (entry.href) item.url = `${BASE_URL}${entry.href}`
        return item
      }),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
