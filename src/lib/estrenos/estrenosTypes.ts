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

/** Movie summary for the estrenos (releases) listing */
export interface EstrenoMovie {
  id: number
  slug: string
  title: string
  year: number | null
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  posterUrl: string | null
  stage: string
  synopsis: string | null
  directors: Array<{ id: number; slug: string; name: string }>
  genres: Array<{ id: number; name: string }>
}

export interface EstrenosResponse {
  movies: EstrenoMovie[];
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