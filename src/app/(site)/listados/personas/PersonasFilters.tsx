// src/app/(site)/listados/personas/PersonasFilters.tsx
'use client';

import { ChevronDown } from 'lucide-react';
import {
  PersonListFilters,
  FiltersDataResponse,
  GENDER_OPTIONS
} from '@/lib/people/personListTypes';

interface PersonasFiltersProps {
  filters: PersonListFilters;
  filtersData: FiltersDataResponse | null;
  isLoading: boolean;
  onFilterChange: <K extends keyof PersonListFilters>(key: K, value: PersonListFilters[K]) => void;
  onClearFilters: () => void;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
      </div>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Año'}
        min={min}
        max={max}
        className="h-8 w-full border border-border/30 bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-accent/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

export default function PersonasFilters({
  filters,
  filtersData,
  isLoading,
  onFilterChange,
}: PersonasFiltersProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse border-b border-border/20 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-16 rounded bg-muted/30" />
              <div className="h-8 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border/20 py-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {/* Género */}
        <FilterSelect
          label="Género"
          value={filters.gender || ''}
          onChange={(v) => onFilterChange('gender', v as PersonListFilters['gender'])}
        >
          <option value="">Todos</option>
          {GENDER_OPTIONS.filter(o => o.value !== '').map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        {/* Nacionalidad */}
        <FilterSelect
          label="Nacionalidad"
          value={filters.nationalityId || ''}
          onChange={(v) => onFilterChange('nationalityId', v ? parseInt(v) : '')}
        >
          <option value="">Todos</option>
          {filtersData?.nationalities.map(nat => (
            <option key={nat.id} value={nat.id}>
              {nat.name} ({nat.count})
            </option>
          ))}
        </FilterSelect>

        {/* Lugar de nacimiento */}
        <FilterSelect
          label="Lugar de nacimiento"
          value={filters.birthLocationId || ''}
          onChange={(v) => onFilterChange('birthLocationId', v ? parseInt(v) : '')}
        >
          <option value="">Todos</option>
          {filtersData?.birthLocations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.fullPath} ({loc.count})
            </option>
          ))}
        </FilterSelect>

        {/* Lugar de muerte */}
        <FilterSelect
          label="Lugar de muerte"
          value={filters.deathLocationId || ''}
          onChange={(v) => onFilterChange('deathLocationId', v ? parseInt(v) : '')}
        >
          <option value="">Todos</option>
          {filtersData?.deathLocations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.fullPath} ({loc.count})
            </option>
          ))}
        </FilterSelect>

        {/* Rol */}
        <FilterSelect
          label="Rol"
          value={filters.roleId || ''}
          onChange={(v) => {
            if (v === 'ACTOR' || v === 'SELF') {
              onFilterChange('roleId', v);
            } else if (v) {
              onFilterChange('roleId', parseInt(v));
            } else {
              onFilterChange('roleId', '');
            }
          }}
        >
          <option value="">Todos</option>
          {filtersData?.roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name} ({role.count})
            </option>
          ))}
        </FilterSelect>

        {/* Nació desde */}
        <FilterInput
          label="Nació desde"
          value={filters.birthYearFrom || ''}
          onChange={(v) => onFilterChange('birthYearFrom', v ? parseInt(v) : '')}
          min={filtersData?.years.birthYearMin || undefined}
          max={filtersData?.years.birthYearMax || undefined}
        />

        {/* Nació hasta */}
        <FilterInput
          label="Nació hasta"
          value={filters.birthYearTo || ''}
          onChange={(v) => onFilterChange('birthYearTo', v ? parseInt(v) : '')}
          min={filtersData?.years.birthYearMin || undefined}
          max={filtersData?.years.birthYearMax || undefined}
        />

        {/* Murió desde */}
        <FilterInput
          label="Murió desde"
          value={filters.deathYearFrom || ''}
          onChange={(v) => onFilterChange('deathYearFrom', v ? parseInt(v) : '')}
          min={filtersData?.years.deathYearMin || undefined}
          max={filtersData?.years.deathYearMax || undefined}
        />

        {/* Murió hasta */}
        <FilterInput
          label="Murió hasta"
          value={filters.deathYearTo || ''}
          onChange={(v) => onFilterChange('deathYearTo', v ? parseInt(v) : '')}
          min={filtersData?.years.deathYearMin || undefined}
          max={filtersData?.years.deathYearMax || undefined}
        />
      </div>
    </div>
  );
}
