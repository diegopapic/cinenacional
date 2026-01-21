// src/lib/movies/movieListTypes.ts

// Filtros disponibles para el listado de películas
export interface MovieListFilters {
  search?: string;
  soundType?: string;                    // SONORA, MUDA, SONORIZADA, etc.
  colorTypeId?: number | '';             // B&N, Color, etc.
  tipoDuracion?: string;                 // LARGO, MEDIO, CORTO
  countryId?: number | '';               // País coproductor
  genreId?: number | '';                 // Género (Acción, Drama, etc.)
  releaseDateFrom?: string;              // Fecha completa YYYY-MM-DD
  releaseDateTo?: string;                // Fecha completa YYYY-MM-DD
  productionYearFrom?: number | '';
  productionYearTo?: number | '';
  sortBy?: 'id' | 'title' | 'releaseDate' | 'duration';
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
  releaseDateFrom: '',
  releaseDateTo: '',
  productionYearFrom: '',
  productionYearTo: '',
  sortBy: 'id',
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

// Opciones para los dropdowns de filtros
export interface FilterOption {
  id: number | string;
  name: string;
  count?: number;
}

// Respuesta de la API de filtros
export interface MovieFiltersDataResponse {
  soundTypes: FilterOption[];
  colorTypes: FilterOption[];
  durationTypes: FilterOption[];
  countries: FilterOption[];
  genres: FilterOption[];
  stages: FilterOption[];
  years: {
    releaseYearMin: number | null;
    releaseYearMax: number | null;
    productionYearMin: number | null;
    productionYearMax: number | null;
  };
}

// Respuesta paginada del listado
export interface PaginatedMovieListResponse {
  data: MovieListItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Tipo de vista
export type ViewMode = 'compact' | 'detailed';

// Opciones de ordenamiento para el UI
export const MOVIE_SORT_OPTIONS = [
  { value: 'id', label: 'Ingreso a la base de datos' },
  { value: 'title', label: 'Alfabéticamente' },
  { value: 'releaseDate', label: 'Fecha de estreno' },
  { value: 'duration', label: 'Duración' },
] as const;

// Opciones de sonido
export const SOUND_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'SONORA', label: 'Sonora' },
  { value: 'MUDA', label: 'Muda' },
  { value: 'SONORIZADA', label: 'Sonorizada' },
] as const;

// Opciones de duración
export const DURATION_TYPE_OPTIONS = [
  { value: '', label: 'Todas las duraciones' },
  { value: 'LARGO', label: 'Largometraje' },
  { value: 'MEDIO', label: 'Mediometraje' },
  { value: 'CORTO', label: 'Cortometraje' },
] as const;

// Opciones de estado
export const STAGE_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'COMPLETA', label: 'Completa' },
  { value: 'EN_PRODUCCION', label: 'En producción' },
  { value: 'INCONCLUSA', label: 'Inconclusa' },
  { value: 'NO_ESTRENADA', label: 'No estrenada' },
] as const;
