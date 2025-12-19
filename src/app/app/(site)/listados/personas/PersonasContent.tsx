// src/app/(site)/listados/personas/PersonasContent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonasFilters from './PersonasFilters';
import PersonasGrid from './PersonasGrid';
import ViewToggle from './ViewToggle';
import { 
  PersonListFilters, 
  DEFAULT_PERSON_FILTERS,
  FiltersDataResponse,
  PersonWithMovie,
  ViewMode
} from '@/lib/people/personListTypes';
import { 
  searchParamsToFilters, 
  filtersToSearchParams,
  filtersToApiParams,
  countActiveFilters,
  clearFilters
} from '@/lib/people/personListUtils';

interface PaginationState {
  page: number;
  totalPages: number;
  totalCount: number;
}

export default function PersonasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado de filtros
  const [filters, setFilters] = useState<PersonListFilters>(DEFAULT_PERSON_FILTERS);
  const [filtersData, setFiltersData] = useState<FiltersDataResponse | null>(null);
  
  // Estado de datos
  const [people, setPeople] = useState<PersonWithMovie[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    totalPages: 1,
    totalCount: 0
  });
  
  // Estado de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [showFilters, setShowFilters] = useState(false);

  // Cargar opciones de filtros al montar
  useEffect(() => {
    loadFiltersData();
  }, []);

  // Inicializar filtros desde URL
  useEffect(() => {
    const urlFilters = searchParamsToFilters(searchParams);
    setFilters(urlFilters);
    setIsInitialized(true);
  }, []);

  // Cargar personas cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return;
    loadPeople();
  }, [filters, isInitialized]);

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return;
    
    const params = filtersToSearchParams(filters);
    const queryString = params.toString();
    const newUrl = queryString ? `/listados/personas?${queryString}` : '/listados/personas';
    
    router.replace(newUrl, { scroll: false });
  }, [filters, router, isInitialized]);

  const loadFiltersData = async () => {
    setIsLoadingFilters(true);
    try {
      const response = await fetch('/api/people/filters');
      if (!response.ok) throw new Error('Error al cargar filtros');
      const data = await response.json();
      setFiltersData(data);
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const loadPeople = async () => {
    setIsLoading(true);
    try {
      const apiParams = filtersToApiParams(filters);
      const params = new URLSearchParams(apiParams);
      
      const response = await fetch(`/api/people/list?${params}`);
      if (!response.ok) throw new Error('Error al cargar personas');
      
      const data = await response.json();
      
      setPeople(data.data || []);
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        totalCount: data.totalCount || 0
      });
    } catch (error) {
      console.error('Error loading people:', error);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = useCallback(<K extends keyof PersonListFilters>(
    key: K, 
    value: PersonListFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset a página 1 cuando cambia un filtro
    }));
  }, []);

  const handleMultipleFiltersChange = useCallback((newFilters: Partial<PersonListFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(clearFilters(filters));
  }, [filters]);

  const handleSortChange = useCallback((sortValue: string) => {
    const [sortBy, sortOrder] = sortValue.split('-') as [PersonListFilters['sortBy'], PersonListFilters['sortOrder']];
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder,
      page: 1
    }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const activeFiltersCount = countActiveFilters(filters);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            {/* Título y contador */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Personas</h1>
                {pagination.totalCount > 0 && (
                  <p className="text-gray-400 text-sm mt-1">
                    {pagination.totalCount.toLocaleString('es-AR')} persona{pagination.totalCount !== 1 ? 's' : ''}
                    {activeFiltersCount > 0 && ` (${activeFiltersCount} filtro${activeFiltersCount !== 1 ? 's' : ''} activo${activeFiltersCount !== 1 ? 's' : ''})`}
                  </p>
                )}
              </div>

              {/* Controles de vista y filtros */}
              <div className="flex items-center gap-3">
                <ViewToggle 
                  viewMode={viewMode} 
                  onChange={setViewMode} 
                />
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${showFilters 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                    }
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-orange-500 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Panel de filtros */}
            {showFilters && (
              <PersonasFilters
                filters={filters}
                filtersData={filtersData}
                isLoading={isLoadingFilters}
                onFilterChange={handleFilterChange}
                onMultipleFiltersChange={handleMultipleFiltersChange}
                onClearFilters={handleClearFilters}
                onSortChange={handleSortChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Grid de personas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PersonasGrid
          people={people}
          isLoading={isLoading}
          viewMode={viewMode}
        />

        {/* Paginación */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${pagination.page === 1
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                }
              `}
            >
              ← Anterior
            </button>

            <span className="text-gray-400">
              Página {pagination.page} de {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${pagination.page === pagination.totalPages
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                }
              `}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
