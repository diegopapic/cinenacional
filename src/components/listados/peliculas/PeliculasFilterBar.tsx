// src/components/listados/peliculas/PeliculasFilterBar.tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { useValueChange } from '@/hooks/useValueChange'
import { ArrowDownUp, SlidersHorizontal, X, ChevronDown, CalendarDays, LayoutGrid, List } from 'lucide-react'
import { FilterSelect } from '@/components/shared/filters'
import type { MovieFilterOptions, MovieFilters } from '@/lib/queries/peliculas'
import { MOVIE_SORT_OPTIONS } from '@/lib/movies/movieListTypes'
import type { ViewMode } from '@/lib/shared/listTypes'

interface PeliculasFilterBarProps {
  filterOptions: MovieFilterOptions
  activeFilters: MovieFilters
  viewMode: ViewMode
  /** Base path for navigation (e.g. '/listados/peliculas/coproducciones/espana'). Defaults to '/listados/peliculas'. */
  basePath?: string
  /** When set from a coproduction route, the country filter is hidden and countryId excluded from query params. */
  presetCountryId?: number
}

// ─── Helpers ─────────────────────────────────────────────────────

function filtersToSearchParams(filters: MovieFilters, view: ViewMode): string {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.soundType) params.set('soundType', filters.soundType)
  if (filters.colorTypeId) params.set('colorTypeId', String(filters.colorTypeId))
  if (filters.tipoDuracion) params.set('tipoDuracion', filters.tipoDuracion)
  if (filters.countryId) params.set('countryId', String(filters.countryId))
  if (filters.genreId) params.set('genreId', String(filters.genreId))
  if (filters.ratingId) params.set('ratingId', String(filters.ratingId))
  if (filters.releaseDateFrom) params.set('releaseDateFrom', filters.releaseDateFrom)
  if (filters.releaseDateTo) params.set('releaseDateTo', filters.releaseDateTo)
  if (filters.productionYearFrom) params.set('productionYearFrom', String(filters.productionYearFrom))
  if (filters.productionYearTo) params.set('productionYearTo', String(filters.productionYearTo))
  if (filters.sortBy && filters.sortBy !== 'popularity') params.set('sortBy', filters.sortBy)
  const defaultOrder = filters.sortBy === 'title' ? 'asc' : 'desc'
  if (filters.sortOrder && filters.sortOrder !== defaultOrder) params.set('sortOrder', filters.sortOrder)
  if (view !== 'compact') params.set('view', view)

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function countActive(filters: MovieFilters): number {
  let count = 0
  if (filters.search) count++
  if (filters.soundType) count++
  if (filters.colorTypeId) count++
  if (filters.tipoDuracion) count++
  if (filters.countryId) count++
  if (filters.genreId) count++
  if (filters.ratingId) count++
  if (filters.releaseDateFrom) count++
  if (filters.releaseDateTo) count++
  if (filters.productionYearFrom) count++
  if (filters.productionYearTo) count++
  return count
}

// ─── DateInput ───────────────────────────────────────────────────

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  function isoToDisplay(iso: string): string {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return ''
    return `${d}/${m}/${y}`
  }

  function handleFocus() {
    setDraft(isoToDisplay(value))
    setIsFocused(true)
  }

  function handleBlur() {
    setIsFocused(false)
    if (!draft) {
      onChange('')
      return
    }
    const match = draft.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value
    const digits = v.replace(/\D/g, '')
    if (digits.length >= 2 && v.length === 2 && !v.includes('/')) {
      v = digits.slice(0, 2) + '/'
    } else if (digits.length >= 4 && v.length === 5 && v.charAt(2) === '/' && !v.slice(3).includes('/')) {
      v = v.slice(0, 3) + digits.slice(2, 4) + '/'
    }
    setDraft(v)
  }

  function handleDatePicker(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  const displayValue = isFocused ? draft : isoToDisplay(value)

  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <div className="relative flex h-8 items-center border border-border/30 bg-transparent">
        <input
          type="text"
          placeholder="dd/mm/aaaa"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          className="w-full bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-hidden placeholder:text-muted-foreground/25"
        />
        <div className="relative mr-2 h-3.5 w-3.5 shrink-0">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            ref={dateRef}
            type="date"
            value={value}
            onChange={handleDatePicker}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  )
}

// ─── YearInput (local state, navigate on blur/Enter) ─────────────

function YearInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  const [draft, setDraft] = useState(value ? String(value) : '')
  const [prevValue, setPrevValue] = useState(value)

  // Sync draft when the prop changes externally (e.g. "clear filters")
  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value ? String(value) : '')
  }

  // Auto-commit after 750ms of inactivity
  const debouncedDraft = useDebounce(draft, 750)
  useValueChange(debouncedDraft, (current) => {
    const num = parseInt(current, 10)
    const parsed = isNaN(num) || num <= 0 ? undefined : num
    if (parsed !== value) onChange(parsed)
  })

  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <input
        type="number"
        placeholder="Año"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 w-full border border-border/30 bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-hidden transition-colors placeholder:text-muted-foreground/25 focus:border-accent/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export default function PeliculasFilterBar({
  filterOptions,
  activeFilters,
  viewMode: initialViewMode,
  basePath = '/listados/peliculas',
  presetCountryId,
}: PeliculasFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(() => countActive(activeFilters) > 0)

  // Read current state from searchParams (source of truth)
  const sortBy = activeFilters.sortBy || 'popularity'
  const sortOrder = activeFilters.sortOrder || 'desc'
  const viewMode = initialViewMode

  const activeCount = countActive(activeFilters) - (presetCountryId && activeFilters.countryId ? 1 : 0)

  function navigate(newFilters: MovieFilters, newView?: ViewMode) {
    // When on a coproduction route, exclude countryId from query params
    const filtersForUrl = presetCountryId
      ? { ...newFilters, countryId: undefined }
      : newFilters
    const url = basePath + filtersToSearchParams(filtersForUrl, newView || viewMode)
    startTransition(() => {
      router.push(url, { scroll: false })
    })
  }

  function handleFilterChange(key: keyof MovieFilters, value: string | number) {
    const updated = { ...activeFilters, [key]: value || undefined }
    // Reset page when filter changes
    navigate(updated)
  }

  function handleClearFilters() {
    navigate({ sortBy, sortOrder, countryId: presetCountryId })
  }

  function handleSortByChange(newSortBy: string) {
    const defaultOrder = newSortBy === 'title' ? 'asc' : 'desc'
    navigate({ ...activeFilters, sortBy: newSortBy, sortOrder: defaultOrder })
  }

  function handleToggleSortOrder() {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    navigate({ ...activeFilters, sortOrder: newOrder })
  }

  function handleViewModeChange(mode: ViewMode) {
    navigate(activeFilters, mode)
  }

  // useSearchParams needed for re-render on URL change
  void searchParams

  return (
    <>
      {/* Loading indicator */}
      {isPending && (
        <div className="mt-6 flex items-center gap-2 text-[12px] text-muted-foreground/50">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <span>Cargando...</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border/20 pb-4">
        {/* Sort select */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value)}
            className="h-8 appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-hidden transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
          >
            {MOVIE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
        </div>

        {/* Sort direction */}
        <button
          onClick={handleToggleSortOrder}
          className="flex h-8 w-8 items-center justify-center border border-border/30 text-muted-foreground/50 transition-colors hover:border-accent/30 hover:text-accent"
          title={sortOrder === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
        >
          <ArrowDownUp className={`h-3.5 w-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </button>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-8 items-center gap-1.5 border px-3 text-[12px] transition-colors ${
            showFilters
              ? 'border-accent/40 text-accent'
              : 'border-border/30 text-muted-foreground/60 hover:border-accent/30 hover:text-accent/80'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent/20 px-1.5 py-px text-[9px] text-accent">
              {activeCount}
            </span>
          )}
        </button>

        {/* Clear filters */}
        {activeCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex h-8 items-center gap-1 border border-border/20 px-3 text-[12px] text-muted-foreground/40 transition-colors hover:text-accent"
          >
            <X className="h-3 w-3" />
            <span>Limpiar filtros</span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex overflow-hidden border border-border/30">
          <button
            onClick={() => handleViewModeChange('compact')}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${
              viewMode === 'compact'
                ? 'bg-muted/30 text-foreground/70'
                : 'text-muted-foreground/40 hover:text-foreground/60'
            }`}
            title="Vista compacta"
            aria-label="Vista compacta"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleViewModeChange('detailed')}
            className={`flex h-8 w-8 items-center justify-center border-l border-border/30 transition-colors ${
              viewMode === 'detailed'
                ? 'bg-muted/30 text-foreground/70'
                : 'text-muted-foreground/40 hover:text-foreground/60'
            }`}
            title="Vista detallada"
            aria-label="Vista detallada"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="border-b border-border/20 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <FilterSelect
              label="Sonido"
              value={activeFilters.soundType || ''}
              options={filterOptions.soundTypes}
              onChange={(v) => handleFilterChange('soundType', v)}
            />
            <FilterSelect
              label="Color"
              value={activeFilters.colorTypeId ? String(activeFilters.colorTypeId) : ''}
              options={filterOptions.colorTypes}
              onChange={(v) => handleFilterChange('colorTypeId', v ? parseInt(v) : 0)}
            />
            <FilterSelect
              label="Tipo de duración"
              value={activeFilters.tipoDuracion || ''}
              options={filterOptions.durationTypes}
              onChange={(v) => handleFilterChange('tipoDuracion', v)}
            />
            {/* País — hidden when preset from coproduction route */}
            {!presetCountryId && (
              <FilterSelect
                label="Países coproductores"
                value={activeFilters.countryId ? String(activeFilters.countryId) : ''}
                options={filterOptions.countries}
                onChange={(v) => handleFilterChange('countryId', v ? parseInt(v) : 0)}
              />
            )}
            <FilterSelect
              label="Género"
              value={activeFilters.genreId ? String(activeFilters.genreId) : ''}
              options={filterOptions.genres}
              onChange={(v) => handleFilterChange('genreId', v ? parseInt(v) : 0)}
            />
            <FilterSelect
              label="Calificación"
              value={activeFilters.ratingId ? String(activeFilters.ratingId) : ''}
              options={filterOptions.ratings}
              onChange={(v) => handleFilterChange('ratingId', v ? parseInt(v) : 0)}
            />
            <DateInput
              label="Estrenada desde"
              value={activeFilters.releaseDateFrom || ''}
              onChange={(v) => handleFilterChange('releaseDateFrom', v)}
            />
            <DateInput
              label="Estrenada hasta"
              value={activeFilters.releaseDateTo || ''}
              onChange={(v) => handleFilterChange('releaseDateTo', v)}
            />
            <YearInput
              label="Producida desde"
              value={activeFilters.productionYearFrom}
              onChange={(v) => handleFilterChange('productionYearFrom', v || 0)}
            />
            <YearInput
              label="Producida hasta"
              value={activeFilters.productionYearTo}
              onChange={(v) => handleFilterChange('productionYearTo', v || 0)}
            />
          </div>
        </div>
      )}
    </>
  )
}
