// src/lib/movies/movieListUtils.ts

import { MovieListFilters, DEFAULT_MOVIE_FILTERS, MovieListItem, MovieFiltersDataResponse, MOVIE_SORT_OPTIONS } from './movieListTypes';
import { MOVIE_STAGES } from './movieConstants';
import { formatPartialDate as sharedFormatPartialDate } from '@/lib/shared/dateUtils';
import { formatDuration, generateYearOptions } from '@/lib/shared/listUtils';
import { createFilterHelpers } from '@/lib/shared/filterUtils';

// Re-export para mantener compatibilidad con importaciones existentes
export { formatDuration, generateYearOptions };

// Esquema de filtros de películas para la factory genérica
const movieFilterHelpers = createFilterHelpers<MovieListFilters>({
  fields: {
    search: 'string',
    soundType: 'string',
    colorTypeId: 'number',
    tipoDuracion: 'string',
    countryId: 'number',
    genreId: 'number',
    ratingId: 'number',
    releaseDateFrom: 'string',
    releaseDateTo: 'string',
    productionYearFrom: 'number',
    productionYearTo: 'number',
  },
  defaults: DEFAULT_MOVIE_FILTERS,
  sortByValues: MOVIE_SORT_OPTIONS.map(o => o.value),
  defaultSortOrder: (sortBy) => sortBy === 'title' ? 'asc' : 'desc',
})

export const {
  filtersToSearchParams,
  searchParamsToFilters,
  filtersToApiParams,
  countActiveFilters,
  hasActiveFilters,
  clearFilters,
  getDefaultSortOrder,
} = movieFilterHelpers

/**
 * Obtiene el año a mostrar para una película (producción o estreno)
 */
export function getDisplayYear(movie: MovieListItem): number | null {
  return movie.year || movie.releaseYear || null;
}

/**
 * Formatea la fecha de estreno
 * Delega a la versión compartida en dateUtils
 */
export function formatReleaseDate(
  year?: number | null,
  month?: number | null,
  day?: number | null
): string {
  return sharedFormatPartialDate(
    { year: year ?? null, month: month ?? null, day: day ?? null },
    { fallback: '' }
  );
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
 * Obtiene el label del estado usando la constante centralizada MOVIE_STAGES
 */
export function getStageLabel(stage: string): string {
  const stageInfo = MOVIE_STAGES.find(s => s.value === stage)
  return stageInfo ? stageInfo.label : stage
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

  // Restricción/calificación
  if (filters.ratingId && filtersData) {
    const rating = filtersData.ratings.find(r => String(r.id) === String(filters.ratingId));
    if (rating) parts.push(`calificad${sfx} ${rating.name}`);
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
    case 'popularity':
      return isAsc
        ? 'Ordenadas por popularidad, de menor a mayor'
        : 'Ordenadas por popularidad, de mayor a menor';
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