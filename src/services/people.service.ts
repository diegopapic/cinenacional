// src/services/people.service.ts

import { apiClient } from './api-client';
import {
 Person,
 PersonWithRelations,
 PersonFormData,
 PersonFilters,
 PaginatedPeopleResponse
} from '@/lib/people/peopleTypes';
import { dateToPartialFields, partialFieldsToDate } from '@/lib/shared/dateUtils';

interface PersonSearchResult {
 id: number;
 name: string;
 slug?: string;
}

/**
* Formatea los datos del formulario para enviar a la API
* Convierte las fechas completas o parciales al formato esperado por el backend
*/
function formatPersonDataForAPI(data: PersonFormData): any {
 const apiData: any = {
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
 };

 // Procesar fecha de nacimiento
 if (data.isPartialBirthDate && data.partialBirthDate) {
   // Fecha parcial de nacimiento
   apiData.birthYear = data.partialBirthDate.year;
   apiData.birthMonth = data.partialBirthDate.month;
   apiData.birthDay = data.partialBirthDate.day;
 } else if (data.birthDate) {
   // Fecha completa de nacimiento - convertir a campos parciales
   const partial = dateToPartialFields(data.birthDate);
   apiData.birthYear = partial.year;
   apiData.birthMonth = partial.month;
   apiData.birthDay = partial.day;
 } else {
   // Sin fecha de nacimiento
   apiData.birthYear = null;
   apiData.birthMonth = null;
   apiData.birthDay = null;
 }

 // Procesar fecha de fallecimiento
 if (data.isPartialDeathDate && data.partialDeathDate) {
   // Fecha parcial de fallecimiento
   apiData.deathYear = data.partialDeathDate.year;
   apiData.deathMonth = data.partialDeathDate.month;
   apiData.deathDay = data.partialDeathDate.day;
 } else if (data.deathDate) {
   // Fecha completa de fallecimiento - convertir a campos parciales
   const partial = dateToPartialFields(data.deathDate);
   apiData.deathYear = partial.year;
   apiData.deathMonth = partial.month;
   apiData.deathDay = partial.day;
 } else {
   // Sin fecha de fallecimiento
   apiData.deathYear = null;
   apiData.deathMonth = null;
   apiData.deathDay = null;
 }

 // Procesar nacionalidades
 if (data.nationalities && data.nationalities.length > 0) {
   apiData.nationalities = data.nationalities;
 }

 // Procesar links si existen
 if (data.links && data.links.length > 0) {
   apiData.links = data.links;
 }

 return apiData;
}

/**
* Convierte los datos de la API al formato del formulario
*/
function formatPersonFromAPI(person: any): PersonFormData {
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
   links: person.links || [],
   nationalities: []
 };

 // Procesar fecha de nacimiento
 if (person.birthYear) {
   const birthPartial = {
     year: person.birthYear,
     month: person.birthMonth,
     day: person.birthDay
   };

   // Si la fecha está completa, convertirla a formato ISO
   if (person.birthYear && person.birthMonth && person.birthDay) {
     formData.birthDate = partialFieldsToDate(birthPartial) || '';
     formData.isPartialBirthDate = false;
   } else {
     // Fecha parcial
     formData.partialBirthDate = birthPartial;
     formData.isPartialBirthDate = true;
     formData.birthDate = '';
   }
 }

 // Procesar fecha de fallecimiento
 if (person.deathYear) {
   const deathPartial = {
     year: person.deathYear,
     month: person.deathMonth,
     day: person.deathDay
   };

   // Si la fecha está completa, convertirla a formato ISO
   if (person.deathYear && person.deathMonth && person.deathDay) {
     formData.deathDate = partialFieldsToDate(deathPartial) || '';
     formData.isPartialDeathDate = false;
   } else {
     // Fecha parcial
     formData.partialDeathDate = deathPartial;
     formData.isPartialDeathDate = true;
     formData.deathDate = '';
   }
 }

 // Procesar nacionalidades
 if (person.nationalities && Array.isArray(person.nationalities)) {
   formData.nationalities = person.nationalities.map((n: any) => {
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
   }).filter((id: any) => id !== null); // Filtrar nulls
 }

 return formData;
}

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
   
   // Construir URL con parámetros
   const queryString = new URLSearchParams(params).toString();
   const url = `/api/people${queryString ? `?${queryString}` : ''}`;
   
   // Usar fetch directamente con signal
   const response = await fetch(url, { 
     method: 'GET',
     signal
   });
   
   if (!response.ok) {
     // Si el request fue abortado, lanzar error específico
     if (signal?.aborted) {
       const error = new Error('Request aborted');
       error.name = 'AbortError';
       throw error;
     }
     throw new Error('Error al obtener personas');
   }
   
   return response.json();
 },

 /**
  * Busca personas por nombre (para autocomplete)
  */
 async search(query: string, limit: number = 10): Promise<PersonSearchResult[]> {
   if (query.length < 2) return [];

   try {
     // Usar fetch directamente para búsqueda
     const params = new URLSearchParams({
       search: query,
       limit: String(limit)
     });
     
     const response = await fetch(`/api/people?${params}`);
     
     if (!response.ok) {
       throw new Error('Error searching people');
     }
     
     return response.json();
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
  * Obtiene una persona por ID en formato de formulario
  */
 async getByIdForEdit(id: number): Promise<PersonFormData> {
   const person = await apiClient.get<any>(`/people/${id}`);
   return formatPersonFromAPI(person);
 },

 /**
  * Crea una nueva persona
  */
 async create(data: PersonFormData): Promise<PersonWithRelations> {
   const formattedData = formatPersonDataForAPI(data);
   return apiClient.post<PersonWithRelations>('/people', formattedData);
 },

 /**
  * Crea una persona rápida (solo con nombre)
  */
 async createQuick(name: string): Promise<Person> {
   const nameParts = name.trim().split(' ');
   const quickData = {
     firstName: nameParts[0] || null,
     lastName: nameParts.slice(1).join(' ') || null,
     isActive: true
   };

   return apiClient.post<Person>('/people', quickData);
 },

 /**
  * Actualiza una persona
  */
 async update(id: number, data: PersonFormData): Promise<PersonWithRelations> {
   const formattedData = formatPersonDataForAPI(data);
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

   const response = await fetch(`/api/people/export?${params}`);

   if (!response.ok) {
     throw new Error('Error al exportar personas');
   }

   return response.blob();
 }
};