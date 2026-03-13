import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://cinenacional.com'

export async function generateSitemaps() {
  // Always split to avoid DB queries at build time.
  // 0 = static pages + movies, 1 = people
  return [{ id: 0 }, { id: 1 }]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  try {
    if (id === 1) {
      const people = await prisma.person.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
      })

      return people.map((person) => ({
        url: `${BASE_URL}/persona/${person.slug}`,
        lastModified: person.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    }

    // id === 0: static pages + movies
    const movies = await prisma.movie.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    })

    return [
      {
        url: BASE_URL,
        changeFrequency: 'weekly',
        priority: 1.0,
      },
      {
        url: `${BASE_URL}/estrenos`,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      ...movies.map((movie) => ({
        url: `${BASE_URL}/pelicula/${movie.slug}`,
        lastModified: movie.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    ]
  } catch {
    // DB not available at build time — return static entries only
    if (id === 1) return []
    return [
      { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
      { url: `${BASE_URL}/estrenos`, changeFrequency: 'weekly', priority: 0.9 },
    ]
  }
}
