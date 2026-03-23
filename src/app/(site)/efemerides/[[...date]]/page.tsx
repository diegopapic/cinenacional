// src/app/(site)/efemerides/[[...date]]/page.tsx — Server Component
import Link from 'next/link'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import { Metadata } from 'next'
import { getEfemerides } from '@/lib/queries/efemerides'
import { getPersonPhotoUrl } from '@/lib/images/imageUtils'
import EfemeridesDateSelector from '@/components/efemerides/EfemeridesDateSelector'
import ServerPagination from '@/components/shared/ServerPagination'
import type { Efemeride } from '@/types/home.types'

export const revalidate = 86400 // 24h

// ── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const PER_PAGE = 20

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseDateFromParams(dateParam: string[] | undefined): { month: number; day: number } {
  if (dateParam && dateParam.length > 0) {
    const [m, d] = dateParam[0].split('-').map(Number)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { month: m, day: d }
    }
  }
  const today = new Date()
  return { month: today.getMonth() + 1, day: today.getDate() }
}

function buildDatePath(month: number, day: number): string {
  return `/efemerides/${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Director links (server-rendered) ────────────────────────────────────────

function DirectorLinks({ efemeride }: { efemeride: Efemeride }) {
  const directors = efemeride.directors

  if (!directors || directors.length === 0) {
    if (efemeride.director && efemeride.directorSlug) {
      return (
        <span>
          , de{' '}
          <Link
            href={`/persona/${efemeride.directorSlug}`}
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            {efemeride.director}
          </Link>
        </span>
      )
    }
    return null
  }

  return (
    <span>
      , de{' '}
      {directors.map((director, idx) => (
        <span key={director.slug}>
          <Link
            href={`/persona/${director.slug}`}
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            {director.name}
          </Link>
          {idx < directors.length - 2 && ', '}
          {idx === directors.length - 2 && ' y '}
        </span>
      ))}
    </span>
  )
}

// ── Metadata ────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ date?: string[] }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params
  const { month, day } = parseDateFromParams(date)
  const monthName = MONTHS[month - 1].toLowerCase()

  const datePath = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return {
    title: `Efemérides del ${day} de ${monthName} — CineNacional`,
    description: `Efemérides del cine argentino del ${day} de ${monthName}: estrenos, nacimientos y más.`,
    alternates: {
      canonical: `/efemerides/${datePath}`,
    },
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

const VERBOS: Record<string, string> = {
  estreno: 'Se estrenó',
  inicio_rodaje: 'Empezó el rodaje de',
  fin_rodaje: 'Terminó el rodaje de',
  nacimiento: 'Nació',
  muerte: 'Murió',
}

export default async function EfemeridesPage({ params, searchParams }: PageProps) {
  const { date } = await params
  const { page: pageParam } = await searchParams

  const { month, day } = parseDateFromParams(date)
  const page = Math.max(1, Number(pageParam) || 1)
  const monthName = MONTHS[month - 1]

  // Fetch server-side
  const { efemerides } = await getEfemerides(month, day)

  // Sort by year ascending (oldest first)
  const entries = [...efemerides].sort((a, b) => {
    const yearA = (typeof a.fecha === 'string' ? new Date(a.fecha) : a.fecha).getFullYear()
    const yearB = (typeof b.fecha === 'string' ? new Date(b.fecha) : b.fecha).getFullYear()
    return yearA - yearB
  })

  // Paginate
  const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = entries.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const datePath = buildDatePath(month, day)
  const buildPageHref = (p: number) => p === 1 ? datePath : `${datePath}?page=${p}`

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14 lg:px-6">
      {/* Title & count */}
      <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl lg:text-4xl">
        Efemérides del {day} de {monthName.toLowerCase()}
      </h1>
      <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
        {entries.length} {entries.length === 1 ? 'efeméride' : 'efemérides'}
      </p>

      {/* Date selector (client component) */}
      <EfemeridesDateSelector month={month} day={day} />

      {/* Content */}
      {paged.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground/30">
          No hay efemérides para este día
        </div>
      ) : (
        <div className="mt-2 flex flex-col">
          {paged.map((efemeride) => {
            const isPelicula = efemeride.tipo === 'pelicula'
            const imageUrl = isPelicula ? efemeride.posterUrl : getPersonPhotoUrl(efemeride.photoUrl, 'sm')
            const linkHref = isPelicula
              ? `/pelicula/${efemeride.slug}`
              : `/persona/${efemeride.slug}`

            const fechaObj =
              typeof efemeride.fecha === 'string'
                ? new Date(efemeride.fecha)
                : efemeride.fecha
            const year = fechaObj.getFullYear()

            const verbo = VERBOS[efemeride.tipoEvento || ''] || ''
            const hasLink = !!efemeride.slug

            return (
              <div
                key={efemeride.id}
                className="flex items-center gap-4 border-b border-border/10 py-3.5 last:border-b-0 md:gap-5"
              >
                {/* Image column */}
                <div className="flex h-16 w-14 shrink-0 items-center justify-center md:h-[72px] md:w-16">
                  {imageUrl ? (
                    isPelicula ? (
                      <div className="relative h-16 w-11 overflow-hidden rounded-[2px] ring-1 ring-border/10 md:h-[72px] md:w-12">
                        <Image
                          loader={cloudinaryLoader}
                          fill
                          className="object-cover"
                          sizes="48px"
                          src={imageUrl}
                          alt={efemeride.titulo || ''}
                        />
                      </div>
                    ) : (
                      <div className="relative h-14 w-14 overflow-hidden rounded-full md:h-16 md:w-16">
                        <Image
                          loader={cloudinaryLoader}
                          fill
                          className="object-cover"
                          sizes="64px"
                          src={imageUrl}
                          alt={efemeride.titulo || ''}
                        />
                        <div className="absolute inset-0 rounded-full border border-foreground/4" />
                      </div>
                    )
                  ) : isPelicula ? (
                    <div className="flex h-16 w-11 items-center justify-center overflow-hidden rounded-[2px] bg-muted/30 ring-1 ring-border/10 md:h-[72px] md:w-12">
                      <svg
                        className="h-6 w-6 text-muted-foreground/20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted/30 md:h-16 md:w-16">
                      <svg
                        className="h-6 w-6 text-muted-foreground/20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Text column */}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] tabular-nums text-muted-foreground/35 md:text-[12px]">
                    {year}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground/50 md:text-sm">
                    {hasLink ? (
                      <>
                        {verbo && `${verbo} `}
                        <Link
                          href={linkHref}
                          className="text-foreground/80 transition-colors hover:text-accent"
                        >
                          {efemeride.titulo}
                        </Link>
                        {isPelicula && <DirectorLinks efemeride={efemeride} />}
                      </>
                    ) : (
                      efemeride.evento || `${verbo} ${efemeride.titulo || ''}`.trim()
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination (server-rendered with Links) */}
      <ServerPagination
        currentPage={safePage}
        totalPages={totalPages}
        buildHref={buildPageHref}
      />
    </div>
  )
}
