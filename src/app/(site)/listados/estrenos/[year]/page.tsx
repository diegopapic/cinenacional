// src/app/listados/estrenos/[year]/page.tsx — Server Component
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { EstrenosMode } from '@/lib/estrenos/estrenosTypes'
import { getEstrenos } from '@/lib/queries/estrenos'
import { prisma } from '@/lib/prisma'
import { EstrenosSchema } from '@/components/listados/estrenos/EstrenosSchema'
import { FilmReleasesByYear } from '@/components/FilmReleasesByYear'
import { BreadcrumbSchema } from '@/components/shared/BreadcrumbSchema'

export const revalidate = 3600 // 1h

interface PageProps {
  params: Promise<{ year: string }>
}

function parseYearParam(raw: string): EstrenosMode | null {
  if (raw === 'proximos') return { type: 'upcoming' }

  // Década: 2020s, 1990s, etc.
  const decadeMatch = raw.match(/^(\d{4})s$/)
  if (decadeMatch) {
    const start = parseInt(decadeMatch[1])
    if (start % 10 !== 0 || start < 1890 || start > 2020) return null
    return { type: 'decade', start, end: start + 9, label: raw }
  }

  // Año: 2024
  const num = parseInt(raw)
  if (!isNaN(num) && num >= 1890 && num <= new Date().getFullYear() + 5) {
    return { type: 'year', value: num }
  }

  return null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params
  const parsed = parseYearParam(year)
  if (!parsed) return {}

  const baseUrl = 'https://cinenacional.com/listados/estrenos'

  switch (parsed.type) {
    case 'year':
      return {
        title: `Estrenos de ${parsed.value} — cinenacional.com`,
        description: `Películas argentinas estrenadas en ${parsed.value}. Listado completo con fechas de estreno, directores y más.`,
        alternates: { canonical: `${baseUrl}/${parsed.value}` },
      }
    case 'decade':
      return {
        title: `Estrenos de la década de ${parsed.start} — cinenacional.com`,
        description: `Películas argentinas estrenadas en la década de ${parsed.start}. Listado completo por año.`,
        alternates: { canonical: `${baseUrl}/${parsed.label}` },
      }
    case 'upcoming':
      return {
        title: 'Próximos estrenos — cinenacional.com',
        description: 'Próximas películas argentinas por estrenarse. Fechas de estreno confirmadas.',
        alternates: { canonical: `${baseUrl}/proximos` },
      }
  }
}

export default async function EstrenosYearPage({ params }: PageProps) {
  const { year } = await params
  const parsed = parseYearParam(year)
  if (!parsed) notFound()

  // Fetch releases + schema movies in parallel
  const [entries, schemaMovies] = await Promise.all([
    getEstrenos(parsed),
    parsed.type === 'year'
      ? prisma.movie.findMany({
          where: { releaseYear: parsed.value },
          select: {
            title: true,
            slug: true,
            posterUrl: true,
            releaseMonth: true,
            releaseDay: true,
          },
          orderBy: [
            { releaseMonth: 'asc' },
            { releaseDay: 'asc' },
            { title: 'asc' },
          ],
        })
      : Promise.resolve([]),
  ])

  const breadcrumbName = parsed.type === 'year'
    ? String(parsed.value)
    : parsed.type === 'decade'
      ? `Década de ${parsed.start}`
      : 'Próximos estrenos'

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Estrenos', href: '/listados/estrenos' },
        { name: breadcrumbName, href: `/listados/estrenos/${year}` },
      ]} />
      {parsed.type === 'year' && (
        <EstrenosSchema year={parsed.value} movies={schemaMovies} />
      )}
      <FilmReleasesByYear entries={entries} mode={parsed} />
    </>
  )
}
