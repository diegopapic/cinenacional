// src/lib/people/personListUtils.ts

import { PersonListFilters, DEFAULT_PERSON_FILTERS, PersonWithMovie, LocationFilterOption, FiltersDataResponse, SORT_OPTIONS } from './personListTypes';
import { formatPartialDate as sharedFormatPartialDate, calculateYearsBetween, type PartialDate } from '@/lib/shared/dateUtils';
import { generateYearOptions } from '@/lib/shared/listUtils';
import { createFilterHelpers } from '@/lib/shared/filterUtils';

// Re-export para mantener compatibilidad con importaciones existentes
export { generateYearOptions };

// Esquema de filtros de personas para la factory genérica
const personFilterHelpers = createFilterHelpers<PersonListFilters>({
  fields: {
    search: 'string',
    gender: { type: 'string', validValues: ['MALE', 'FEMALE', 'OTHER'] },
    birthLocationId: 'number',
    deathLocationId: 'number',
    nationalityId: 'number',
    roleId: { type: 'number', parse: (v) => (v === 'ACTOR' || v === 'SELF') ? v : parseInt(v) },
    birthYearFrom: 'number',
    birthYearTo: 'number',
    deathYearFrom: 'number',
    deathYearTo: 'number',
  },
  defaults: DEFAULT_PERSON_FILTERS,
  sortByValues: SORT_OPTIONS.map(o => o.value),
  defaultSortOrder: (sortBy) => (sortBy === 'lastName' || sortBy === 'birthDate') ? 'asc' : 'desc',
})

export const {
  filtersToSearchParams,
  searchParamsToFilters,
  filtersToApiParams,
  countActiveFilters,
  hasActiveFilters,
  clearFilters,
  getDefaultSortOrder,
} = personFilterHelpers

/**
 * Formatea el nombre completo de una persona
 */
export function formatPersonName(person: { firstName?: string | null; lastName?: string | null; realName?: string | null }): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.realName || 'Sin nombre';
}

/**
 * Formatea la fecha de nacimiento/muerte para mostrar
 * Delega a la versión compartida en dateUtils
 */
export function formatPartialDate(
  year?: number | null,
  month?: number | null,
  day?: number | null,
): string {
  return sharedFormatPartialDate(
    { year: year ?? null, month: month ?? null, day: day ?? null },
    { fallback: '' }
  );
}

/**
 * Calcula la edad entre dos fechas parciales
 * Delega a calculateYearsBetween de dateUtils
 */
