// src/lib/people/peopleTypes.ts

import { PartialDate } from '@/lib/shared/dateUtils';

// Tipos base de la base de datos
export interface Person {
  id: number;
  slug: string;
  firstName?: string | null;
  lastName?: string | null;
  realName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  birthLocationId?: number | null;
  deathLocationId?: number | null;
  biography?: string | null;
  photoUrl?: string | null;
  photoPublicId?: string;
  gender?: Gender | null;
  hideAge: boolean;
  hasLinks: boolean;
  isActive: boolean;
  imdbId?: string | null;
  tmdbId?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Tipo de género
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Tipo para links de persona
export interface PersonLink {
  id?: number;
  personId?: number;
  type: PersonLinkType;
  url: string;
  title?: string | null;
  displayOrder: number;
  isVerified: boolean;
  isActive: boolean;
  lastChecked?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Tipo para nombres alternativos
export interface PersonAlternativeName {
  id?: number;
  personId?: number;
  fullName: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos de links disponibles
export type PersonLinkType = 
  | 'IMDB'
  | 'TMDB'
  | 'CINENACIONAL'
  | 'WIKIPEDIA'
  | 'OFFICIAL_WEBSITE'
  | 'PORTFOLIO'
  | 'BLOG'
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'LINKEDIN'
  | 'VIMEO'
  | 'LETTERBOXD'
  | 'SPOTIFY'
  | 'PODCAST'
  | 'INTERVIEW'
  | 'ARTICLE'
  | 'OTHER';

// Tipo para ubicación
export interface Location {
  id: number;
  name: string;
  slug?: string | null;
  type: string;
  parentId?: number | null;
  countryId: number;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Tipo extendido con relaciones
export interface PersonWithRelations extends Person {
  links?: PersonLink[];
  alternativeNames?: PersonAlternativeName[];
  nationalities?: Array<{
    personId?: number;
    locationId: number;
    isPrimary?: boolean;
    location?: Location;
  }>;
  birthLocation?: Location | null;
  deathLocation?: Location | null;
  _count?: {
    links: number;
    castRoles: number;
    crewRoles: number;
    awards: number;
  };
  // Campos de búsqueda: indican si el match fue en un nombre alternativo
  matchedAlternativeName?: string | null;
  matchedAlternativeNameId?: number | null;
}

// Tipo para el formulario
export interface PersonFormData {
  id?: number;
  firstName: string;
  lastName: string;
  realName?: string;
  // Fechas completas para el input type="date"
  birthDate: string;
  deathDate: string;
  
  // Fechas parciales
  partialBirthDate?: PartialDate;
  partialDeathDate?: PartialDate;
  
  // Flags para indicar si usar fecha parcial
  isPartialBirthDate?: boolean;
  isPartialDeathDate?: boolean;
  birthLocationId?: number | null;
  deathLocationId?: number | null;
  birthLocation?: string;
  deathLocation?: string;
  biography?: string;
  photoUrl?: string;
  photoPublicId?: string;
  gender?: string;
  hideAge?: boolean;
  isActive?: boolean;
  imdbId?: string;
  tmdbId?: number | null;
  links: PersonLink[];
  alternativeNames?: PersonAlternativeName[];
  nationalities?: number[];
}

// Tipo para filtros de búsqueda
export interface PersonFilters {
  search?: string;
  gender?: Gender | '';
  hasLinks?: boolean | '';
  isActive?: boolean | '';
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'birthDate' | 'deathDate' | 'last_name';
  sortOrder?: 'asc' | 'desc';
}

// Tipo para respuesta paginada
export interface PaginatedPeopleResponse {
  data: PersonWithRelations[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Tipo para resultado de búsqueda con info de nombre alternativo
export interface PersonSearchResult {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  slug: string;
  name?: string;
  alternativeNames?: PersonAlternativeName[];
  // Si el match fue en un nombre alternativo
  matchedAlternativeName?: string | null;
  matchedAlternativeNameId?: number | null;
}

// Tipo para selección de persona (incluye alternativeNameId opcional)
export interface PersonSelection {
  personId: number;
  personName: string;
  alternativeNameId?: number | null;
  alternativeName?: string | null;
}