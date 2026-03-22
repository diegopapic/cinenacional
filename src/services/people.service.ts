// src/services/people.service.ts

import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/lib/logger'
import {
  Person,
  PersonWithRelations,
  PersonFormData,
  PersonFilters,
  PersonLink,
  PaginatedPeopleResponse
} from '@/lib/people/peopleTypes';
import { processPartialDateForAPI, processPartialDateFromAPI } from '@/lib/shared/dateUtils';

export interface ExternalIdConflict {
  field: string;
  value: string;
  personId: number;
  personName: string;
}

export class ExternalIdConflictError extends Error {
  conflicts: ExternalIdConflict[];
  constructor(conflicts: ExternalIdConflict[]) {
    super('ID duplicado');
    this.name = 'ExternalIdConflictError';
    this.conflicts = conflicts;
  }
}

interface PersonSearchResult {
  id: number;
  name: string;
  slug?: string;
}

/**
* Formatea los datos del formulario para enviar a la API
* Convierte las fechas completas o parciales al formato esperado por el backend
*/
interface PersonApiPayload extends Record<string, unknown> {
  firstName?: string | null
  lastName?: string | null
  realName?: string | null
  gender?: string | null
  hideAge?: boolean
  isActive?: boolean
  birthLocationId?: number | null
  deathLocationId?: number | null
  biography?: string | null
  photoUrl?: string | null
  photoPublicId?: string
  imdbId?: string | null
  tmdbId?: number | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  nationalities?: number[]
  links?: PersonLink[]
  alternativeNames?: PersonFormData['alternativeNames']
  trivia?: PersonFormData['trivia']
  forceReassign?: boolean
}

function formatPersonDataForAPI(data: PersonFormData): PersonApiPayload {
  const apiData: PersonApiPayload = {
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    realName: data.realName || null,
    gender: data.gender || null,
    hideAge: data.hideAge,
    isActive: data.isActive,
    birthLocationId: data.birthLocationId,
    deathLocationId: data.deathLocationId,
    biography: data.biography || null,
    photoUrl: data.photoUrl || null,
    imdbId: data.imdbId || null,
    tmdbId: data.tmdbId || null,
  };

  const birth = processPartialDateForAPI(data.isPartialBirthDate, data.partialBirthDate, data.birthDate);
  apiData.birthYear = birth.year;
  apiData.birthMonth = birth.month;
  apiData.birthDay = birth.day;

  const death = processPartialDateForAPI(data.isPartialDeathDate, data.partialDeathDate, data.deathDate);
  apiData.deathYear = death.year;
  apiData.deathMonth = death.month;
  apiData.deathDay = death.day;

  // Procesar nacionalidades
  if (data.nationalities && data.nationalities.length > 0) {
    apiData.nationalities = data.nationalities;
  }

  // Procesar links si existen
  if (data.links && data.links.length > 0) {
    apiData.links = data.links;
  }

  // Procesar nombres alternativos si existen
  if (data.alternativeNames && data.alternativeNames.length > 0) {
    apiData.alternativeNames = data.alternativeNames;
  }

  // Procesar trivia si existe
  if (data.trivia && data.trivia.length > 0) {
    apiData.trivia = data.trivia;
  }

  // Incluir photoPublicId
  if (data.photoPublicId) {
    apiData.photoPublicId = data.photoPublicId;
  }

  return apiData;
}

/**
* Convierte los datos de la API al formato del formulario
*/
/** Nationality as returned from the API (various shapes) */
interface NationalityEntry {
  locationId?: number
  location?: { id: number }
  country?: { id: number }
  id?: number
}

