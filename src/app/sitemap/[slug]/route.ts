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
        {
          url: SITEMAP_BASE_URL,
          changeFrequency: 'weekly',
          priority: 1.0,
        },
        {
          url: `${SITEMAP_BASE_URL}/estrenos`,
          changeFrequency: 'weekly',
          priority: 0.9,
        },
      ])
    )
  }

  if (name === 'estrenos') {
    const currentYear = new Date().getFullYear()
    const entries: SitemapEntry[] = []

    for (let year = 1896; year <= currentYear; year++) {
      entries.push({
        url: `${SITEMAP_BASE_URL}/estrenos/${year}`,
        changeFrequency: year === currentYear ? 'weekly' : 'yearly',
        priority: year === currentYear ? 0.9 : 0.5,
      })
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
      changeFrequency: 'monthly',
      priority: 0.8,
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
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return xmlResponse(buildSitemapXml(entries))
  }

  return new Response('Not Found', { status: 404 })
}
