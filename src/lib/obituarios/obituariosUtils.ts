// src/lib/obituarios/obituariosUtils.ts

import { PersonWithDeath } from './obituariosTypes';

/**
 * Nombres de los meses en español
 */
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Obtiene el año actual
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Genera array de años desde el primer año con defunciones hasta el actual
 */
export async function getAvailableYears(): Promise<number[]> {
  try {
    const response = await fetch('/api/people/death-years');
    if (!response.ok) {
      throw new Error('Error al obtener años');
    }
    
    const data = await response.json();
    return data.years || [];
  } catch (error) {
    console.error('Error loading death years:', error);
    return [];
  }
}

/**
 * Calcula la edad de una persona
 */
export function calculateAge(
  birthYear: number | null,
  birthMonth: number | null,
  birthDay: number | null,
  deathYear: number,
  deathMonth: number | null,
  deathDay: number | null
): number | null {
  if (!birthYear) return null;

  let age = deathYear - birthYear;

  // Ajustar si no ha llegado el cumpleaños
  if (birthMonth && deathMonth) {
    if (deathMonth < birthMonth) {
      age--;
    } else if (deathMonth === birthMonth && birthDay && deathDay) {
      if (deathDay < birthDay) {
        age--;
      }
    }
  }

  return age;
}

/**
 * Formatea el nombre completo de una persona
 */
export function formatPersonName(person: PersonWithDeath): string {
  const parts = [];
  if (person.firstName) parts.push(person.firstName);
  if (person.lastName) parts.push(person.lastName);
  return parts.join(' ') || 'Sin nombre';
}

/**
 * Formatea la fecha de muerte sin el año
 * Ejemplo: "2 de octubre" o "febrero" si solo hay mes
 */
export function formatDeathDate(
  deathMonth: number | null,
  deathDay: number | null
): string | null {
  if (!deathMonth) return null;
  
  const monthName = MONTH_NAMES[deathMonth - 1];
  
  if (deathDay) {
    return `${deathDay} de ${monthName}`;
  }
  
  return monthName;
}

/**
 * Formatea las fechas de vida "n. 1950 - f. 2024 (74 años)"
 */
export function formatLifeDates(person: PersonWithDeath): string {
  const parts = [];
  
  // Fecha de nacimiento
  if (person.birthYear) {
    parts.push(`n. ${person.birthYear}`);
  }
  
  // Fecha de muerte
  if (person.deathYear) {
    parts.push(`f. ${person.deathYear}`);
  }
  
  const result = parts.join(' - ');
  
  // Agregar edad si es posible calcularla
  const age = calculateAge(
    person.birthYear,
    person.birthMonth,
    person.birthDay,
    person.deathYear,
    person.deathMonth,
    person.deathDay
  );
  
  if (age !== null) {
    return `${result} (${age} años)`;
  }
  
  return result;
}

/**
 * Convierte filtros a query params para la API
 */
export function filtersToApiParams(year?: number, page = 1, limit = 90): Record<string, string> {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
    sortBy: 'deathYear',
    sortOrder: 'desc',
    hasDeathDate: 'true' // Solo personas fallecidas
  };
  
  if (year) {
    params.deathYear = year.toString();
  }
  
  return params;
}