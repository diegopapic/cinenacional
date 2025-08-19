// src/hooks/useRoles.ts

import { useState, useEffect, useCallback } from 'react';
import { rolesService } from '@/services/roles.service';
import type { 
  Role, 
  RoleFilters, 
  PaginatedRolesResponse,
  Department 
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<RoleFilters>(defaultFilters);

  // Debounce search para evitar requests excesivos
  const debouncedSearch = useDebounce(filters.search || '', 300);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filtersToSend = {
        ...filters,
        search: debouncedSearch
      };
      
      const response: PaginatedRolesResponse = await rolesService.getAll(filtersToSend);
      
      setRoles(response.data);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setHasMore(response.hasMore);
      
    } catch (err) {
      console.error('Error loading roles:', err);
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      setRoles([]);
      setTotalCount(0);
      setTotalPages(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch]);

  // Cargar roles cuando cambien los filtros
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Reset a página 1 cuando cambien filtros (excepto page)
  useEffect(() => {
    if (filters.page !== 1) {
      setFilters(prev => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearch, filters.department, filters.isActive, filters.isMainRole]);

  const deleteRole = useCallback(async (id: number) => {
    await rolesService.delete(id);
    await loadRoles(); // Recargar lista
  }, [loadRoles]);

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
    const result = await rolesService.seedDefault();
    await loadRoles(); // Recargar lista
    return result;
  }, [loadRoles]);

  const updateFilter = useCallback(<K extends keyof RoleFilters>(
    key: K, 
    value: RoleFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page cuando no sea un cambio de página
      ...(key !== 'page' ? { page: 1 } : {})
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<RoleFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset page en cambios múltiples
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
    // Datos
    roles,
    totalCount,
    totalPages,
    hasMore,
    currentPage,
    pageSize,
    
    // Estado
    loading,
    error,
    filters,
    
    // Acciones principales
    loadRoles,
    deleteRole,
    exportToCSV,
    seedDefault,
    
    // Gestión de filtros
    updateFilter,
    updateFilters,
    resetFilters,
    
    // Navegación
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious
  };
}