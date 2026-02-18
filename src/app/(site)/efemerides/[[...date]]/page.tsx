'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Efemeride } from '@/types/home.types'

// ── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  { label: 'Enero', days: 31 },
  { label: 'Febrero', days: 29 },
  { label: 'Marzo', days: 31 },
  { label: 'Abril', days: 30 },
  { label: 'Mayo', days: 31 },
  { label: 'Junio', days: 30 },
  { label: 'Julio', days: 31 },
  { label: 'Agosto', days: 31 },
  { label: 'Septiembre', days: 30 },
  { label: 'Octubre', days: 31 },
  { label: 'Noviembre', days: 30 },
  { label: 'Diciembre', days: 31 },
]

const PER_PAGE = 20

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EfemeridesPage() {
  const router = useRouter()
  const params = useParams()

  const parseDateFromParams = () => {
    if (params.date && Array.isArray(params.date) && params.date.length > 0) {
      const dateStr = params.date[0]
      const [m, d] = dateStr.split('-').map(Number)
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { month: m, day: d }
      }
    }
    const today = new Date()
    return { month: today.getMonth() + 1, day: today.getDate() }
  }

  const initialDate = parseDateFromParams()

  const [month, setMonth] = useState(initialDate.month)
  const [day, setDay] = useState(initialDate.day)
  const [page, setPage] = useState(1)
  const [efemerides, setEfemerides] = useState<Efemeride[]>([])
  const [loading, setLoading] = useState(true)

  const monthInfo = MONTHS[month - 1]
  const maxDay = monthInfo.days

  // Sync state from URL params
  useEffect(() => {
    const dateFromUrl = parseDateFromParams()
    setMonth(dateFromUrl.month)
    setDay(dateFromUrl.day)
    setPage(1)
    fetchEfemerides(dateFromUrl.month, dateFromUrl.day)
  }, [params.date])

  const fetchEfemerides = async (mes: number, dia: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/efemerides?month=${mes}&day=${dia}`)
      if (!response.ok) throw new Error('Error fetching data')
      const result = await response.json()
      setEfemerides(result.efemerides || [])
    } catch (error) {
      console.error('Error fetching efemérides:', error)
      setEfemerides([])
    } finally {
      setLoading(false)
    }
  }

  // ── Navigation helpers ──────────────────────────────────────────────────

  const navigateToDate = (m: number, d: number) => {
    const monthStr = String(m).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    router.push(`/efemerides/${monthStr}-${dayStr}`)
  }

  const goPrev = () => {
    let newDay = day - 1
    let newMonth = month
    if (newDay < 1) {
      newMonth = month === 1 ? 12 : month - 1
      newDay = MONTHS[newMonth - 1].days
    }
    navigateToDate(newMonth, newDay)
  }

  const goNext = () => {
    let newDay = day + 1
    let newMonth = month
    if (newDay > MONTHS[month - 1].days) {
      newMonth = month === 12 ? 1 : month + 1
      newDay = 1
    }
    navigateToDate(newMonth, newDay)
  }

  const goToday = () => {
    router.push('/efemerides')
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value)
    const clampedDay = Math.min(day, MONTHS[newMonth - 1].days)
    setPage(1)
    navigateToDate(newMonth, clampedDay)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPage(1)
    navigateToDate(month, parseInt(e.target.value))
  }

  // ── Sorting & pagination ────────────────────────────────────────────────

  const entries = useMemo(() => {
    return [...efemerides].sort((a, b) => {
      const yearA = (typeof a.fecha === 'string' ? new Date(a.fecha) : a.fecha).getFullYear()
      const yearB = (typeof b.fecha === 'string' ? new Date(b.fecha) : b.fecha).getFullYear()
      return yearA - yearB
    })
  }, [efemerides])

  const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = entries.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const pageNumbers = buildPageNumbers(safePage, totalPages)

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Director links ──────────────────────────────────────────────────────

  const renderDirectorLinks = (efemeride: Efemeride) => {
    const directors = efemeride.directors

    if (!directors || directors.length === 0) {
      if (efemeride.director && efemeride.directorSlug) {
        return (
          <Link
            href={`/persona/${efemeride.directorSlug}`}
            className="text-foreground/80 transition-colors hover:text-accent"
          >
            {efemeride.director}
          </Link>
        )
      }
      return null
    }

    return directors.map((director, idx) => (
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
    ))
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14 lg:px-6">
      {/* Title & count */}
      <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl lg:text-4xl">
        Efemérides del {day} de {monthInfo.label.toLowerCase()}
      </h1>
      <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
        {entries.length} {entries.length === 1 ? 'efeméride' : 'efemérides'}
      </p>

      {/* Date selector */}
      <div className="mt-6 flex items-center gap-2 border-b border-border/10 pb-4 md:gap-3">
        {/* Prev day */}
        <button
          onClick={goPrev}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Day select */}
        <select
          value={day}
          onChange={handleDayChange}
          className="h-8 tabular-nums border border-border/30 bg-background px-2 text-[13px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/30 [&_option]:bg-background [&_option]:text-foreground"
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Month select */}
        <select
          value={month}
          onChange={handleMonthChange}
          className="h-8 border border-border/30 bg-background px-2 text-[13px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/30 [&_option]:bg-background [&_option]:text-foreground"
        >
          {MONTHS.map((m, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Next day */}
        <button
          onClick={goNext}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Today button */}
        <button
          onClick={goToday}
          className="ml-auto h-8 border border-border/30 px-3 text-[11px] tracking-wide text-muted-foreground/40 transition-colors hover:border-accent/30 hover:text-accent"
        >
          HOY
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
        </div>
      ) : paged.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground/30">
          No hay efemerides para este dia
        </div>
      ) : (
        <div className="mt-2 flex flex-col">
          {paged.map((efemeride) => {
            const isPelicula = efemeride.tipo === 'pelicula'
            const imageUrl = isPelicula ? efemeride.posterUrl : efemeride.photoUrl
            const linkHref = isPelicula
              ? `/pelicula/${efemeride.slug}`
              : `/persona/${efemeride.slug}`

            const fechaObj =
              typeof efemeride.fecha === 'string'
                ? new Date(efemeride.fecha)
                : efemeride.fecha
            const year = fechaObj.getFullYear()

            let verbo = ''
            if (efemeride.tipoEvento === 'estreno') verbo = 'Se estrenaba'
            else if (efemeride.tipoEvento === 'inicio_rodaje')
              verbo = 'Empezaba el rodaje de'
            else if (efemeride.tipoEvento === 'fin_rodaje')
              verbo = 'Terminaba el rodaje de'
            else if (efemeride.tipoEvento === 'nacimiento') verbo = 'Nacía'
            else if (efemeride.tipoEvento === 'muerte') verbo = 'Moría'

            const hasLink = !!efemeride.slug

            return (
              <div
                key={efemeride.id}
                className="flex items-center gap-4 border-b border-border/10 py-3.5 last:border-b-0 md:gap-5"
              >
                {/* Image column (fixed width) */}
                <div className="flex h-16 w-14 shrink-0 items-center justify-center md:h-[72px] md:w-16">
                  {imageUrl ? (
                    isPelicula ? (
                      <div className="relative h-16 w-11 overflow-hidden rounded-[2px] ring-1 ring-border/10 md:h-[72px] md:w-12">
                        <Image
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
                          fill
                          className="object-cover"
                          sizes="64px"
                          src={imageUrl}
                          alt={efemeride.titulo || ''}
                        />
                        <div className="absolute inset-0 rounded-full border border-foreground/[0.04]" />
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
                  <p className="mt-0.5 text-[13px] leading-snug text-foreground/70 md:text-sm">
                    {hasLink ? (
                      <>
                        {verbo && `${verbo} `}
                        <Link
                          href={linkHref}
                          className="text-foreground/80 transition-colors hover:text-accent"
                        >
                          {efemeride.titulo}
                        </Link>
                        {isPelicula && efemeride.directors && efemeride.directors.length > 0 && (
                          <span>, de {renderDirectorLinks(efemeride)}</span>
                        )}
                        {isPelicula &&
                          !efemeride.directors?.length &&
                          efemeride.director &&
                          efemeride.directorSlug && (
                            <span>
                              , de{' '}
                              <Link
                                href={`/persona/${efemeride.directorSlug}`}
                                className="text-foreground/80 transition-colors hover:text-accent"
                              >
                                {efemeride.director}
                              </Link>
                            </span>
                          )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mt-10 flex items-center justify-center gap-1"
          aria-label="Paginacion"
        >
          <button
            disabled={safePage <= 1}
            onClick={() => handlePageChange(safePage - 1)}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
          >
            &lsaquo;
          </button>

          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/30"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center text-[12px] transition-colors',
                  safePage === p
                    ? 'border border-accent/40 text-accent'
                    : 'text-muted-foreground/40 hover:text-accent',
                )}
              >
                {p}
              </button>
            ),
          )}

          <button
            disabled={safePage >= totalPages}
            onClick={() => handlePageChange(safePage + 1)}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
          >
            &rsaquo;
          </button>
        </nav>
      )}
    </div>
  )
}
