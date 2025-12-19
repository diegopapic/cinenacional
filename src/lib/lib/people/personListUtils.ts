// src/lib/people/personListUtils.ts

import { PersonListFilters, DEFAULT_PERSON_FILTERS, PersonWithMovie, LocationFilterOption } from './personListTypes';

/**
 * Convierte los filtros del estado a parámetros de URL
 */
export function filtersToSearchParams(filters: PersonListFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  // Solo agregar parámetros que no sean el valor por defecto
  if (filters.search) params.set('search', filters.search);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.birthLocationId) params.set('birthLocationId', String(filters.birthLocationId));
  if (filters.deathLocationId) params.set('deathLocationId', String(filters.deathLocationId));
  if (filters.nationalityId) params.set('nationalityId', String(filters.nationalityId));
  if (filters.roleId) params.set('roleId', String(filters.roleId));
  if (filters.birthYearFrom) params.set('birthYearFrom', String(filters.birthYearFrom));
  if (filters.birthYearTo) params.set('birthYearTo', String(filters.birthYearTo));
  if (filters.deathYearFrom) params.set('deathYearFrom', String(filters.deathYearFrom));
  if (filters.deathYearTo) params.set('deathYearTo', String(filters.deathYearTo));
  if (filters.sortBy && filters.sortBy !== DEFAULT_PERSON_FILTERS.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  if (filters.sortOrder && filters.sortOrder !== DEFAULT_PERSON_FILTERS.sortOrder) {
    params.set('sortOrder', filters.sortOrder);
  }
  if (filters.page && filters.page !== 1) params.set('page', String(filters.page));
  
  return params;
}

/**
 * Convierte parámetros de URL a filtros
 */
export function searchParamsToFilters(searchParams: URLSearchParams): PersonListFilters {
  const filters: PersonListFilters = { ...DEFAULT_PERSON_FILTERS };
  
  const search = searchParams.get('search');
  if (search) filters.search = search;
  
  const gender = searchParams.get('gender');
  if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
    filters.gender = gender;
  }
  
  const birthLocationId = searchParams.get('birthLocationId');
  if (birthLocationId) filters.birthLocationId = parseInt(birthLocationId);
  
  const deathLocationId = searchParams.get('deathLocationId');
  if (deathLocationId) filters.deathLocationId = parseInt(deathLocationId);
  
  const nationalityId = searchParams.get('nationalityId');
  if (nationalityId) filters.nationalityId = parseInt(nationalityId);
  
  const roleId = searchParams.get('roleId');
  if (roleId) {
    filters.roleId = roleId === 'ACTOR' ? 'ACTOR' : parseInt(roleId);
  }
  
  const birthYearFrom = searchParams.get('birthYearFrom');
  if (birthYearFrom) filters.birthYearFrom = parseInt(birthYearFrom);
  
  const birthYearTo = searchParams.get('birthYearTo');
  if (birthYearTo) filters.birthYearTo = parseInt(birthYearTo);
  
  const deathYearFrom = searchParams.get('deathYearFrom');
  if (deathYearFrom) filters.deathYearFrom = parseInt(deathYearFrom);
  
  const deathYearTo = searchParams.get('deathYearTo');
  if (deathYearTo) filters.deathYearTo = parseInt(deathYearTo);
  
  const sortBy = searchParams.get('sortBy');
  if (sortBy === 'id' || sortBy === 'lastName' || sortBy === 'birthDate' || sortBy === 'deathDate' || sortBy === 'movieCount') {
    filters.sortBy = sortBy;
  }
  
  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder === 'asc' || sortOrder === 'desc') {
    filters.sortOrder = sortOrder;
  }
  
  const page = searchParams.get('page');
  if (page) filters.page = parseInt(page);
  
  return filters;
}

/**
 * Convierte filtros a parámetros de API
 */
export function filtersToApiParams(filters: PersonListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.gender) params.gender = filters.gender;
  if (filters.birthLocationId) params.birthLocationId = String(filters.birthLocationId);
  if (filters.deathLocationId) params.deathLocationId = String(filters.deathLocationId);
  if (filters.nationalityId) params.nationalityId = String(filters.nationalityId);
  if (filters.roleId) params.roleId = String(filters.roleId);
  if (filters.birthYearFrom) params.birthYearFrom = String(filters.birthYearFrom);
  if (filters.birthYearTo) params.birthYearTo = String(filters.birthYearTo);
  if (filters.deathYearFrom) params.deathYearFrom = String(filters.deathYearFrom);
  if (filters.deathYearTo) params.deathYearTo = String(filters.deathYearTo);
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  
  return params;
}

/**
 * Formatea el nombre completo de una persona
 */
export function formatPersonName(person: { firstName?: string | null; lastName?: string | null; realName?: string | null }): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.realName || 'Sin nombre';
}

/**
 * Formatea la fecha de nacimiento/muerte para mostrar
 */
export function formatPartialDate(
  year?: number | null,
  month?: number | null,
  day?: number | null,
  options?: { includeAge?: boolean; currentYear?: number }
): string {
  if (!year) return '';
  
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  let dateStr = '';
  
  if (day && month) {
    dateStr = `${day} de ${months[month - 1]} de ${year}`;
  } else if (month) {
    dateStr = `${months[month - 1]} de ${year}`;
  } else {
    dateStr = String(year);
  }
  
  return dateStr;
}

/**
 * Calcula la edad entre dos fechas parciales
 */
export function calculateAge(
  birthYear?: number | null,
  birthMonth?: number | null,
  birthDay?: number | null,
  deathYear?: number | null,
  deathMonth?: number | null,
  deathDay?: number | null
): number | null {
  if (!birthYear) return null;
  
  const endYear = deathYear || new Date().getFullYear();
  const endMonth = deathMonth || new Date().getMonth() + 1;
  const endDay = deathDay || new Date().getDate();
  
  let age = endYear - birthYear;
  
  // Ajustar si aún no llegó el cumpleaños
  if (birthMonth && endMonth) {
    if (endMonth < birthMonth) {
      age--;
    } else if (endMonth === birthMonth && birthDay && endDay < birthDay) {
      age--;
    }
  }
  
  return age >= 0 ? age : null;
}

/**
 * Formatea la ubicación con su padre
 */
export function formatLocation(location: LocationFilterOption | null | undefined): string {
  if (!location) return '';
  
  if (location.fullPath) return location.fullPath;
  if (location.parentName) return `${location.name}, ${location.parentName}`;
  return location.name;
}

/**
 * Genera un array de años para los selectores
 */
export function generateYearOptions(min: number, max: number): number[] {
  const years: number[] = [];
  for (let year = max; year >= min; year--) {
    years.push(year);
  }
  return years;
}

/**
 * Cuenta cuántos filtros activos hay
 */
export function countActiveFilters(filters: PersonListFilters): number {
  let count = 0;
  
  if (filters.search) count++;
  if (filters.gender) count++;
  if (filters.birthLocationId) count++;
  if (filters.deathLocationId) count++;
  if (filters.nationalityId) count++;
  if (filters.roleId) count++;
  if (filters.birthYearFrom) count++;
  if (filters.birthYearTo) count++;
  if (filters.deathYearFrom) count++;
  if (filters.deathYearTo) count++;
  
  return count;
}

/**
 * Verifica si hay filtros activos (excluyendo ordenamiento y paginación)
 */
export function hasActiveFilters(filters: PersonListFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * Limpia todos los filtros manteniendo ordenamiento
 */
export function clearFilters(filters: PersonListFilters): PersonListFilters {
  return {
    ...DEFAULT_PERSON_FILTERS,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    limit: filters.limit
  };
}
