// src/lib/shared/listUtils.ts
// Funciones utilitarias compartidas entre los distintos módulos de listados

/**
 * Genera los números de página para el paginador con elipsis
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

/**
 * Genera un array de años para los selectores (de mayor a menor)
 */
export function generateYearOptions(min: number, max: number): number[] {
  const years: number[] = [];
  for (let year = max; year >= min; year--) {
    years.push(year);
  }
  return years;
}

/**
 * Formatea la duración en formato legible
 * Ej: 90 -> "1h 30min", 45 -> "45 min", 120 -> "2h"
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
