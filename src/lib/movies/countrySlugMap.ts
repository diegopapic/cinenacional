// src/lib/movies/countrySlugMap.ts
// Maps SEO-friendly slugs to countryId (location.id) for /listados/peliculas/coproducciones/[countrySlug] routes.
// Only countries with 40+ coproductions get their own route.

export interface CountrySlugConfig {
  countryId: number
  /** Country name for display */
  name: string
  /** Demonym for titles (e.g. "alemanas") */
  demonym: string
}

export const COUNTRY_SLUG_MAP: Record<string, CountrySlugConfig> = {
  'espana': {
    countryId: 1903,
    name: 'España',
    demonym: 'españolas',
  },
  'francia': {
    countryId: 1905,
    name: 'Francia',
    demonym: 'francesas',
  },
  'uruguay': {
    countryId: 1906,
    name: 'Uruguay',
    demonym: 'uruguayas',
  },
  'brasil': {
    countryId: 1913,
    name: 'Brasil',
    demonym: 'brasileñas',
  },
  'alemania': {
    countryId: 1907,
    name: 'Alemania',
    demonym: 'alemanas',
  },
  'chile': {
    countryId: 1908,
    name: 'Chile',
    demonym: 'chilenas',
  },
  'estados-unidos': {
    countryId: 1920,
    name: 'Estados Unidos',
    demonym: 'estadounidenses',
  },
  'mexico': {
    countryId: 1922,
    name: 'México',
    demonym: 'mexicanas',
  },
  'italia': {
    countryId: 1909,
    name: 'Italia',
    demonym: 'italianas',
  },
  'paises-bajos': {
    countryId: 1919,
    name: 'Países Bajos',
    demonym: 'neerlandesas',
  },
}

/** All valid country slugs — used for generateStaticParams */
export const COUNTRY_SLUGS = Object.keys(COUNTRY_SLUG_MAP)

/** Reverse lookup: countryId → slug */
export const COUNTRY_ID_TO_SLUG: Record<number, string> = Object.fromEntries(
  Object.entries(COUNTRY_SLUG_MAP).map(([slug, config]) => [config.countryId, slug])
)
