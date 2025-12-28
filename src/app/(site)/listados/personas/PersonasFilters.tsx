// src/app/(site)/listados/personas/PersonasFilters.tsx
'use client';

import { useMemo } from 'react';
import { 
  PersonListFilters, 
  FiltersDataResponse,
  GENDER_OPTIONS
} from '@/lib/people/personListTypes';
import { generateYearOptions } from '@/lib/people/personListUtils';

interface PersonasFiltersProps {
  filters: PersonListFilters;
  filtersData: FiltersDataResponse | null;
  isLoading: boolean;
  onFilterChange: <K extends keyof PersonListFilters>(key: K, value: PersonListFilters[K]) => void;
  onClearFilters: () => void;
}

export default function PersonasFilters({
  filters,
  filtersData,
  isLoading,
  onFilterChange,
  onClearFilters
}: PersonasFiltersProps) {
  // Generar arrays de años para los selectores
  const birthYears = useMemo(() => {
    if (!filtersData?.years.birthYearMin || !filtersData?.years.birthYearMax) return [];
    return generateYearOptions(filtersData.years.birthYearMin, filtersData.years.birthYearMax);
  }, [filtersData?.years]);

  const deathYears = useMemo(() => {
    if (!filtersData?.years.deathYearMin || !filtersData?.years.deathYearMax) return [];
    return generateYearOptions(filtersData.years.deathYearMin, filtersData.years.deathYearMax);
  }, [filtersData?.years]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 border-t border-gray-800">
      {/* Fila 1: Filtros principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Género */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Género</label>
          <select
            value={filters.gender || ''}
            onChange={(e) => onFilterChange('gender', e.target.value as PersonListFilters['gender'])}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {GENDER_OPTIONS.filter(o => o.value !== '').map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Nacionalidad */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Nacionalidad</label>
          <select
            value={filters.nationalityId || ''}
            onChange={(e) => onFilterChange('nationalityId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {filtersData?.nationalities.map(nat => (
              <option key={nat.id} value={nat.id}>
                {nat.name} ({nat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Lugar de nacimiento */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Lugar de nacimiento</label>
          <select
            value={filters.birthLocationId || ''}
            onChange={(e) => onFilterChange('birthLocationId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {filtersData?.birthLocations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.fullPath} ({loc.count})
              </option>
            ))}
          </select>
        </div>

        {/* Lugar de muerte */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Lugar de muerte</label>
          <select
            value={filters.deathLocationId || ''}
            onChange={(e) => onFilterChange('deathLocationId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {filtersData?.deathLocations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.fullPath} ({loc.count})
              </option>
            ))}
          </select>
        </div>

        {/* Rol */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Rol</label>
          <select
            value={filters.roleId || ''}
            onChange={(e) => {
              const value = e.target.value;
              // ACTOR y SELF son strings especiales, el resto son IDs numéricos
              if (value === 'ACTOR' || value === 'SELF') {
                onFilterChange('roleId', value);
              } else if (value) {
                onFilterChange('roleId', parseInt(value));
              } else {
                onFilterChange('roleId', '');
              }
            }}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {filtersData?.roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Rangos de años */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Año de nacimiento desde */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Nació desde el año</label>
          <select
            value={filters.birthYearFrom || ''}
            onChange={(e) => onFilterChange('birthYearFrom', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {birthYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Año de nacimiento hasta */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Nació hasta el año</label>
          <select
            value={filters.birthYearTo || ''}
            onChange={(e) => onFilterChange('birthYearTo', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {birthYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Año de muerte desde */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Murió desde el año</label>
          <select
            value={filters.deathYearFrom || ''}
            onChange={(e) => onFilterChange('deathYearFrom', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {deathYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Año de muerte hasta */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Murió hasta el año</label>
          <select
            value={filters.deathYearTo || ''}
            onChange={(e) => onFilterChange('deathYearTo', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value=""></option>
            {deathYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
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