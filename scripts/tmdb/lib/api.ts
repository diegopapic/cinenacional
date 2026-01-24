/**
 * Funciones de API para TMDB
 */

import config from '../config';
import type { TMDBMovieDetails } from './config';

const TMDB_BASE_URL = config.tmdbBaseUrl;

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${config.tmdbAccessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    return fetchTMDB<TMDBMovieDetails>(`/movie/${tmdbId}`, {
        append_to_response: 'credits,translations',
        language: 'es-ES',
    });
}

// Tipos para respuestas de popularidad (campos mínimos necesarios)
export interface TMDBPopularityResponse {
    id: number;
    popularity: number;
}

export interface TMDBPersonBasicDetails {
    id: number;
    name: string;
    popularity: number;
}

// Funciones para obtener solo popularidad (más eficientes)
export async function getMoviePopularity(tmdbId: number): Promise<TMDBPopularityResponse> {
    return fetchTMDB<TMDBPopularityResponse>(`/movie/${tmdbId}`, {
        language: 'es-ES',
    });
}

export async function getPersonPopularity(tmdbId: number): Promise<TMDBPersonBasicDetails> {
    return fetchTMDB<TMDBPersonBasicDetails>(`/person/${tmdbId}`, {
        language: 'es-ES',
    });
}
