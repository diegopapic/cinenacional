// src/lib/movies/movieListTypes.ts

import type { FilterOption, PaginatedResponse } from '@/lib/shared/listTypes'

export type { FilterOption }

// Filtros disponibles para el listado de películas
export interface MovieListFilters {
  search?: string;
  soundType?: string;                    // SONORA, MUDA, SONORIZADA, etc.
  colorTypeId?: number | '';             // B&N, Color, etc.
  tipoDuracion?: string;                 // LARGO, MEDIO, CORTO
  countryId?: number | '';               // País coproductor
  genreId?: number | '';                 // Género (Acción, Drama, etc.)
  ratingId?: number | '';                // Calificación/restricción (ATP, SAM 13, etc.)
  releaseDateFrom?: string;              // Fecha completa YYYY-MM-DD
  releaseDateTo?: string;                // Fecha completa YYYY-MM-DD
  productionYearFrom?: number | '';
  productionYearTo?: number | '';
  sortBy?: 'id' | 'title' | 'releaseDate' | 'duration' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Valores por defecto de los filtros
export const DEFAULT_MOVIE_FILTERS: MovieListFilters = {
  search: '',
  soundType: '',
  colorTypeId: '',
  tipoDuracion: '',
  countryId: '',
  genreId: '',
  ratingId: '',
  releaseDateFrom: '',
  releaseDateTo: '',
  productionYearFrom: '',
  productionYearTo: '',
  sortBy: 'popularity',
  sortOrder: 'desc',
  page: 1,
  limit: 60
};

// Película para el listado
export interface MovieListItem {
  id: number;
  slug: string;
  title: string;
  year: number | null;           // Año de producción
  releaseYear: number | null;    // Año de estreno
  releaseMonth: number | null;
  releaseDay: number | null;
  duration: number | null;       // Minutos
  tipoDuracion: string | null;   // LARGO, MEDIO, CORTO
  posterUrl: string | null;
  stage: string;                 // COMPLETA, EN_PRODUCCION, etc.
  soundType: string | null;
  synopsis: string | null;       // Sinopsis de la película
  colorType?: {
    id: number;
    name: string;
  } | null;
  genres: Array<{
    id: number;
    name: string;
  }>;
  directors: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  countries: Array<{
    id: number;
    name: string;
  }>;
}

// Respuesta de la API de filtros
export interface MovieFiltersDataResponse {
  soundTypes: FilterOption[];
  colorTypes: FilterOption[];
  durationTypes: FilterOption[];
  countries: FilterOption[];
  genres: FilterOption[];
  ratings: FilterOption[];
  stages: FilterOption[];
  years: {
    releaseYearMin: number | null;
    releaseYearMax: number | null;
    productionYearMin: number | null;
    productionYearMax: number | null;
  };
}

// Respuesta paginada del listado
export type PaginatedMovieListResponse = PaginatedResponse<MovieListItem>

// Opciones de ordenamiento para el UI
export const MOVIE_SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularidad' },
  { value: 'id', label: 'Ingreso a la base de datos' },
  { value: 'title', label: 'Alfabéticamente' },
  { value: 'releaseDate', label: 'Fecha de estreno' },
  { value: 'duration', label: 'Duración' },
] as const;

// Las constantes de opciones (sound types, duration types, stages) están centralizadas
// en movieConstants.ts como fuente de verdad única. Los filtros del listado público
// se construyen dinámicamente desde la API (/api/movies/filters).
