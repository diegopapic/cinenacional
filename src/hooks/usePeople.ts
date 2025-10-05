// src/hooks/usePeople.ts

import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Referencia para el AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState<PersonFilters>({
    page: PEOPLE_PAGINATION.DEFAULT_PAGE,
    limit: PEOPLE_PAGINATION.DEFAULT_LIMIT,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    ...initialFilters,
  });
  
  // Debounce para búsqueda - aumentamos a 400ms para dar más tiempo cuando se escribe rápido
  const debouncedSearch = useDebounce(filters.search || '', 400);

  // Cargar personas con cancelación de requests anteriores
  const loadPeople = useCallback(async () => {
    try {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      const response = await peopleService.getAll({
        ...filters,
        search: debouncedSearch,
      }, abortControllerRef.current.signal); // Pasar el signal al servicio
      
      // Solo actualizar el estado si no fue cancelado
      if (!abortControllerRef.current.signal.aborted) {
        setPeople(response.data);
        setTotalCount(response.totalCount);
        setTotalPages(response.totalPages);
        setHasMore(response.hasMore);
      }
    } catch (err: any) {
      // Ignorar errores de cancelación
      if (err?.name === 'AbortError') {
        console.log('Request cancelado');
        return;
      }
      
      console.error('Error loading people:', err);
      setError(err as Error);
      
      // Solo mostrar toast si no es un error de cancelación
      if (!abortControllerRef.current?.signal.aborted) {
        toast.error('No se pudieron cargar las personas');
      }
    } finally {
      // Solo quitar loading si no fue cancelado
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters, debouncedSearch]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Efecto para cargar personas
  useEffect(() => {
    if (autoLoad) {
      loadPeople();
    }
    
    // Cleanup al cambiar los filtros
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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

  // Resto del código permanece igual...
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
    try {
      await peopleService.delete(id);
      toast.success('Persona eliminada correctamente');
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
      console.error('Error exporting to CSV:', err);
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
    error,
    filters,
    loadPeople,
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

// Los otros hooks (usePeopleSearch y usePerson) permanecen igual...

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