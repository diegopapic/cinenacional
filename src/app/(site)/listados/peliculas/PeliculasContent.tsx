// src/app/(site)/listados/peliculas/PeliculasContent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import PeliculasFilters from './PeliculasFilters';
import PeliculasGrid from './PeliculasGrid';
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle';
import {
  MovieListFilters,
  DEFAULT_MOVIE_FILTERS,
  MovieFiltersDataResponse,
  MovieListItem,
  MOVIE_SORT_OPTIONS
} from '@/lib/movies/movieListTypes';
import Pagination from '@/components/shared/Pagination';
import {
  searchParamsToFilters,
  filtersToSearchParams,
  filtersToApiParams,
  countActiveFilters,
  clearFilters,
  hasActiveFilters,
  buildTitle,
  buildSubtitle,
} from '@/lib/movies/movieListUtils';

interface PaginationState {
  page: number;
  totalPages: number;
  totalCount: number;
}

export default function PeliculasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado de filtros
  const [filters, setFilters] = useState<MovieListFilters>({
    ...DEFAULT_MOVIE_FILTERS,
    limit: 24
  });
  const [filtersData, setFiltersData] = useState<MovieFiltersDataResponse | null>(null);

  // Estado de datos
  const [movies, setMovies] = useState<MovieListItem[]>([]);
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

  // Cargar películas cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return;
    loadMovies();
  }, [filters, isInitialized]);

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return;

    const params = filtersToSearchParams(filters);
    const queryString = params.toString();
    const newUrl = queryString ? `/listados/peliculas?${queryString}` : '/listados/peliculas';

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
      const response = await fetch('/api/movies/filters');
      if (!response.ok) throw new Error('Error al cargar filtros');
      const data = await response.json();
      setFiltersData(data);
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const loadMovies = async () => {
    setIsLoading(true);
    try {
      const apiParams = filtersToApiParams(filters);
      const params = new URLSearchParams(apiParams);

      const response = await fetch(`/api/movies/list?${params}`);
      if (!response.ok) throw new Error('Error al cargar películas');

      const data = await response.json();

      setMovies(data.data || []);
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        totalCount: data.totalCount || 0
      });
    } catch (error) {
      console.error('Error loading movies:', error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = useCallback(<K extends keyof MovieListFilters>(
    key: K,
    value: MovieListFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset a página 1 cuando cambia un filtro
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(clearFilters(filters));
  }, [filters]);

  const handleSortByChange = useCallback((sortBy: string) => {
    const defaultOrder = (sortBy === 'title') ? 'asc' : 'desc';
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as MovieListFilters['sortBy'],
      sortOrder: defaultOrder,
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
          {pagination.totalCount.toLocaleString('es-AR')} película{pagination.totalCount !== 1 ? 's' : ''}
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
            {MOVIE_SORT_OPTIONS.map(option => (
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
            <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-px text-[9px] text-accent">
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
        <PeliculasFilters
          filters={filters}
          filtersData={filtersData}
          isLoading={isLoadingFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Grid de películas */}
      <PeliculasGrid
        movies={movies}
        isLoading={isLoading}
        viewMode={viewMode}
      />

      {/* Paginación */}
      {!isLoading && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
