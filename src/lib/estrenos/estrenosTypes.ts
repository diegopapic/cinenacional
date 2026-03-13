// src/lib/estrenos/estrenosTypes.ts

export type DecadePeriod = 'all' | 'upcoming' | string; // '2020s', '2010s', etc.

export interface EstrenosFilters {
  period: DecadePeriod;
  year: number | null;
  page: number;
  limit: number;
}

export interface Decade {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  years: number[];
}

/** Modo de visualización de estrenos, derivado de la URL */
export type EstrenosMode =
  | { type: 'year'; value: number }
  | { type: 'decade'; start: number; end: number; label: string }
  | { type: 'upcoming' }

export interface EstrenosResponse {
  movies: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    period: DecadePeriod;
    year: number | null;
  };
}