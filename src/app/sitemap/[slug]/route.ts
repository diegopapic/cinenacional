import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  SITEMAP_BASE_URL,
  SITEMAP_PAGE_SIZE,
  buildSitemapXml,
  xmlResponse,
  SitemapEntry,
} from '@/lib/sitemap'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Remove .xml extension: "static.xml" → "static", "movies-0.xml" → "movies-0"
  const name = slug.replace(/\.xml$/, '')

  if (name === 'static') {
    return xmlResponse(
      buildSitemapXml([
        { url: SITEMAP_BASE_URL },
        { url: `${SITEMAP_BASE_URL}/listados/estrenos` },
        { url: `${SITEMAP_BASE_URL}/listados/peliculas` },
        { url: `${SITEMAP_BASE_URL}/listados/personas` },
        { url: `${SITEMAP_BASE_URL}/listados/obituarios` },
      ])
    )
  }

  if (name === 'genres') {
    const genres = await prisma.genre.findMany({
      select: { slug: true },
      orderBy: { name: 'asc' },
    })

    const entries: SitemapEntry[] = genres.map((genre) => ({
      url: `${SITEMAP_BASE_URL}/listados/peliculas/genero/${genre.slug}`,
    }))

    return xmlResponse(buildSitemapXml(entries))
  }

  if (name === 'obituarios') {
    const years: { deathYear: number }[] = await prisma.$queryRaw`
      SELECT DISTINCT death_year AS "deathYear"
      FROM people
      WHERE death_year IS NOT NULL
      ORDER BY death_year DESC
    `

    const entries: SitemapEntry[] = years.map((row) => ({
      url: `${SITEMAP_BASE_URL}/listados/obituarios/${row.deathYear}`,
    }))

    return xmlResponse(buildSitemapXml(entries))
  }

  if (name === 'estrenos') {
    const currentYear = new Date().getFullYear()
    const currentDecade = Math.floor(currentYear / 10) * 10
    const entries: SitemapEntry[] = []

    // Próximos estrenos
    entries.push({
      url: `${SITEMAP_BASE_URL}/listados/estrenos/proximos`,
    })

    // Décadas (1890s a actual)
    for (let decade = 1890; decade <= currentDecade; decade += 10) {
      entries.push({
        url: `${SITEMAP_BASE_URL}/listados/estrenos/${decade}s`,
      })
    }

    // Años individuales
    for (let year = 1896; year <= currentYear; year++) {
      entries.push({
        url: `${SITEMAP_BASE_URL}/listados/estrenos/${year}`,
      })
    }

    return xmlResponse(buildSitemapXml(entries))
  }

  if (name === 'efemerides') {
    const entries: SitemapEntry[] = []
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= months[month - 1]; day++) {
        const mm = String(month).padStart(2, '0')
        const dd = String(day).padStart(2, '0')
        entries.push({
          url: `${SITEMAP_BASE_URL}/efemerides/${mm}-${dd}`,
        })
      }
    }
    return xmlResponse(buildSitemapXml(entries))
  }

  const moviesMatch = name.match(/^movies-(\d+)$/)
  if (moviesMatch) {
    const page = parseInt(moviesMatch[1], 10)
    const movies = await prisma.movie.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
      skip: page * SITEMAP_PAGE_SIZE,
      take: SITEMAP_PAGE_SIZE,
    })

    const entries: SitemapEntry[] = movies.map((movie) => ({
      url: `${SITEMAP_BASE_URL}/pelicula/${movie.slug}`,
      lastModified: movie.updatedAt,
    }))

    return xmlResponse(buildSitemapXml(entries))
  }

  const peopleMatch = name.match(/^people-(\d+)$/)
  if (peopleMatch) {
    const page = parseInt(peopleMatch[1], 10)
    const people = await prisma.person.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: 'asc' },
      skip: page * SITEMAP_PAGE_SIZE,
      take: SITEMAP_PAGE_SIZE,
    })

    const entries: SitemapEntry[] = people.map((person) => ({
      url: `${SITEMAP_BASE_URL}/persona/${person.slug}`,
      lastModified: person.updatedAt,
    }))

    return xmlResponse(buildSitemapXml(entries))
  }

  return new Response('Not Found', { status: 404 })
}
