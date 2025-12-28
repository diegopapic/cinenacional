// src/lib/people/personListTypes.ts

import { PersonWithRelations } from './peopleTypes';

// Filtros disponibles para el listado
export interface PersonListFilters {
  search?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | '';
  birthLocationId?: number | '';
  deathLocationId?: number | '';
  nationalityId?: number | '';
  roleId?: number | 'ACTOR' | 'SELF' | '';  // 'ACTOR' para actuaciones, 'SELF' para apariciones como sí mismo
  birthYearFrom?: number | '';
  birthYearTo?: number | '';
  deathYearFrom?: number | '';
  deathYearTo?: number | '';
  sortBy?: 'id' | 'lastName' | 'birthDate' | 'deathDate' | 'movieCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Valores por defecto de los filtros
export const DEFAULT_PERSON_FILTERS: PersonListFilters = {
  search: '',
  gender: '',
  birthLocationId: '',
  deathLocationId: '',
  nationalityId: '',
  roleId: '',
  birthYearFrom: '',
  birthYearTo: '',
  deathYearFrom: '',
  deathYearTo: '',
  sortBy: 'id',
  sortOrder: 'desc',
  page: 1,
  limit: 60
};

// Persona extendida con película destacada
export interface PersonWithMovie extends PersonWithRelations {
  featuredMovie?: {
    id: number;
    slug: string;
    title: string;
    year: number | null;
    role?: string;  // "Actor" o el nombre del rol técnico
  } | null;
  movieCount?: number;
}

// Opciones para los dropdowns de filtros
export interface FilterOption {
  id: number;
  name: string;
  count?: number;  // Cantidad de personas con este valor
}

// Opciones de ubicación (con jerarquía)
export interface LocationFilterOption extends FilterOption {
  parentName?: string;  // Ej: "Argentina" para "Buenos Aires"
  fullPath?: string;    // Ej: "Buenos Aires, Argentina"
}

// Opciones de rol
export interface RoleFilterOption extends FilterOption {
  department?: string;
  isActor?: boolean;  // true para el rol especial "Actor/Actriz"
}

// Respuesta de la API de filtros
export interface FiltersDataResponse {
  birthLocations: LocationFilterOption[];
  deathLocations: LocationFilterOption[];
  nationalities: LocationFilterOption[];
  roles: RoleFilterOption[];
  years: {
    birthYearMin: number | null;
    birthYearMax: number | null;
    deathYearMin: number | null;
    deathYearMax: number | null;
  };
}

// Respuesta paginada del listado
export interface PaginatedPersonListResponse {
  data: PersonWithMovie[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Tipo de vista
export type ViewMode = 'compact' | 'detailed';

// Opciones de ordenamiento para el UI (simplificadas)
export const SORT_OPTIONS = [
  { value: 'id', label: 'Ingreso a la base de datos' },
  { value: 'lastName', label: 'Alfabéticamente' },
  { value: 'birthDate', label: 'Fecha de nacimiento' },
  { value: 'deathDate', label: 'Fecha de muerte' },
  { value: 'movieCount', label: 'Cantidad de películas' },
] as const;

// Opciones de género para el UI
export const GENDER_OPTIONS = [
  { value: '', label: 'Todos los géneros' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
] as const;