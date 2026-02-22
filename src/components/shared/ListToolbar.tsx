// src/components/shared/ListToolbar.tsx
'use client'

import { ArrowDownUp, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle'

interface SortOption {
  readonly value: string
  readonly label: string
}

interface ListToolbarProps {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  sortOptions: readonly SortOption[]
  activeFiltersCount: number
  hasActiveFilters: boolean
  showFilters: boolean
  viewMode: ViewMode
  onSortByChange: (sortBy: string) => void
  onToggleSortOrder: () => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onViewModeChange: (mode: ViewMode) => void
}

export default function ListToolbar({
  sortBy,
  sortOrder,
  sortOptions,
  activeFiltersCount,
  hasActiveFilters,
  showFilters,
  viewMode,
  onSortByChange,
  onToggleSortOrder,
  onToggleFilters,
  onClearFilters,
  onViewModeChange,
}: ListToolbarProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border/20 pb-4">
      {/* Select de ordenamiento */}
      <div className="relative">
        <select
          value={sortBy || 'id'}
          onChange={(e) => onSortByChange(e.target.value)}
          className="h-8 appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
      </div>

      {/* Botón dirección de orden */}
      <button
        onClick={onToggleSortOrder}
        className="flex h-8 w-8 items-center justify-center border border-border/30 text-muted-foreground/50 transition-colors hover:border-accent/30 hover:text-accent"
        title={sortOrder === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
      >
        <ArrowDownUp className={`h-3.5 w-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      </button>

      {/* Botón Filtros */}
      <button
        onClick={onToggleFilters}
        className={`flex h-8 items-center gap-1.5 border px-3 text-[12px] transition-colors ${
          showFilters
            ? 'border-accent/40 text-accent'
            : 'border-border/30 text-muted-foreground/60 hover:border-accent/30 hover:text-accent/80'
        }`}
      >
        <SlidersHorizontal className="h-3 w-3" />
        <span>Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="rounded-full bg-accent/20 px-1.5 py-px text-[9px] text-accent">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Botón Limpiar filtros */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex h-8 items-center gap-1 border border-border/20 px-3 text-[12px] text-muted-foreground/40 transition-colors hover:text-accent"
        >
          <X className="h-3 w-3" />
          <span>Limpiar filtros</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle de vista */}
      <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
    </div>
  )
}
