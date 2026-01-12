/**
 * TMDB API Client
 * Documentación: https://developer.themoviedb.org/reference/intro/getting-started
 */

import config from './config';

// Tipos para respuestas de TMDB
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string; // "YYYY-MM-DD"
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  original_language: string;
  adult: boolean;
  video: boolean;
}

export interface TMDBMovieDetails extends TMDBMovie {
  imdb_id: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  production_companies: Array<{ id: number; name: string; origin_country: string }>;
  spoken_languages: Array<{ iso_639_1: string; name: string }>;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      order: number;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
  };
}

export interface TMDBPerson {
  id: number;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  adult: boolean;
  gender: number; // 0: not specified, 1: female, 2: male, 3: non-binary
  known_for_department: string;
  known_for: TMDBMovie[];
}

export interface TMDBPersonDetails extends TMDBPerson {
  imdb_id: string | null;
  birthday: string | null; // "YYYY-MM-DD"
  deathday: string | null; // "YYYY-MM-DD"
  place_of_birth: string | null;
  biography: string;
  also_known_as: string[];
  homepage: string | null;
  movie_credits?: {
    cast: Array<{
      id: number;
      title: string;
      character: string;
      release_date: string;
    }>;
    crew: Array<{
      id: number;
      title: string;
      job: string;
      department: string;
      release_date: string;
    }>;
  };
}

export interface TMDBSearchResult<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

// Rate limiting
let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < config.delayBetweenRequests) {
    await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
}

// Headers comunes para todas las requests
function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${config.tmdbAccessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Buscar películas por título
 */
export async function searchMovies(
  query: string, 
  year?: number,
  page: number = 1
): Promise<TMDBSearchResult<TMDBMovie>> {
  const params = new URLSearchParams({
    query,
    language: 'es-AR',
    page: page.toString(),
    include_adult: 'false',
  });
  
  if (year) {
    params.append('year', year.toString());
  }
  
  const url = `${config.tmdbBaseUrl}/search/movie?${params}`;
  
  const response = await rateLimitedFetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Obtener detalles de una película (incluye imdb_id)
 */
export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
  const params = new URLSearchParams({
    language: 'es-AR',
    append_to_response: 'credits',
  });
  
  const url = `${config.tmdbBaseUrl}/movie/${tmdbId}?${params}`;
  
  const response = await rateLimitedFetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Buscar personas por nombre
 */
export async function searchPeople(
  query: string,
  page: number = 1
): Promise<TMDBSearchResult<TMDBPerson>> {
  const params = new URLSearchParams({
    query,
    language: 'es-AR',
    page: page.toString(),
    include_adult: 'false',
  });
  
  const url = `${config.tmdbBaseUrl}/search/person?${params}`;
  
  const response = await rateLimitedFetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Obtener detalles de una persona (incluye imdb_id)
 */
export async function getPersonDetails(tmdbId: number): Promise<TMDBPersonDetails> {
  const params = new URLSearchParams({
    language: 'es-AR',
    append_to_response: 'movie_credits',
  });
  
  const url = `${config.tmdbBaseUrl}/person/${tmdbId}?${params}`;
  
  const response = await rateLimitedFetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Test de conexión a la API
 */
export async function testConnection(): Promise<boolean> {
  try {
    const url = `${config.tmdbBaseUrl}/configuration`;
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return response.ok;
  } catch (error) {
    console.error('Error testing TMDB connection:', error);
    return false;
  }
}

export default {
  searchMovies,
  getMovieDetails,
  searchPeople,
  getPersonDetails,
  testConnection,
};
