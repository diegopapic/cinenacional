import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://cinenacional.com'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface SitemapEntry {
  url: string
  lastModified?: Date | null
  changeFrequency: string
  priority: number
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastMod = entry.lastModified
        ? `\n    <lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : ''
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastMod}
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export async function GET() {
  const [movies, people] = await Promise.all([
    prisma.movie.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
    prisma.person.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
  ])

  const entries: SitemapEntry[] = [
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
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
    ...people.map((person) => ({
      url: `${BASE_URL}/persona/${person.slug}`,
      lastModified: person.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ]

  const xml = buildSitemapXml(entries)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
