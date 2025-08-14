// src/hooks/usePeople.ts

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { peopleService } from '@/services/people.service';
import { 
  PersonWithRelations,
  PersonFilters,
  PaginatedPeopleResponse 
} from '@/lib/people/peopleTypes';
import { PEOPLE_PAGINATION } from '@/lib/people/peopleConstants';
import { toast } from 'react-hot-toast';

interface UsePeopleOptions {
  autoLoad?: boolean;
  initialFilters?: PersonFilters;
}

export function usePeople(options: UsePeopleOptions = {}) {
  const { autoLoad = true, initialFilters = {} } = options;
  
  // Estado
  const [people, setPeople] = useState<PersonWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState<PersonFilters>({
    page: PEOPLE_PAGINATION.DEFAULT_PAGE,
    limit: PEOPLE_PAGINATION.DEFAULT_LIMIT,
    ...initialFilters,
  });
  
  // Debounce para búsqueda
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Cargar personas
  const loadPeople = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await peopleService.getAll({
        ...filters,
        search: debouncedSearch,
      });
      
      setPeople(response.data);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Error loading people:', err);
      setError(err as Error);
      toast.error('No se pudieron cargar las personas');
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch]);

  // Efecto para cargar personas
  useEffect(() => {
    if (autoLoad) {
      loadPeople();
    }
  }, [loadPeople, autoLoad]);

  // Actualizar un filtro específico
  const updateFilter = useCallback(<K extends keyof PersonFilters>(
    key: K,
    value: PersonFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Resetear a página 1 cuando cambian otros filtros
      ...(key !== 'page' && { page: 1 }),
    }));
  }, []);

  // Actualizar múltiples filtros
  const updateFilters = useCallback((newFilters: Partial<PersonFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // Resetear a página 1 si no se está cambiando la página
      ...(!newFilters.page && { page: 1 }),
    }));
  }, []);

  // Resetear filtros
  const resetFilters = useCallback(() => {
    setFilters({
      page: PEOPLE_PAGINATION.DEFAULT_PAGE,
      limit: PEOPLE_PAGINATION.DEFAULT_LIMIT,
    });
  }, []);

  // Cambiar página
  const goToPage = useCallback((page: number) => {
    updateFilter('page', page);
  }, [updateFilter]);

  // Eliminar persona
  const deletePerson = useCallback(async (id: number) => {
    try {
      await peopleService.delete(id);
      
      toast.success('Persona eliminada correctamente');
      
      // Recargar lista después de eliminar
      await loadPeople();
    } catch (err) {
      console.error('Error deleting person:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al eliminar persona';
      
      toast.error(errorMessage);
      
      throw err;
    }
  }, [loadPeople]);

  // Exportar a CSV
  const exportToCSV = useCallback(async () => {
    try {
      const blob = await peopleService.exportToCSV(filters);
      
      // Crear enlace de descarga
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
      console.error('Error exporting to CSV:', err);
      toast.error('No se pudo exportar a CSV');
    }
  }, [filters]);

  return {
    // Datos
    people,
    totalCount,
    totalPages,
    hasMore,
    currentPage: filters.page || 1,
    pageSize: filters.limit || PEOPLE_PAGINATION.DEFAULT_LIMIT,
    
    // Estado
    loading,
    error,
    filters,
    
    // Acciones
    loadPeople,
    updateFilter,
    updateFilters,
    resetFilters,
    goToPage,
    deletePerson,
    exportToCSV,
    
    // Navegación
    goToNextPage: () => goToPage((filters.page || 1) + 1),
    goToPreviousPage: () => goToPage(Math.max(1, (filters.page || 1) - 1)),
    canGoNext: hasMore,
    canGoPrevious: (filters.page || 1) > 1,
  };
}

// Hook para búsqueda simple (autocomplete)
export function usePeopleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: number; name: string; slug?: string }>>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    const searchPeople = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await peopleService.search(debouncedQuery);
        setResults(data);
      } catch (error) {
        console.error('Error searching people:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    searchPeople();
  }, [debouncedQuery]);
  
  return {
    query,
    setQuery,
    results,
    loading,
    clearResults: () => setResults([]),
  };
}

// Hook para una persona individual
export function usePerson(id: number | string | null) {
  const [person, setPerson] = useState<PersonWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPerson = async () => {
      if (!id || id === 'new') {
        setPerson(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const personId = typeof id === 'string' ? parseInt(id) : id;
        const data = await peopleService.getById(personId);
        setPerson(data);
      } catch (err) {
        console.error('Error loading person:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerson();
  }, [id]);

  const reload = useCallback(async () => {
    if (!id || id === 'new') return;
    
    try {
      setLoading(true);
      const personId = typeof id === 'string' ? parseInt(id) : id;
      const data = await peopleService.getById(personId);
      setPerson(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { person, loading, error, reload };
}