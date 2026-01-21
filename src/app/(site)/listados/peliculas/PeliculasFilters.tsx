// src/app/(site)/listados/peliculas/PeliculasFilters.tsx
'use client';

import { useMemo } from 'react';
import {
  MovieListFilters,
  MovieFiltersDataResponse
} from '@/lib/movies/movieListTypes';
import { generateYearOptions } from '@/lib/movies/movieListUtils';

interface PeliculasFiltersProps {
  filters: MovieListFilters;
  filtersData: MovieFiltersDataResponse | null;
  isLoading: boolean;
  onFilterChange: <K extends keyof MovieListFilters>(key: K, value: MovieListFilters[K]) => void;
  onClearFilters: () => void;
}

export default function PeliculasFilters({
  filters,
  filtersData,
  isLoading,
  onFilterChange,
  onClearFilters
}: PeliculasFiltersProps) {
  // Generar arrays de años para los selectores de producción
  // Usar releaseYear como fallback si productionYear es null
  const productionYears = useMemo(() => {
    const min = filtersData?.years.productionYearMin || filtersData?.years.releaseYearMin;
    const max = filtersData?.years.productionYearMax || filtersData?.years.releaseYearMax;
    if (!min || !max) return [];
    return generateYearOptions(min, max);
  }, [filtersData?.years]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
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
        {/* Sonido */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Sonido</label>
          <select
            value={filters.soundType || ''}
            onChange={(e) => onFilterChange('soundType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {filtersData?.soundTypes.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} {opt.count !== undefined && `(${opt.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Color</label>
          <select
            value={filters.colorTypeId || ''}
            onChange={(e) => onFilterChange('colorTypeId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {filtersData?.colorTypes.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} {opt.count !== undefined && `(${opt.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de duración */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Tipo de duración</label>
          <select
            value={filters.tipoDuracion || ''}
            onChange={(e) => onFilterChange('tipoDuracion', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {filtersData?.durationTypes.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} {opt.count !== undefined && `(${opt.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* País coproductor */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Países coproductores</label>
          <select
            value={filters.countryId || ''}
            onChange={(e) => onFilterChange('countryId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {filtersData?.countries.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} {opt.count !== undefined && `(${opt.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* Género */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Género</label>
          <select
            value={filters.genreId || ''}
            onChange={(e) => onFilterChange('genreId', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {filtersData?.genres.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name} {opt.count !== undefined && `(${opt.count})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Fechas de estreno (date pickers) y años de producción */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Fecha de estreno desde */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Estrenada desde</label>
          <input
            type="date"
            value={filters.releaseDateFrom || ''}
            onChange={(e) => onFilterChange('releaseDateFrom', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent [color-scheme:dark]"
          />
        </div>

        {/* Fecha de estreno hasta */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Estrenada hasta</label>
          <input
            type="date"
            value={filters.releaseDateTo || ''}
            onChange={(e) => onFilterChange('releaseDateTo', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent [color-scheme:dark]"
          />
        </div>

        {/* Año de producción desde */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Producida desde</label>
          <select
            value={filters.productionYearFrom || ''}
            onChange={(e) => onFilterChange('productionYearFrom', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {productionYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Año de producción hasta */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-400 font-medium">Producida hasta</label>
          <select
            value={filters.productionYearTo || ''}
            onChange={(e) => onFilterChange('productionYearTo', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {productionYears.map(year => (
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
