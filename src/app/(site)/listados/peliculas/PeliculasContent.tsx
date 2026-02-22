// src/app/(site)/listados/peliculas/PeliculasContent.tsx
'use client';

import PeliculasFilters from './PeliculasFilters';
import PeliculasGrid from './PeliculasGrid';
import ListToolbar from '@/components/shared/ListToolbar';
import Pagination from '@/components/shared/Pagination';
import { useListPage } from '@/hooks/useListPage';
import {
  MovieListFilters,
  DEFAULT_MOVIE_FILTERS,
  MovieFiltersDataResponse,
  MovieListItem,
  MOVIE_SORT_OPTIONS
} from '@/lib/movies/movieListTypes';
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

const movieListConfig = {
  basePath: '/listados/peliculas',
  listEndpoint: '/api/movies/list',
  filtersEndpoint: '/api/movies/filters',
  defaultFilters: DEFAULT_MOVIE_FILTERS,
  searchParamsToFilters,
  filtersToSearchParams,
  filtersToApiParams,
  countActiveFilters,
  hasActiveFilters,
  clearFilters,
  getDefaultSortOrder: (sortBy: string) => (sortBy === 'title' ? 'asc' : 'desc') as 'asc' | 'desc',
};

export default function PeliculasContent() {
  const {
    filters,
    filtersData,
    items: movies,
    pagination,
    isLoading,
    isLoadingFilters,
    viewMode,
    showFilters,
    activeFiltersCount,
    setViewMode,
    setShowFilters,
    handleFilterChange,
    handleClearFilters,
    handleSortByChange,
    handleToggleSortOrder,
    handlePageChange,
  } = useListPage<MovieListFilters, MovieListItem, MovieFiltersDataResponse>(movieListConfig);

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
      <ListToolbar
        sortBy={filters.sortBy || 'id'}
        sortOrder={filters.sortOrder || 'desc'}
        sortOptions={MOVIE_SORT_OPTIONS}
        activeFiltersCount={activeFiltersCount}
        hasActiveFilters={hasActiveFilters(filters)}
        showFilters={showFilters}
        viewMode={viewMode}
        onSortByChange={handleSortByChange}
        onToggleSortOrder={handleToggleSortOrder}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={handleClearFilters}
        onViewModeChange={setViewMode}
      />

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