function formatPersonFromAPI(person: PersonWithRelations & Record<string, unknown>): PersonFormData {
  const formData: PersonFormData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    realName: person.realName || '',
    birthDate: '',
    deathDate: '',
    gender: person.gender || '',
    hideAge: person.hideAge || false,
    isActive: person.isActive !== false, // Default true
    birthLocationId: person.birthLocationId || null,
    deathLocationId: person.deathLocationId || null,
    biography: person.biography || '',
    photoUrl: person.photoUrl || '',
    imdbId: person.imdbId || '',
    tmdbId: person.tmdbId || null,
    links: person.links || [],
    alternativeNames: person.alternativeNames || [],
    nationalities: [],
    trivia: (person as Record<string, unknown>).trivia as PersonFormData['trivia'] || []
  };

  const birthResult = processPartialDateFromAPI(person.birthYear ?? null, person.birthMonth ?? null, person.birthDay ?? null);
  if (birthResult) {
    formData.birthDate = birthResult.date;
    formData.isPartialBirthDate = birthResult.isPartial;
    if (birthResult.partialDate) formData.partialBirthDate = birthResult.partialDate;
  }

  const deathResult = processPartialDateFromAPI(person.deathYear ?? null, person.deathMonth ?? null, person.deathDay ?? null);
  if (deathResult) {
    formData.deathDate = deathResult.date;
    formData.isPartialDeathDate = deathResult.isPartial;
    if (deathResult.partialDate) formData.partialDeathDate = deathResult.partialDate;
  }

  // Procesar nacionalidades
  if (person.nationalities && Array.isArray(person.nationalities)) {
    formData.nationalities = person.nationalities.map((n: number | NationalityEntry) => {
      // Si es un número directo
      if (typeof n === 'number') {
        return n;
      }

      // Si es un objeto
      if (typeof n === 'object' && n !== null) {
        // Primero intentar con locationId (campo directo)
        if (n.locationId) {
          return n.locationId;
        }

        // Si tiene un campo 'location' con id (estructura que viene de la API con include)
        if (n.location && n.location.id) {
          return n.location.id;
        }

        // Si tiene un campo 'country' con id (por si acaso)
        if (n.country && n.country.id) {
          return n.country.id;
        }

        // Si tiene un id directo
        if (n.id) {
          return n.id;
        }
      }

      return null;
    }).filter((id: number | null): id is number => id !== null);
  }

  return formData;
}

const log = createLogger('service:people')

export const peopleService = {
  /**
   * Obtiene una lista paginada de personas con filtros
   */
  async getAll(filters?: PersonFilters, signal?: AbortSignal): Promise<PaginatedPeopleResponse> {
    const params: Record<string, string> = {};

    if (filters?.search) params.search = filters.search;
    if (filters?.gender) params.gender = filters.gender;
    if (filters?.hasLinks !== undefined) params.hasLinks = String(filters.hasLinks);
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);
    if (filters?.page) params.page = String(filters.page);
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

    return apiClient.get<PaginatedPeopleResponse>('/people', { params, signal });
  },

  /**
   * Busca personas por nombre (para autocomplete)
   */
  async search(query: string, limit: number = 10): Promise<PersonSearchResult[]> {
    if (query.length < 2) return [];

    try {
      return await apiClient.get<PersonSearchResult[]>('/people', {
        params: { search: query, limit: String(limit) }
      });
    } catch (error) {
      log.error('Failed to search people', error);
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
   * Obtiene una persona por ID en formato de formulario
   */
  async getByIdForEdit(id: number): Promise<PersonFormData> {
    const person = await apiClient.get<PersonWithRelations & Record<string, unknown>>(`/people/${id}`);
    return formatPersonFromAPI(person);
  },

  /**
   * Crea una nueva persona
   */
  async create(data: PersonFormData, forceReassign = false): Promise<PersonWithRelations> {
    const formattedData = formatPersonDataForAPI(data);
    if (forceReassign) formattedData.forceReassign = true;
    try {
      return await apiClient.post<PersonWithRelations>('/people', formattedData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.data?.conflicts) {
        throw new ExternalIdConflictError(error.data.conflicts as ExternalIdConflict[]);
      }
      throw error;
    }
  },

  /**
   * Crea una persona rápida (solo con nombre)
   */
  async createQuick(name: string): Promise<Person> {
    // El backend se encarga de separar el nombre
    return apiClient.post<Person>('/people', {
      name: name.trim(),
      isActive: true
    });
  },

  /**
   * Actualiza una persona
   */
  async update(id: number, data: PersonFormData, forceReassign = false): Promise<PersonWithRelations> {
    const formattedData = formatPersonDataForAPI(data);
    if (forceReassign) formattedData.forceReassign = true;
    try {
      return await apiClient.put<PersonWithRelations>(`/people/${id}`, formattedData);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.data?.conflicts) {
        throw new ExternalIdConflictError(error.data.conflicts as ExternalIdConflict[]);
      }
      throw error;
    }
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
    const params: Record<string, string> = { slug };
    if (excludeId) params.excludeId = String(excludeId);

    const { available } = await apiClient.get<{ available: boolean }>(
      '/people/check-slug', { params }
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
    const params: Record<string, string> = {};

    if (filters.search) params.search = filters.search;
    if (filters.gender) params.gender = filters.gender;
    if (filters.hasLinks !== undefined) params.hasLinks = String(filters.hasLinks);
    if (filters.isActive !== undefined) params.isActive = String(filters.isActive);

    return apiClient.getBlob('/people/export', { params });
  }
};