// src/hooks/useRoles.ts

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '@/services/roles.service';
import type {
  Role,
  RoleFilters,
  PaginatedRolesResponse,
} from '@/lib/roles/rolesTypes';
import { useDebounce } from './useDebounce';

interface UseRolesReturn {
  // Datos
  roles: Role[];
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;

  // Estado
  loading: boolean;
  error: Error | null;
  filters: RoleFilters;

  // Acciones principales
  loadRoles: () => Promise<void>;
  deleteRole: (id: number) => Promise<void>;
  exportToCSV: () => Promise<void>;
  seedDefault: () => Promise<{ created: number; skipped: number }>;

  // Gestión de filtros
  updateFilter: <K extends keyof RoleFilters>(key: K, value: RoleFilters[K]) => void;
  updateFilters: (filters: Partial<RoleFilters>) => void;
  resetFilters: () => void;

  // Navegación
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const defaultFilters: RoleFilters = {
  search: '',
  department: '',
  isActive: '',
  isMainRole: '',
  page: 1,
  limit: 20
};

export function useRoles(): UseRolesReturn {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RoleFilters>(defaultFilters);

  // Debounce search para evitar requests excesivos
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Query principal
  const { data, isLoading: loading, error, refetch } = useQuery<PaginatedRolesResponse>({
    queryKey: ['roles', { ...filters, search: debouncedSearch }],
    queryFn: () => rolesService.getAll({ ...filters, search: debouncedSearch }),
  });

  const roles = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = data?.hasMore ?? false;

  // Mutación: eliminar rol
  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  // Mutación: seed defaults
  const seedMutation = useMutation({
    mutationFn: () => rolesService.seedDefault(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteRole = useCallback(async (id: number) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const exportToCSV = useCallback(async () => {
    const blob = await rolesService.exportToCSV(filters);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roles_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [filters]);

  const seedDefault = useCallback(async () => {
    return seedMutation.mutateAsync();
  }, [seedMutation]);

  const updateFilter = useCallback(<K extends keyof RoleFilters>(
    key: K,
    value: RoleFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {})
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<RoleFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateFilter('page', page);
    }
  }, [totalPages, updateFilter]);

  const goToNextPage = useCallback(() => {
    if (hasMore) {
      goToPage((filters.page || 1) + 1);
    }
  }, [hasMore, filters.page, goToPage]);

  const goToPreviousPage = useCallback(() => {
    if ((filters.page || 1) > 1) {
      goToPage((filters.page || 1) - 1);
    }
  }, [filters.page, goToPage]);

  const canGoNext = hasMore;
  const canGoPrevious = (filters.page || 1) > 1;
  const currentPage = filters.page || 1;
  const pageSize = filters.limit || 20;

  return {
    roles,
    totalCount,
    totalPages,
    hasMore,
    currentPage,
    pageSize,
    loading,
    error: error instanceof Error ? error : null,
    filters,
    loadRoles: async () => { refetch() },
    deleteRole,
    exportToCSV,
    seedDefault,
    updateFilter,
    updateFilters,
    resetFilters,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  };
}
