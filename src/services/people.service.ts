// src/services/people.service.ts

import { apiClient } from './api-client';
import { 
  Person, 
  PersonWithRelations, 
  PersonFormData, 
  PersonFilters,
  PaginatedPeopleResponse 
} from '@/lib/people/peopleTypes';
import { formatPersonFormDataForAPI } from '@/lib/people/peopleUtils';

interface PersonSearchResult {
  id: number;
  name: string;
  slug?: string;
}

export const peopleService = {
  /**
   * Obtiene una lista paginada de personas con filtros
   */
  async getAll(filters: PersonFilters = {}): Promise<PaginatedPeopleResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.hasLinks !== undefined && filters.hasLinks !== '') {
      params.append('hasLinks', String(filters.hasLinks));
    }
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.append('isActive', String(filters.isActive));
    }
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    return apiClient.get<PaginatedPeopleResponse>(`/people?${params}`);
  },

  /**
   * Busca personas por nombre (para autocomplete)
   */
  async search(query: string, limit: number = 10): Promise<PersonSearchResult[]> {
    if (query.length < 2) return [];

    try {
      return await apiClient.get<PersonSearchResult[]>(
        `/people?search=${encodeURIComponent(query)}&limit=${limit}`
      );
    } catch (error) {
      console.error('Error searching people:', error);
      return [];
    }
  },

  /**
   * Obtiene una persona por ID con todas sus relaciones
   */
  async getById(id: number): Promise<PersonWithRelations> {
    return apiClient.get<PersonWithRelations>(`/people/${id}`);
  },

  /**
   * Crea una nueva persona
   */
  async create(data: PersonFormData): Promise<PersonWithRelations> {
    const formattedData = formatPersonFormDataForAPI(data);
    return apiClient.post<PersonWithRelations>('/people', formattedData);
  },

  /**
   * Crea una persona rápida (solo con nombre)
   */
  async createQuick(name: string): Promise<Person> {
    return apiClient.post<Person>('/people', { name });
  },

  /**
   * Actualiza una persona
   */
  async update(id: number, data: PersonFormData): Promise<PersonWithRelations> {
    const formattedData = formatPersonFormDataForAPI(data);
    return apiClient.put<PersonWithRelations>(`/people/${id}`, formattedData);
  },

  /**
   * Elimina una persona
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/people/${id}`);
  },

  /**
   * Verifica si un slug está disponible
   */
  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    const params = new URLSearchParams({ slug });
    if (excludeId) params.append('excludeId', String(excludeId));
    
    const { available } = await apiClient.get<{ available: boolean }>(
      `/people/check-slug?${params}`
    );
    return available;
  },

  /**
   * Obtiene estadísticas de personas
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    withLinks: number;
    byGender: Record<string, number>;
  }> {
    return apiClient.get('/people/stats');
  },

  /**
   * Exporta personas a CSV
   */
  async exportToCSV(filters: PersonFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.hasLinks !== undefined) {
      params.append('hasLinks', String(filters.hasLinks));
    }
    if (filters.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }

    // Usamos fetch directamente para manejar el blob
    const response = await fetch(`/api/people/export?${params}`);
    
    if (!response.ok) {
      throw new Error('Error al exportar personas');
    }
    
    return response.blob();
  }
};