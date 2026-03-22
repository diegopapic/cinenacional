// src/hooks/usePeople.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { peopleService } from '@/services/people.service';
import {
  PersonFilters,
} from '@/lib/people/peopleTypes';
import { PEOPLE_PAGINATION } from '@/lib/people/peopleConstants';
import { toast } from 'react-hot-toast';
import { createLogger } from '@/lib/logger'

const log = createLogger('hook:people')

interface UsePeopleOptions {
  autoLoad?: boolean;
  initialFilters?: PersonFilters;
}

export function usePeople(options: UsePeopleOptions = {}) {
  const { autoLoad = true, initialFilters = {} } = options;
  const queryClient = useQueryClient();

  // Filtros
  const [filters, setFilters] = useState<PersonFilters>({
    page: PEOPLE_PAGINATION.DEFAULT_PAGE,
    limit: PEOPLE_PAGINATION.DEFAULT_LIMIT,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    ...initialFilters,
  });

  // Debounce para búsqueda
  const debouncedSearch = useDebounce(filters.search || '', 400);

  // Query principal
  const queryKey = ['people', { ...filters, search: debouncedSearch }];
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => peopleService.getAll({
      ...filters,
      search: debouncedSearch,
    }),
    enabled: autoLoad,
  });

  const people = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = data?.hasMore ?? false;

  // Mutación: eliminar
  const deleteMutation = useMutation({
    mutationFn: (id: number) => peopleService.delete(id),
    onSuccess: () => {
      toast.success('Persona eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (err) => {
      log.error('Failed to delete person', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Error al eliminar persona';
      toast.error(errorMessage);
    },
  });

  // Actualizar un filtro específico
  const updateFilter = useCallback(<K extends keyof PersonFilters>(
    key: K,
    value: PersonFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }),
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<PersonFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      ...(!newFilters.page && { page: 1 }),
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: PEOPLE_PAGINATION.DEFAULT_PAGE,
      limit: PEOPLE_PAGINATION.DEFAULT_LIMIT,
    });
  }, []);

  const goToPage = useCallback((page: number) => {
    updateFilter('page', page);
  }, [updateFilter]);

  const deletePerson = useCallback(async (id: number) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const exportToCSV = useCallback(async () => {
    try {
      const blob = await peopleService.exportToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personas-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Archivo CSV descargado correctamente');
    } catch (err) {
      log.error('Failed to export CSV', err);
      toast.error('No se pudo exportar a CSV');
    }
  }, [filters]);

  return {
    people,
    totalCount,
    totalPages,
    hasMore,
    currentPage: filters.page || 1,
    pageSize: filters.limit || PEOPLE_PAGINATION.DEFAULT_LIMIT,
    loading,
    error: error instanceof Error ? error : null,
    filters,
    loadPeople: async () => { refetch() },
    updateFilter,
    updateFilters,
    resetFilters,
    goToPage,
    deletePerson,
    exportToCSV,
    goToNextPage: () => goToPage((filters.page || 1) + 1),
    goToPreviousPage: () => goToPage(Math.max(1, (filters.page || 1) - 1)),
    canGoNext: hasMore,
    canGoPrevious: (filters.page || 1) > 1,
  };
}

// Hook para búsqueda simple (autocomplete)
export function usePeopleSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isLoading: loading } = useQuery({
    queryKey: ['people-search', debouncedQuery],
    queryFn: () => peopleService.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10 * 1000,
  });

  return {
    query,
    setQuery,
    results,
    loading,
    clearResults: () => setQuery(''),
  };
}

// Hook para una persona individual
export function usePerson(id: number | string | null) {
  const personId = id && id !== 'new' ? (typeof id === 'string' ? parseInt(id) : id) : null;

  const { data: person = null, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => peopleService.getById(personId!),
    enabled: personId !== null && !isNaN(personId),
  });

  return {
    person,
    loading,
    error: error instanceof Error ? error : null,
    reload: async () => { refetch() },
  };
}
