import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import type { EstrenosMode } from '@/lib/estrenos/estrenosTypes'
import EstrenosContent from '../EstrenosContent'

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

  const baseUrl = 'https://www.cinenacional.com/listados/estrenos'

  switch (parsed.type) {
    case 'year':
      return {
        title: `Estrenos de ${parsed.value} | CineNacional`,
        description: `Películas argentinas estrenadas en ${parsed.value}. Listado completo con fechas de estreno, directores y más.`,
        alternates: { canonical: `${baseUrl}/${parsed.value}` },
      }
    case 'decade':
      return {
        title: `Estrenos de la década de ${parsed.start} | CineNacional`,
        description: `Películas argentinas estrenadas en la década de ${parsed.start}. Listado completo por año.`,
        alternates: { canonical: `${baseUrl}/${parsed.label}` },
      }
    case 'upcoming':
      return {
        title: 'Próximos estrenos | CineNacional',
        description: 'Próximas películas argentinas por estrenarse. Fechas de estreno confirmadas.',
        alternates: { canonical: `${baseUrl}/proximos` },
      }
  }
}

export default async function EstrenosYearPage({ params }: PageProps) {
  const { year } = await params
  const parsed = parseYearParam(year)
  if (!parsed) notFound()

  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
            <p className="text-[13px] text-muted-foreground/40">
              Cargando estrenos…
            </p>
          </div>
        </div>
      }
    >
      <EstrenosContent mode={parsed} />
    </Suspense>
  )
}
