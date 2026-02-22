// src/app/(site)/listados/personas/PersonasContent.tsx
'use client';

import PersonasFilters from './PersonasFilters';
import PersonasGrid from './PersonasGrid';
import ListToolbar from '@/components/shared/ListToolbar';
import Pagination from '@/components/shared/Pagination';
import { useListPage } from '@/hooks/useListPage';
import {
  PersonListFilters,
  DEFAULT_PERSON_FILTERS,
  FiltersDataResponse,
  PersonWithMovie,
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
} from '@/lib/people/personListUtils';

const personListConfig = {
  basePath: '/listados/personas',
  listEndpoint: '/api/people/list',
  filtersEndpoint: '/api/people/filters',
  defaultFilters: DEFAULT_PERSON_FILTERS,
  searchParamsToFilters,
  filtersToSearchParams,
  filtersToApiParams,
  countActiveFilters,
  hasActiveFilters,
  clearFilters,
  getDefaultSortOrder: (sortBy: string) =>
    (sortBy === 'lastName' || sortBy === 'birthDate' ? 'asc' : 'desc') as 'asc' | 'desc',
};

export default function PersonasContent() {
  const {
    filters,
    filtersData,
    items: people,
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
  } = useListPage<PersonListFilters, PersonWithMovie, FiltersDataResponse>(personListConfig);

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
          {pagination.totalCount.toLocaleString('es-AR')} persona{pagination.totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Toolbar */}
      <ListToolbar
        sortBy={filters.sortBy || 'id'}
        sortOrder={filters.sortOrder || 'desc'}
        sortOptions={SORT_OPTIONS}
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
