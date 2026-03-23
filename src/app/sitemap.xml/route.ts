import { prisma } from '@/lib/prisma'
import {
  SITEMAP_BASE_URL,
  SITEMAP_PAGE_SIZE,
  buildSitemapIndex,
  xmlResponse,
} from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [movieCount, personCount] = await Promise.all([
    prisma.movie.count(),
    prisma.person.count(),
  ])

  const moviePages = Math.ceil(movieCount / SITEMAP_PAGE_SIZE)
  const personPages = Math.ceil(personCount / SITEMAP_PAGE_SIZE)

  const sitemaps: { loc: string; lastModified?: Date | null }[] = [
    { loc: `${SITEMAP_BASE_URL}/sitemap/static.xml` },
    { loc: `${SITEMAP_BASE_URL}/sitemap/estrenos.xml` },
    { loc: `${SITEMAP_BASE_URL}/sitemap/obituarios.xml` },
    { loc: `${SITEMAP_BASE_URL}/sitemap/genres.xml` },
  ]

  for (let i = 0; i < moviePages; i++) {
    sitemaps.push({ loc: `${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml` })
  }

  for (let i = 0; i < personPages; i++) {
    sitemaps.push({ loc: `${SITEMAP_BASE_URL}/sitemap/people-${i}.xml` })
  }

  return xmlResponse(buildSitemapIndex(sitemaps))
}
