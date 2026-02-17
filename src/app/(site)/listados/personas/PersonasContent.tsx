// src/app/(site)/listados/personas/PersonasContent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import PersonasFilters from './PersonasFilters';
import PersonasGrid from './PersonasGrid';
import ViewToggle from './ViewToggle';
import {
  PersonListFilters,
  DEFAULT_PERSON_FILTERS,
  FiltersDataResponse,
  PersonWithMovie,
  ViewMode,
  SORT_OPTIONS
} from '@/lib/people/personListTypes';
import {
  searchParamsToFilters,
  filtersToSearchParams,
  filtersToApiParams,
  countActiveFilters,
  clearFilters,
  hasActiveFilters,
  buildTitle,
  buildSubtitle,
  buildPageNumbers
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
  const [filters, setFilters] = useState<PersonListFilters>({
    ...DEFAULT_PERSON_FILTERS,
    limit: 24
  });
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
    setFilters(prev => ({ ...urlFilters, limit: prev.limit }));
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

  // Limit dinámico según viewMode
  useEffect(() => {
    const newLimit = viewMode === 'compact' ? 24 : 12;
    setFilters(prev => {
      if (prev.limit === newLimit) return prev;
      return { ...prev, limit: newLimit, page: 1 };
    });
  }, [viewMode]);

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
      page: 1
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(clearFilters(filters));
  }, [filters]);

  const handleSortByChange = useCallback((sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as PersonListFilters['sortBy'],
      page: 1
    }));
  }, []);

  const handleToggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
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
  const subtitle = buildSubtitle(filters);
  const pageNumbers = buildPageNumbers(pagination.page, pagination.totalPages);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      {/* Título dinámico */}
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        {buildTitle(filters, filtersData)}
      </h1>

      {/* Subtítulo de orden */}
      <p className="mt-1 text-[13px] text-muted-foreground/50 md:text-sm">
        {subtitle}
      </p>

      {/* Contador */}
      {pagination.totalCount > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {pagination.totalCount.toLocaleString('es-AR')} persona{pagination.totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border/20 pb-4">
        {/* Select de ordenamiento */}
        <div className="relative">
          <select
            value={filters.sortBy || 'id'}
            onChange={(e) => handleSortByChange(e.target.value)}
            className="h-8 appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
        </div>

        {/* Botón dirección de orden */}
        <button
          onClick={handleToggleSortOrder}
          className="flex h-8 w-8 items-center justify-center border border-border/30 text-muted-foreground/50 transition-colors hover:border-accent/30 hover:text-accent"
          title={filters.sortOrder === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
        >
          <ArrowDownUp className={`h-3.5 w-3.5 transition-transform ${filters.sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </button>

        {/* Botón Filtros */}
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
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-accent/20 px-1.5 py-px text-[9px] text-accent">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Botón Limpiar filtros */}
        {hasActiveFilters(filters) && (
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

        {/* Toggle de vista */}
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <PersonasFilters
          filters={filters}
          filtersData={filtersData}
          isLoading={isLoadingFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Grid de personas */}
      <PersonasGrid
        people={people}
        isLoading={isLoading}
        viewMode={viewMode}
      />

      {/* Paginación */}
      {!isLoading && pagination.totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1">
          {/* Prev */}
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
          >
            &#8249;
          </button>

          {/* Números de página */}
          {pageNumbers.map((item, i) =>
            item === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/30"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                onClick={() => handlePageChange(item as number)}
                className={`flex h-8 w-8 items-center justify-center text-[12px] transition-colors ${
                  item === pagination.page
                    ? 'border border-accent/40 text-accent'
                    : 'text-muted-foreground/40 hover:text-accent'
                }`}
              >
                {item}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="flex h-8 w-8 items-center justify-center text-[12px] text-muted-foreground/40 transition-colors hover:text-accent disabled:opacity-30"
          >
            &#8250;
          </button>
        </nav>
      )}
    </div>
  );
}
