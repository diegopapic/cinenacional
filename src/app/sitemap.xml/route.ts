import { prisma } from '@/lib/prisma'
import {
  SITEMAP_BASE_URL,
  SITEMAP_PAGE_SIZE,
  buildSitemapIndex,
  xmlResponse,
} from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [movieCount, personCount, latestMovie, latestPerson] = await Promise.all([
    prisma.movie.count(),
    prisma.person.count(),
    prisma.movie.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.person.findFirst({ select: { updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
  ])

  const moviePages = Math.ceil(movieCount / SITEMAP_PAGE_SIZE)
  const personPages = Math.ceil(personCount / SITEMAP_PAGE_SIZE)

  const movieLastMod = latestMovie?.updatedAt ?? null
  const personLastMod = latestPerson?.updatedAt ?? null
  const overallLastMod = movieLastMod && personLastMod
    ? (movieLastMod > personLastMod ? movieLastMod : personLastMod)
    : movieLastMod ?? personLastMod

  const sitemaps: { loc: string; lastModified?: Date | null }[] = [
    { loc: `${SITEMAP_BASE_URL}/sitemap/static.xml`, lastModified: overallLastMod },
    { loc: `${SITEMAP_BASE_URL}/sitemap/estrenos.xml`, lastModified: movieLastMod },
    { loc: `${SITEMAP_BASE_URL}/sitemap/obituarios.xml`, lastModified: personLastMod },
    { loc: `${SITEMAP_BASE_URL}/sitemap/genres.xml` },
    { loc: `${SITEMAP_BASE_URL}/sitemap/efemerides.xml` },
  ]

  for (let i = 0; i < moviePages; i++) {
    sitemaps.push({ loc: `${SITEMAP_BASE_URL}/sitemap/movies-${i}.xml`, lastModified: movieLastMod })
  }

  for (let i = 0; i < personPages; i++) {
    sitemaps.push({ loc: `${SITEMAP_BASE_URL}/sitemap/people-${i}.xml`, lastModified: personLastMod })
  }

  return xmlResponse(buildSitemapIndex(sitemaps))
}
