// src/lib/movies/movieListUtils.ts

import { MovieListFilters, DEFAULT_MOVIE_FILTERS, MovieListItem, MovieFiltersDataResponse, MOVIE_SORT_OPTIONS } from './movieListTypes';

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
  } else if (filters.sortBy) {
    filters.sortOrder = (filters.sortBy === 'title') ? 'asc' : 'desc';
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

/**
 * Convierte una fecha ISO "YYYY-MM-DD" a formato display "DD/MM/YYYY"
 */
function formatISODateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Genera el título dinámico del listado según los filtros activos
 */
export function buildTitle(
  filters: MovieListFilters,
  filtersData: MovieFiltersDataResponse | null
): string {
  const parts: string[] = [];

  // Base según tipo de duración
  let base = 'Listado de películas';
  // largometrajes/mediometrajes/cortometrajes son masculinos
  const esMasculino = !!filters.tipoDuracion;
  if (filters.tipoDuracion) {
    const label = getDurationTypeLabel(filters.tipoDuracion);
    if (label) base = 'Listado de ' + label.toLowerCase() + 's';
  }
  const sfx = esMasculino ? 'os' : 'as';

  // Género
  if (filters.genreId && filtersData) {
    const genre = filtersData.genres.find(g => String(g.id) === String(filters.genreId));
    if (genre) parts.push(`de ${genre.name.toLowerCase()}`);
  }

  // Sonido
  if (filters.soundType) {
    const label = filters.soundType.charAt(0).toUpperCase() + filters.soundType.slice(1).toLowerCase();
    if (label === 'Muda') {
      parts.push(esMasculino ? 'mudos' : 'mudas');
    } else if (label === 'Sonorizada') {
      parts.push(esMasculino ? 'sonorizados' : 'sonorizadas');
    } else {
      parts.push(esMasculino ? 'sonoros' : 'sonoras');
    }
  }

  // Color
  if (filters.colorTypeId && filtersData) {
    const color = filtersData.colorTypes.find(c => String(c.id) === String(filters.colorTypeId));
    if (color) parts.push(`en ${color.name}`);
  }

  // País coproductor
  if (filters.countryId && filtersData) {
    const country = filtersData.countries.find(c => String(c.id) === String(filters.countryId));
    if (country) parts.push(`coproducid${sfx} con ${country.name}`);
  }

  // Rango de producción
  if (filters.productionYearFrom && filters.productionYearTo) {
    parts.push(`producid${sfx} entre ${filters.productionYearFrom} y ${filters.productionYearTo}`);
  } else if (filters.productionYearFrom) {
    parts.push(`producid${sfx} desde ${filters.productionYearFrom}`);
  } else if (filters.productionYearTo) {
    parts.push(`producid${sfx} hasta ${filters.productionYearTo}`);
  }

  // Rango de estreno
  if (filters.releaseDateFrom && filters.releaseDateTo) {
    parts.push(`estrenad${sfx} entre el ${formatISODateDisplay(filters.releaseDateFrom)} y el ${formatISODateDisplay(filters.releaseDateTo)}`);
  } else if (filters.releaseDateFrom) {
    parts.push(`estrenad${sfx} desde el ${formatISODateDisplay(filters.releaseDateFrom)}`);
  } else if (filters.releaseDateTo) {
    parts.push(`estrenad${sfx} hasta el ${formatISODateDisplay(filters.releaseDateTo)}`);
  }

  if (parts.length > 0) {
    return `${base} ${parts.join(', ')}`;
  }

  return base;
}

/**
 * Genera el subtítulo con el criterio de orden actual
 */
export function buildSubtitle(filters: MovieListFilters): string {
  const sortBy = filters.sortBy || DEFAULT_MOVIE_FILTERS.sortBy;
  const sortOrder = filters.sortOrder || DEFAULT_MOVIE_FILTERS.sortOrder;
  const isAsc = sortOrder === 'asc';

  switch (sortBy) {
    case 'id':
      return isAsc
        ? 'Ordenadas por ingreso a la base de datos, de más antigua a más nueva'
        : 'Ordenadas por ingreso a la base de datos, de más nueva a más antigua';
    case 'title':
      return isAsc
        ? 'Ordenadas alfabéticamente, de la A a la Z'
        : 'Ordenadas alfabéticamente, de la Z a la A';
    case 'releaseDate':
      return isAsc
        ? 'Ordenadas por fecha de estreno, de más antigua a más reciente'
        : 'Ordenadas por fecha de estreno, de más reciente a más antigua';
    case 'duration':
      return isAsc
        ? 'Ordenadas por duración, de más corta a más larga'
        : 'Ordenadas por duración, de más larga a más corta';
    default:
      return `Ordenadas ${isAsc ? 'ascendente' : 'descendente'}`;
  }
}

/**
 * Genera array de números de página con ellipsis
 */
export function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  if (current <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 2) {
    pages.push(1);
    pages.push('...');
    for (let i = total - 3; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('...');
    pages.push(total);
  }

  return pages;
}
