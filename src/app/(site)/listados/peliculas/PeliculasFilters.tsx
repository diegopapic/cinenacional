// src/app/(site)/listados/peliculas/PeliculasFilters.tsx
'use client';

import { useState, useRef, useMemo } from 'react';
import { ChevronDown, CalendarDays } from 'lucide-react';
import {
  MovieListFilters,
  MovieFiltersDataResponse
} from '@/lib/movies/movieListTypes';

interface PeliculasFiltersProps {
  filters: MovieListFilters;
  filtersData: MovieFiltersDataResponse | null;
  isLoading: boolean;
  onFilterChange: <K extends keyof MovieListFilters>(key: K, value: MovieListFilters[K]) => void;
  onClearFilters: () => void;
}

/* ── FilterSelect ─────────────────────────────────────── */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number | '';
  options: Array<{ id: number | string; name: string; count?: number }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none cursor-pointer [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
        >
          <option value="">Todos</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.name} {opt.count !== undefined && `(${opt.count})`}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
      </div>
    </div>
  );
}

/* ── DateInput ────────────────────────────────────────── */
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  function isoToDisplay(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }

  function handleFocus() {
    setDraft(isoToDisplay(value));
    setIsFocused(true);
  }

  function handleBlur() {
    setIsFocused(false);
    if (!draft) {
      onChange('');
      return;
    }
    const match = draft.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value;
    // Auto-insert slashes
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 2 && v.length === 2 && !v.includes('/')) {
      v = digits.slice(0, 2) + '/';
    } else if (digits.length >= 4 && v.length === 5 && v.charAt(2) === '/' && !v.slice(3).includes('/')) {
      v = v.slice(0, 3) + digits.slice(2, 4) + '/';
    }
    setDraft(v);
  }

  function handleDatePicker(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  const displayValue = isFocused ? draft : isoToDisplay(value);

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
          className="w-full bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-none placeholder:text-muted-foreground/25"
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
  );
}

/* ── FilterInput (year) ───────────────────────────────── */
function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | '';
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <input
        type="number"
        placeholder="Año"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full border border-border/30 bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-none placeholder:text-muted-foreground/25"
      />
    </div>
  );
}

/* ── Main Component ───────────────────────────────────── */
export default function PeliculasFilters({
  filters,
  filtersData,
  isLoading,
  onFilterChange,
  onClearFilters
}: PeliculasFiltersProps) {

  if (isLoading) {
    return (
      <div className="border-b border-border/20 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-2.5 w-16 rounded bg-muted/20" />
              <div className="h-8 rounded bg-muted/15" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border/20 py-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {/* Sonido */}
        <FilterSelect
          label="Sonido"
          value={filters.soundType || ''}
          options={filtersData?.soundTypes || []}
          onChange={(v) => onFilterChange('soundType', v)}
        />

        {/* Color */}
        <FilterSelect
          label="Color"
          value={filters.colorTypeId || ''}
          options={filtersData?.colorTypes || []}
          onChange={(v) => onFilterChange('colorTypeId', v ? parseInt(v) : '')}
        />

        {/* Tipo de duración */}
        <FilterSelect
          label="Tipo de duración"
          value={filters.tipoDuracion || ''}
          options={filtersData?.durationTypes || []}
          onChange={(v) => onFilterChange('tipoDuracion', v)}
        />

        {/* País coproductor */}
        <FilterSelect
          label="Países coproductores"
          value={filters.countryId || ''}
          options={filtersData?.countries || []}
          onChange={(v) => onFilterChange('countryId', v ? parseInt(v) : '')}
        />

        {/* Género */}
        <FilterSelect
          label="Género"
          value={filters.genreId || ''}
          options={filtersData?.genres || []}
          onChange={(v) => onFilterChange('genreId', v ? parseInt(v) : '')}
        />

        {/* Estrenada desde */}
        <DateInput
          label="Estrenada desde"
          value={filters.releaseDateFrom || ''}
          onChange={(v) => onFilterChange('releaseDateFrom', v)}
        />

        {/* Estrenada hasta */}
        <DateInput
          label="Estrenada hasta"
          value={filters.releaseDateTo || ''}
          onChange={(v) => onFilterChange('releaseDateTo', v)}
        />

        {/* Producida desde */}
        <FilterInput
          label="Producida desde"
          value={filters.productionYearFrom || ''}
          onChange={(v) => onFilterChange('productionYearFrom', v ? parseInt(v) : '')}
        />

        {/* Producida hasta */}
        <FilterInput
          label="Producida hasta"
          value={filters.productionYearTo || ''}
          onChange={(v) => onFilterChange('productionYearTo', v ? parseInt(v) : '')}
        />
      </div>
    </div>
  );
}
