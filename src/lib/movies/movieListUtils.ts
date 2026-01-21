// src/lib/movies/movieListUtils.ts

import { MovieListFilters, DEFAULT_MOVIE_FILTERS, MovieListItem } from './movieListTypes';

/**
 * Convierte los filtros del estado a parámetros de URL
 */
export function filtersToSearchParams(filters: MovieListFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.soundType) params.set('soundType', filters.soundType);
  if (filters.colorTypeId) params.set('colorTypeId', String(filters.colorTypeId));
  if (filters.tipoDuracion) params.set('tipoDuracion', filters.tipoDuracion);
  if (filters.countryId) params.set('countryId', String(filters.countryId));
  if (filters.genreId) params.set('genreId', String(filters.genreId));
  if (filters.releaseDateFrom) params.set('releaseDateFrom', filters.releaseDateFrom);
  if (filters.releaseDateTo) params.set('releaseDateTo', filters.releaseDateTo);
  if (filters.productionYearFrom) params.set('productionYearFrom', String(filters.productionYearFrom));
  if (filters.productionYearTo) params.set('productionYearTo', String(filters.productionYearTo));
  if (filters.sortBy && filters.sortBy !== DEFAULT_MOVIE_FILTERS.sortBy) {
    params.set('sortBy', filters.sortBy);
  }
  if (filters.sortOrder && filters.sortOrder !== DEFAULT_MOVIE_FILTERS.sortOrder) {
    params.set('sortOrder', filters.sortOrder);
  }
  if (filters.page && filters.page !== 1) params.set('page', String(filters.page));

  return params;
}

/**
 * Convierte parámetros de URL a filtros
 */
export function searchParamsToFilters(searchParams: URLSearchParams): MovieListFilters {
  const filters: MovieListFilters = { ...DEFAULT_MOVIE_FILTERS };

  const search = searchParams.get('search');
  if (search) filters.search = search;

  const soundType = searchParams.get('soundType');
  if (soundType) filters.soundType = soundType;

  const colorTypeId = searchParams.get('colorTypeId');
  if (colorTypeId) filters.colorTypeId = parseInt(colorTypeId);

  const tipoDuracion = searchParams.get('tipoDuracion');
  if (tipoDuracion) filters.tipoDuracion = tipoDuracion;

  const countryId = searchParams.get('countryId');
  if (countryId) filters.countryId = parseInt(countryId);

  const genreId = searchParams.get('genreId');
  if (genreId) filters.genreId = parseInt(genreId);

  const releaseDateFrom = searchParams.get('releaseDateFrom');
  if (releaseDateFrom) filters.releaseDateFrom = releaseDateFrom;

  const releaseDateTo = searchParams.get('releaseDateTo');
  if (releaseDateTo) filters.releaseDateTo = releaseDateTo;

  const productionYearFrom = searchParams.get('productionYearFrom');
  if (productionYearFrom) filters.productionYearFrom = parseInt(productionYearFrom);

  const productionYearTo = searchParams.get('productionYearTo');
  if (productionYearTo) filters.productionYearTo = parseInt(productionYearTo);

  const sortBy = searchParams.get('sortBy');
  if (sortBy === 'id' || sortBy === 'title' || sortBy === 'releaseDate' || sortBy === 'duration') {
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
export function filtersToApiParams(filters: MovieListFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.search) params.search = filters.search;
  if (filters.soundType) params.soundType = filters.soundType;
  if (filters.colorTypeId) params.colorTypeId = String(filters.colorTypeId);
  if (filters.tipoDuracion) params.tipoDuracion = filters.tipoDuracion;
  if (filters.countryId) params.countryId = String(filters.countryId);
  if (filters.genreId) params.genreId = String(filters.genreId);
  if (filters.releaseDateFrom) params.releaseDateFrom = filters.releaseDateFrom;
  if (filters.releaseDateTo) params.releaseDateTo = filters.releaseDateTo;
  if (filters.productionYearFrom) params.productionYearFrom = String(filters.productionYearFrom);
  if (filters.productionYearTo) params.productionYearTo = String(filters.productionYearTo);
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);

  return params;
}

/**
 * Formatea la duración en formato legible
 */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Obtiene el año a mostrar para una película (producción o estreno)
 */
export function getDisplayYear(movie: MovieListItem): number | null {
  return movie.year || movie.releaseYear || null;
}

/**
 * Formatea la fecha de estreno
 */
export function formatReleaseDate(
  year?: number | null,
  month?: number | null,
  day?: number | null
): string {
  if (!year) return '';

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  if (day && month) {
    return `${day} de ${months[month - 1]} de ${year}`;
  } else if (month) {
    return `${months[month - 1]} de ${year}`;
  } else {
    return String(year);
  }
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
export function countActiveFilters(filters: MovieListFilters): number {
  let count = 0;

  if (filters.search) count++;
  if (filters.soundType) count++;
  if (filters.colorTypeId) count++;
  if (filters.tipoDuracion) count++;
  if (filters.countryId) count++;
  if (filters.genreId) count++;
  if (filters.releaseDateFrom) count++;
  if (filters.releaseDateTo) count++;
  if (filters.productionYearFrom) count++;
  if (filters.productionYearTo) count++;

  return count;
}

/**
 * Verifica si hay filtros activos (excluyendo ordenamiento y paginación)
 */
export function hasActiveFilters(filters: MovieListFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * Limpia todos los filtros manteniendo ordenamiento
 */
export function clearFilters(filters: MovieListFilters): MovieListFilters {
  return {
    ...DEFAULT_MOVIE_FILTERS,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    limit: filters.limit
  };
}

/**
 * Obtiene el label del tipo de duración
 */
export function getDurationTypeLabel(tipoDuracion: string | null): string {
  const lower = tipoDuracion?.toLowerCase();
  switch (lower) {
    case 'largo':
    case 'largometraje': return 'Largometraje';
    case 'medio':
    case 'mediometraje': return 'Mediometraje';
    case 'corto':
    case 'cortometraje': return 'Cortometraje';
    default: return '';
  }
}

/**
 * Obtiene el label del estado
 */
export function getStageLabel(stage: string): string {
  switch (stage) {
    case 'COMPLETA': return 'Completa';
    case 'EN_PRODUCCION': return 'En producción';
    case 'EN_RODAJE': return 'En rodaje';
    case 'EN_POSTPRODUCCION': return 'En postproducción';
    case 'EN_PREPRODUCCION': return 'En preproducción';
    case 'EN_DESARROLLO': return 'En desarrollo';
    case 'INCONCLUSA': return 'Inconclusa';
    case 'NO_ESTRENADA': return 'No estrenada';
    default: return stage;
  }
}
