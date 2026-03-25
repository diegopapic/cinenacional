// src/components/listados/personas/PersonasFilterBar.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownUp, SlidersHorizontal, X, ChevronDown, LayoutGrid, List } from 'lucide-react'
import { FilterSelect } from '@/components/shared/filters'
import { useDebounce } from '@/hooks/useDebounce'
import { useValueChange } from '@/hooks/useValueChange'
import type { PersonFilterOptions, PersonFilters } from '@/lib/queries/personas'
import { SORT_OPTIONS, GENDER_OPTIONS } from '@/lib/people/personListTypes'
import type { ViewMode } from '@/lib/shared/listTypes'

interface PersonasFilterBarProps {
  filterOptions: PersonFilterOptions
  activeFilters: PersonFilters
  viewMode: ViewMode
}

// ─── Helpers ─────────────────────────────────────────────────────

function filtersToSearchParams(filters: PersonFilters, view: ViewMode): string {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.gender) params.set('gender', filters.gender)
  if (filters.birthLocationId) params.set('birthLocationId', String(filters.birthLocationId))
  if (filters.deathLocationId) params.set('deathLocationId', String(filters.deathLocationId))
  if (filters.nationalityId) params.set('nationalityId', String(filters.nationalityId))
  if (filters.roleId) params.set('roleId', String(filters.roleId))
  if (filters.birthYearFrom) params.set('birthYearFrom', String(filters.birthYearFrom))
  if (filters.birthYearTo) params.set('birthYearTo', String(filters.birthYearTo))
  if (filters.deathYearFrom) params.set('deathYearFrom', String(filters.deathYearFrom))
  if (filters.deathYearTo) params.set('deathYearTo', String(filters.deathYearTo))
  if (filters.sortBy && filters.sortBy !== 'id') params.set('sortBy', filters.sortBy)
  const defaultOrder = (filters.sortBy === 'lastName' || filters.sortBy === 'birthDate') ? 'asc' : 'desc'
  if (filters.sortOrder && filters.sortOrder !== defaultOrder) params.set('sortOrder', filters.sortOrder)
  if (view !== 'compact') params.set('view', view)

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function countActive(filters: PersonFilters): number {
  let count = 0
  if (filters.search) count++
  if (filters.gender) count++
  if (filters.birthLocationId) count++
  if (filters.deathLocationId) count++
  if (filters.nationalityId) count++
  if (filters.roleId) count++
  if (filters.birthYearFrom) count++
  if (filters.birthYearTo) count++
  if (filters.deathYearFrom) count++
  if (filters.deathYearTo) count++
  return count
}

// ─── YearInput (debounced, 750ms) ────────────────────────────────

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

export default function PersonasFilterBar({
  filterOptions,
  activeFilters,
  viewMode: initialViewMode,
}: PersonasFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(() => countActive(activeFilters) > 0)

  const sortBy = activeFilters.sortBy || 'id'
  const sortOrder = activeFilters.sortOrder || 'desc'
  const viewMode = initialViewMode
  const activeCount = countActive(activeFilters)

  function navigate(newFilters: PersonFilters, newView?: ViewMode) {
    const url = '/listados/personas' + filtersToSearchParams(newFilters, newView || viewMode)
    startTransition(() => {
      router.push(url, { scroll: false })
    })
  }

  function handleFilterChange(key: keyof PersonFilters, value: string | number | undefined) {
    const updated = { ...activeFilters, [key]: value || undefined }
    navigate(updated)
  }

  function handleClearFilters() {
    navigate({ sortBy, sortOrder })
  }

  function handleSortByChange(newSortBy: string) {
    const defaultOrder = (newSortBy === 'lastName' || newSortBy === 'birthDate') ? 'asc' : 'desc'
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
      {/* Loading overlay */}
      {isPending && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-background/30" />
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
            {SORT_OPTIONS.map((option) => (
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
            {/* Género */}
            <FilterSelect
              label="Género"
              value={activeFilters.gender || ''}
              onChange={(v) => handleFilterChange('gender', v)}
            >
              {GENDER_OPTIONS.filter((o) => o.value !== '').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>

            {/* Nacionalidad */}
            <FilterSelect
              label="Nacionalidad"
              value={activeFilters.nationalityId ? String(activeFilters.nationalityId) : ''}
              onChange={(v) => handleFilterChange('nationalityId', v ? parseInt(v) : undefined)}
            >
              {filterOptions.nationalities.map((nat) => (
                <option key={nat.id} value={nat.id}>
                  {nat.name} ({nat.count})
                </option>
              ))}
            </FilterSelect>

            {/* Lugar de nacimiento */}
            <FilterSelect
              label="Lugar de nacimiento"
              value={activeFilters.birthLocationId ? String(activeFilters.birthLocationId) : ''}
              onChange={(v) => handleFilterChange('birthLocationId', v ? parseInt(v) : undefined)}
            >
              {filterOptions.birthLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.fullPath} ({loc.count})
                </option>
              ))}
            </FilterSelect>

            {/* Lugar de muerte */}
            <FilterSelect
              label="Lugar de muerte"
              value={activeFilters.deathLocationId ? String(activeFilters.deathLocationId) : ''}
              onChange={(v) => handleFilterChange('deathLocationId', v ? parseInt(v) : undefined)}
            >
              {filterOptions.deathLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.fullPath} ({loc.count})
                </option>
              ))}
            </FilterSelect>

            {/* Rol */}
            <FilterSelect
              label="Rol"
              value={activeFilters.roleId ? String(activeFilters.roleId) : ''}
              onChange={(v) => handleFilterChange('roleId', v || undefined)}
            >
              {filterOptions.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.count})
                </option>
              ))}
            </FilterSelect>

            {/* Year inputs with debounce */}
            <YearInput
              label="Nació desde"
              value={activeFilters.birthYearFrom}
              onChange={(v) => handleFilterChange('birthYearFrom', v)}
            />
            <YearInput
              label="Nació hasta"
              value={activeFilters.birthYearTo}
              onChange={(v) => handleFilterChange('birthYearTo', v)}
            />
            <YearInput
              label="Murió desde"
              value={activeFilters.deathYearFrom}
              onChange={(v) => handleFilterChange('deathYearFrom', v)}
            />
            <YearInput
              label="Murió hasta"
              value={activeFilters.deathYearTo}
              onChange={(v) => handleFilterChange('deathYearTo', v)}
            />
          </div>
        </div>
      )}
    </>
  )
}
