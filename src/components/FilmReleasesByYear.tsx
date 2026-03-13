'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Pagination from '@/components/shared/Pagination'
import { PosterPlaceholder } from '@/components/film/PosterPlaceholder'
import type { EstrenosMode } from '@/lib/estrenos/estrenosTypes'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReleaseEntry {
  title: string
  href: string
  posterSrc?: string
  year: number | null
  director?: string
  releaseMonth?: number | null
  releaseDay?: number | null
  releaseDateISO?: string    // para ordenamiento si aplica
}

// ── Constants ──────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

const DECADES = [
  { label: '1890s', start: 1890, end: 1899 },
  { label: '1900s', start: 1900, end: 1909 },
  { label: '1910s', start: 1910, end: 1919 },
  { label: '1920s', start: 1920, end: 1929 },
  { label: '1930s', start: 1930, end: 1939 },
  { label: '1940s', start: 1940, end: 1949 },
  { label: '1950s', start: 1950, end: 1959 },
  { label: '1960s', start: 1960, end: 1969 },
  { label: '1970s', start: 1970, end: 1979 },
  { label: '1980s', start: 1980, end: 1989 },
  { label: '1990s', start: 1990, end: 1999 },
  { label: '2000s', start: 2000, end: 2009 },
  { label: '2010s', start: 2010, end: 2019 },
  { label: '2020s', start: 2020, end: 2029 },
]

const PER_PAGE = 24

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatReleaseBadge(
  entry: ReleaseEntry,
  showYear: boolean,
): string | null {
  if (!entry.releaseMonth) return null
  const month = MONTH_NAMES[entry.releaseMonth - 1]
  const capitalMonth = month.charAt(0).toUpperCase() + month.slice(1)

  if (entry.releaseDay) {
    // Fecha completa: día + mes (+ año si década)
    if (showYear && entry.year) {
      return `${entry.releaseDay} de ${month} de ${entry.year}`
    }
    return `${entry.releaseDay} de ${month}`
  }

  // Solo mes, sin día
  if (showYear && entry.year) {
    return `${capitalMonth} de ${entry.year}`
  }
  return capitalMonth
}

function isEntryFuture(entry: ReleaseEntry): boolean {
  if (!entry.year) return false
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentDay = now.getDate()

  if (entry.year > currentYear) return true
  if (entry.year < currentYear) return false

  // Mismo año: comparar mes y día
  const month = entry.releaseMonth ?? 0
  const day = entry.releaseDay ?? 0
  if (month === 0) return true // solo tiene año actual, considerarlo futuro
  if (month > currentMonth) return true
  if (month < currentMonth) return false
  if (day === 0) return true // mismo mes sin día, considerarlo futuro
  return day >= currentDay
}

function findDecadeIndex(year: number): number {
  const idx = DECADES.findIndex(d => year >= d.start && year <= d.end)
  return idx >= 0 ? idx : DECADES.length - 1
}

// ── Component ──────────────────────────────────────────────────────────────

interface FilmReleasesByYearProps {
  entries: ReleaseEntry[]
  mode: EstrenosMode
}

