// src/app/(site)/listados/personas/PersonasFilters.tsx
'use client';

import { useState, useMemo } from 'react';
import { 
  PersonListFilters, 
  FiltersDataResponse,
  SORT_OPTIONS,
  GENDER_OPTIONS
} from '@/lib/people/personListTypes';
import { generateYearOptions } from '@/lib/people/personListUtils';

interface PersonasFiltersProps {
  filters: PersonListFilters;
  filtersData: FiltersDataResponse | null;
  isLoading: boolean;
  onFilterChange: <K extends keyof PersonListFilters>(key: K, value: PersonListFilters[K]) => void;
  onMultipleFiltersChange: (filters: Partial<PersonListFilters>) => void;
  onClearFilters: () => void;
  onSortChange: (sortValue: string) => void;
}

export default function PersonasFilters({
  filters,
  filtersData,
  isLoading,
  onFilterChange,
  onMultipleFiltersChange,
  onClearFilters,
  onSortChange
}: PersonasFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Generar arrays de años para los selectores
  const birthYears = useMemo(() => {
    if (!filtersData?.years.birthYearMin || !filtersData?.years.birthYearMax) return [];
    return generateYearOptions(filtersData.years.birthYearMin, filtersData.years.birthYearMax);
  }, [filtersData?.years]);

  const deathYears = useMemo(() => {
    if (!filtersData?.years.deathYearMin || !filtersData?.years.deathYearMax) return [];
    return generateYearOptions(filtersData.years.deathYearMin, filtersData.years.deathYearMax);
  }, [filtersData?.years]);

  // Valor actual del ordenamiento
  const currentSortValue = `${filters.sortBy || 'id'}-${filters.sortOrder || 'desc'}`;

  // Manejar búsqueda con debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange('search', searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFilterChange('search', searchInput);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 border-t border-gray-800">
      {/* Fila 1: Búsqueda y Ordenamiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Búsqueda */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar por nombre..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onFilterChange('search', '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Ordenamiento */}
        <select
          value={currentSortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fila 2: Filtros principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Sexo */}
        <select
          value={filters.gender || ''}
          onChange={(e) => onFilterChange('gender', e.target.value as PersonListFilters['gender'])}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {GENDER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Nacionalidad */}
        <select
          value={filters.nationalityId || ''}
          onChange={(e) => onFilterChange('nationalityId', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Todas las nacionalidades</option>
          {filtersData?.nationalities.map(nat => (
            <option key={nat.id} value={nat.id}>
              {nat.name} ({nat.count})
            </option>
          ))}
        </select>

        {/* Lugar de nacimiento */}
        <select
          value={filters.birthLocationId || ''}
          onChange={(e) => onFilterChange('birthLocationId', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Lugar de nacimiento</option>
          {filtersData?.birthLocations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.fullPath} ({loc.count})
            </option>
          ))}
        </select>

        {/* Lugar de muerte */}
        <select
          value={filters.deathLocationId || ''}
          onChange={(e) => onFilterChange('deathLocationId', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Lugar de fallecimiento</option>
          {filtersData?.deathLocations.map(loc => (
            <option key={loc.id} value={loc.id}>
              {loc.fullPath} ({loc.count})
            </option>
          ))}
        </select>

        {/* Rol */}
        <select
          value={filters.roleId || ''}
          onChange={(e) => onFilterChange('roleId', e.target.value === 'ACTOR' ? 'ACTOR' : e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Todos los roles</option>
          {filtersData?.roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name} ({role.count})
            </option>
          ))}
        </select>
      </div>

      {/* Fila 3: Rangos de años */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Año de nacimiento desde */}
        <select
          value={filters.birthYearFrom || ''}
          onChange={(e) => onFilterChange('birthYearFrom', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Nacimiento desde</option>
          {birthYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Año de nacimiento hasta */}
        <select
          value={filters.birthYearTo || ''}
          onChange={(e) => onFilterChange('birthYearTo', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Nacimiento hasta</option>
          {birthYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Año de muerte desde */}
        <select
          value={filters.deathYearFrom || ''}
          onChange={(e) => onFilterChange('deathYearFrom', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Fallecimiento desde</option>
          {deathYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Año de muerte hasta */}
        <select
          value={filters.deathYearTo || ''}
          onChange={(e) => onFilterChange('deathYearTo', e.target.value ? parseInt(e.target.value) : '')}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Fallecimiento hasta</option>
          {deathYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Botón limpiar filtros */}
      <div className="flex justify-end">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
