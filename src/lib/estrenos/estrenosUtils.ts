// src/lib/estrenos/estrenosUtils.ts

import { Decade, DecadePeriod } from './estrenosTypes';

/**
 * Genera la lista de décadas desde 1890 hasta la década actual
 */
export function generateDecades(): Decade[] {
  const currentYear = new Date().getFullYear();
  const currentDecadeStart = Math.floor(currentYear / 10) * 10;
  
  const decades: Decade[] = [];
  
  // Desde 1890 hasta la década actual
  for (let decadeStart = 1890; decadeStart <= currentDecadeStart; decadeStart += 10) {
    const decadeEnd = decadeStart + 9;
    const years = Array.from({ length: 10 }, (_, i) => decadeStart + i);
    
    decades.push({
      id: `${decadeStart}s`,
      label: `${decadeStart}s`,
      startYear: decadeStart,
      endYear: decadeEnd,
      years
    });
  }
  
  // Ordenar de más reciente a más antigua
  return decades.reverse();
}

/**
 * Obtiene la década actual
 */
export function getCurrentDecade(): Decade {
  const currentYear = new Date().getFullYear();
  const decadeStart = Math.floor(currentYear / 10) * 10;
  const decadeEnd = decadeStart + 9;
  const years = Array.from({ length: 10 }, (_, i) => decadeStart + i);
  
  return {
    id: `${decadeStart}s`,
    label: `${decadeStart}s`,
    startYear: decadeStart,
    endYear: decadeEnd,
    years
  };
}

/**
 * Encuentra una década por su ID
 */
export function getDecadeById(decadeId: string): Decade | null {
  if (decadeId === 'all' || decadeId === 'upcoming') {
    return null;
  }
  
  const decades = generateDecades();
  return decades.find(d => d.id === decadeId) || null;
}

/**
 * Obtiene el año actual
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Verifica si un año está en el futuro
 */
export function isFutureYear(year: number): boolean {
  return year > getCurrentYear();
}

/**
 * Formatea el período para mostrar en la UI
 */
export function formatPeriodLabel(period: DecadePeriod, year: number | null): string {
  if (period === 'all') {
    return 'Todos los estrenos de la historia';
  }
  
  if (period === 'upcoming') {
    return 'Próximos estrenos';
  }
  
  if (year) {
    return `Estrenos de ${year}`;
  }
  
  // Si es una década sin año específico
  const decade = getDecadeById(period);
  if (decade) {
    return `Estrenos de los ${decade.label}`;
  }
  
  return 'Estrenos';
}

/**
 * Convierte el período a filtros de API
 */
export function periodToApiFilters(period: DecadePeriod, year: number | null): {
  year?: string;
  yearFrom?: string;
  yearTo?: string;
  upcoming?: string;
} {
  if (period === 'upcoming') {
    return { upcoming: 'true' };
  }
  
  if (year) {
    return { year: year.toString() };
  }
  
  if (period !== 'all') {
    const decade = getDecadeById(period);
    if (decade) {
      return {
        yearFrom: decade.startYear.toString(),
        yearTo: decade.endYear.toString()
      };
    }
  }
  
  return {};
}