export function FilmReleasesByYear({ entries, mode }: FilmReleasesByYearProps) {
  const isUpcoming = mode.type === 'upcoming'
  const selectedYear = mode.type === 'year' ? mode.value : null
  const isDecadeView = mode.type === 'decade'

  // Década activa en la barra de navegación
  const getInitialDecadeIndex = () => {
    if (mode.type === 'year') return findDecadeIndex(mode.value)
    if (mode.type === 'decade') return DECADES.findIndex(d => d.start === mode.start)
    return findDecadeIndex(CURRENT_YEAR)
  }

  const [decadeIndex, setDecadeIndex] = useState(getInitialDecadeIndex)
  const [page, setPage] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  const decade = DECADES[decadeIndex]
  const years = Array.from({ length: 10 }, (_, i) => decade.start + i)

  // Scroll al botón activo dentro de la barra
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = scrollRef.current
      if (!container) return
      const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement | null
      if (!activeBtn) return
      const containerRect = container.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      const offset = btnRect.left - containerRect.left + container.scrollLeft
      const left = offset - container.clientWidth / 2 + btnRect.width / 2
      container.scrollTo({ left, behavior: 'smooth' })
    })
  }, [selectedYear, decadeIndex, isDecadeView])

  // Filtrar entries por modo
  const filtered = useMemo(() => {
    let result: ReleaseEntry[]
    if (isUpcoming) {
      result = entries.filter(isEntryFuture)
    } else if (selectedYear !== null) {
      result = entries.filter((e) => e.year === selectedYear)
    } else if (isDecadeView && mode.type === 'decade') {
      result = entries.filter(
        (e) => e.year !== null && e.year >= mode.start && e.year <= mode.end,
      )
    } else {
      result = entries.filter(
        (e) => e.year !== null && e.year >= decade.start && e.year <= decade.end,
      )
    }
    return result.sort((a, b) => {
      const yearA = a.year ?? 0
      const yearB = b.year ?? 0
      if (yearA !== yearB) return yearA - yearB
      const isoA = a.releaseDateISO ?? ''
      const isoB = b.releaseDateISO ?? ''
      return isoA.localeCompare(isoB)
    })
  }, [entries, decade, selectedYear, isUpcoming, isDecadeView, mode])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Title
  const title = isUpcoming
    ? 'Próximos estrenos'
    : selectedYear
      ? `Estrenos de ${selectedYear}`
      : `Estrenos de la década de ${decade.start}`

  // Handlers
  const handleDecadeChange = (dir: -1 | 1) => {
    const next = decadeIndex + dir
    if (next < 0 || next >= DECADES.length) return
    setDecadeIndex(next)
  }

  const handlePageChange = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Determinar si un botón de año/década está activo
  const isYearActive = (y: number) => selectedYear === y
  const isDecadeBtnActive = isDecadeView && mode.type === 'decade' && mode.start === decade.start

  return (
    <div>
      {/* ── Header ── */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 md:pt-14 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
              {filtered.length} {filtered.length === 1 ? 'pelicula' : 'peliculas'}
            </p>
          </div>
          <Link
            href={isUpcoming ? `/listados/estrenos/${CURRENT_YEAR}` : '/listados/estrenos/proximos'}
            className={cn(
              'mt-1 flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] transition-colors md:text-[13px]',
              isUpcoming
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground/50 hover:text-foreground/70',
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {isUpcoming ? 'Ver todos' : 'Próximos estrenos'}
          </Link>
        </div>
      </div>

      {/* ── Year bar (oculta en modo upcoming) ── */}
      {!isUpcoming && <div className="mx-auto mt-6 w-full max-w-7xl border-b border-border/10 lg:px-6">
        <div className="flex items-center">
          {/* Prev decade arrow */}
          <button
            disabled={decadeIndex === 0}
            onClick={() => handleDecadeChange(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-20 disabled:hover:text-muted-foreground/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Scrollable area */}
          <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex w-max items-center">
              {/* Decade button */}
              <Link
                href={`/listados/estrenos/${decade.start}s`}
                data-active={isDecadeBtnActive}
                className={cn(
                  'border-b-2 px-3 py-2 text-[12px] font-medium tracking-wide whitespace-nowrap transition-colors md:text-[13px]',
                  isDecadeBtnActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground/50 hover:text-foreground/70',
                )}
              >
                {decade.label}
              </Link>

              {/* Year buttons */}
              {years.map((y) => {
                const isFuture = y > CURRENT_YEAR
                const isActive = isYearActive(y)
                if (isFuture) {
                  return (
                    <span
                      key={y}
                      className="border-b-2 border-transparent px-2.5 py-2 text-[12px] tabular-nums whitespace-nowrap text-muted-foreground/20 cursor-not-allowed md:px-3 md:text-[13px]"
                    >
                      {y}
                    </span>
                  )
                }
                return (
                  <Link
                    key={y}
                    href={`/listados/estrenos/${y}`}
                    data-active={isActive}
                    className={cn(
                      'border-b-2 px-2.5 py-2 text-[12px] tabular-nums whitespace-nowrap transition-colors md:px-3 md:text-[13px]',
                      isActive
                        ? 'border-accent text-accent'
                        : 'border-transparent text-muted-foreground/50 hover:text-foreground/70',
                    )}
                  >
                    {y}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Next decade arrow */}
          <button
            disabled={decadeIndex === DECADES.length - 1}
            onClick={() => handleDecadeChange(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-20 disabled:hover:text-muted-foreground/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>}

      {/* ── Grid ── */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 md:pb-14 lg:px-6">
      {paginated.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground/30">
          No hay peliculas para mostrar
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {paginated.map((film, i) => (
            <CompactCard key={`${film.href}-${i}`} film={film} showYear={isUpcoming || selectedYear === null} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      </div>
    </div>
  )
}

// ── CompactCard ────────────────────────────────────────────────────────────

function CompactCard({ film, showYear }: { film: ReleaseEntry; showYear: boolean }) {
  const badge = formatReleaseBadge(film, showYear)
  return (
    <Link href={film.href} className="group flex flex-col">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm">
        {film.posterSrc ? (
          <Image
            src={film.posterSrc}
            alt={film.title}
            fill
            sizes="(min-width: 1024px) 16vw, (min-width: 768px) 20vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <PosterPlaceholder className="h-full w-full" />
        )}

        {/* Badge de fecha */}
        {badge && (
          <span className="absolute left-1 top-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[8px] text-foreground/80 backdrop-blur-sm md:left-1.5 md:top-1.5 md:text-[9px]">
            {badge}
          </span>
        )}

        {/* Overlay sutil de borde */}
        <div className="absolute inset-0 border border-foreground/[0.04]" />
      </div>

      {/* Info */}
      <div className="mt-2">
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[13px]">
          {film.title}
          {film.year && (
            <span className="ml-1 text-[11px] font-normal tabular-nums text-muted-foreground/40">
              ({film.year})
            </span>
          )}
        </p>
        {film.director && (
          <p className="truncate text-[11px] text-muted-foreground/40">
            Dir: {film.director}
          </p>
        )}
      </div>
    </Link>
  )
}