export function calculateAge(
  birthYear?: number | null,
  birthMonth?: number | null,
  birthDay?: number | null,
  deathYear?: number | null,
  deathMonth?: number | null,
  deathDay?: number | null
): number | null {
  const birth: PartialDate = { year: birthYear ?? null, month: birthMonth ?? null, day: birthDay ?? null };
  const death: PartialDate | undefined = deathYear
    ? { year: deathYear, month: deathMonth ?? null, day: deathDay ?? null }
    : undefined;
  const age = calculateYearsBetween(birth, death);
  return age !== null && age >= 0 ? age : null;
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
 * Formatea una ubicación para el título: "Ciudad (Provincia, País)"
 */
function formatLocationForTitle(loc: LocationFilterOption): string {
  if (loc.fullPath) {
    const idx = loc.fullPath.indexOf(', ');
    if (idx !== -1) {
      return `${loc.fullPath.substring(0, idx)} (${loc.fullPath.substring(idx + 2)})`;
    }
  }
  return loc.name;
}

/**
 * Genera el título dinámico del listado según los filtros activos
 */
export function buildTitle(
  filters: PersonListFilters,
  filtersData: FiltersDataResponse | null
): string {
  let base = 'Listado de personas';

  // Género cambia la palabra base directamente
  if (filters.gender === 'FEMALE') {
    base = 'Listado de mujeres';
  } else if (filters.gender === 'MALE') {
    base = 'Listado de varones';
  }

  // Sufijo de género: masculino "os", femenino y genérico "as"
  const sfx = filters.gender === 'MALE' ? 'os' : 'as';

  const parts: string[] = [];

  if (filters.nationalityId && filtersData) {
    const nat = filtersData.nationalities.find(n => n.id === filters.nationalityId);
    if (nat) parts.push(`de nacionalidad ${nat.gentilicio || nat.name}`);
  }

  if (filters.birthLocationId && filtersData) {
    const loc = filtersData.birthLocations.find(l => l.id === filters.birthLocationId);
    if (loc) parts.push(`nacid${sfx} en ${formatLocationForTitle(loc)}`);
  }

  if (filters.birthYearFrom && filters.birthYearTo) {
    parts.push(`nacid${sfx} entre ${filters.birthYearFrom} y ${filters.birthYearTo}`);
  } else if (filters.birthYearFrom) {
    parts.push(`nacid${sfx} desde ${filters.birthYearFrom}`);
  } else if (filters.birthYearTo) {
    parts.push(`nacid${sfx} hasta ${filters.birthYearTo}`);
  }

  if (filters.deathLocationId && filtersData) {
    const loc = filtersData.deathLocations.find(l => l.id === filters.deathLocationId);
    if (loc) parts.push(`fallecid${sfx} en ${formatLocationForTitle(loc)}`);
  }

  if (filters.deathYearFrom && filters.deathYearTo) {
    parts.push(`fallecid${sfx} entre ${filters.deathYearFrom} y ${filters.deathYearTo}`);
  } else if (filters.deathYearFrom) {
    parts.push(`fallecid${sfx} desde ${filters.deathYearFrom}`);
  } else if (filters.deathYearTo) {
    parts.push(`fallecid${sfx} hasta ${filters.deathYearTo}`);
  }

  if (filters.roleId && filtersData) {
    if (filters.roleId === 'ACTOR') {
      if (filters.gender === 'FEMALE') {
        parts.push('que trabajaron como actrices');
      } else if (filters.gender === 'MALE') {
        parts.push('que trabajaron como actores');
      } else {
        parts.push('que trabajaron como actores/actrices');
      }
    } else if (filters.roleId === 'SELF') {
      parts.push(filters.gender === 'MALE' ? 'que aparecen como sí mismos' : 'que aparecen como sí mismas');
    } else {
      const role = filtersData.roles.find(r => String(r.id) === String(filters.roleId));
      if (role) parts.push(`que trabajaron en ${role.name.toLowerCase()}`);
    }
  }

  if (parts.length > 0) {
    return `${base}, ${parts.join(', ')}`;
  }

  return base;
}

/**
 * Genera el subtítulo con el criterio de orden actual
 */
export function buildSubtitle(filters: PersonListFilters): string {
  const sortBy = filters.sortBy || DEFAULT_PERSON_FILTERS.sortBy;
  const sortOrder = filters.sortOrder || DEFAULT_PERSON_FILTERS.sortOrder;
  const isAsc = sortOrder === 'asc';

  switch (sortBy) {
    case 'id':
      return isAsc
        ? 'Ordenado por ingreso a la base de datos, de más antiguo a más nuevo'
        : 'Ordenado por ingreso a la base de datos, de más nuevo a más antiguo';
    case 'lastName':
      return isAsc
        ? 'Ordenado alfabéticamente, de la A a la Z'
        : 'Ordenado alfabéticamente, de la Z a la A';
    case 'birthDate':
      return isAsc
        ? 'Ordenado por fecha de nacimiento, de más antigua a más reciente'
        : 'Ordenado por fecha de nacimiento, de más reciente a más antigua';
    case 'deathDate':
      return isAsc
        ? 'Ordenado por fecha de muerte, de más antigua a más reciente'
        : 'Ordenado por fecha de muerte, de más reciente a más antigua';
    case 'movieCount':
      return isAsc
        ? 'Ordenado por cantidad de películas, de menor a mayor'
        : 'Ordenado por cantidad de películas, de mayor a menor';
    default: {
      const option = SORT_OPTIONS.find(o => o.value === sortBy);
      const label = option ? option.label.toLowerCase() : sortBy;
      return `Ordenado por ${label}, ${isAsc ? 'ascendente' : 'descendente'}`;
    }
  }
}