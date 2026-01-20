/**
 * Script para importar películas desde TMDB a CineNacional
 * 
 * Uso:
 *   npx tsx import-tmdb-movies.ts --csv argentina-missing.csv     # Importar desde CSV
 *   npx tsx import-tmdb-movies.ts --id 1525353                    # Importar una película específica
 *   npx tsx import-tmdb-movies.ts --id 1525353 --dry-run          # Solo mostrar qué haría
 *   npx tsx import-tmdb-movies.ts --csv argentina-missing.csv --limit 5  # Solo las primeras 5
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import config from './config';

// ============================================================================
// CONFIGURACIÓN Y TIPOS
// ============================================================================

const TMDB_BASE_URL = config.tmdbBaseUrl;
const RATE_LIMIT_MS = config.delayBetweenRequests;

interface TMDBMovieDetails {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    release_date: string;
    runtime: number | null;
    genres: Array<{ id: number; name: string }>;
    production_countries: Array<{ iso_3166_1: string; name: string }>;
    credits: {
        cast: TMDBCastMember[];
        crew: TMDBCrewMember[];
    };
    translations: {
        translations: Array<{
            iso_3166_1: string;
            iso_639_1: string;
            data: {
                title: string;
                overview: string;
            };
        }>;
    };
}

interface TMDBCastMember {
    id: number;
    name: string;
    character: string;
    order: number;
    known_for_department: string;
}

interface TMDBCrewMember {
    id: number;
    name: string;
    job: string;
    department: string;
    known_for_department: string;
}

interface LocalPerson {
    id: number;
    first_name: string | null;
    last_name: string | null;
    tmdb_id: number | null;
    birth_year: number | null;
    death_year: number | null;
}

interface ImportResult {
    tmdb_id: number;
    title: string;
    status: 'success' | 'error' | 'skipped';
    movie_id?: number;
    message: string;
    cast_imported: number;
    crew_imported: number;
    people_created: number;
    people_found: number;
    people_needs_review: number;
}

interface NameSplitResult {
    firstName: string;
    lastName: string;
    gender: 'MALE' | 'FEMALE' | null;
    needsReview: boolean;
    reviewReason?: string;
}

interface PersonForReview {
    tmdb_id: number;
    full_name: string;
    first_name: string;
    last_name: string;
    gender: 'MALE' | 'FEMALE' | null;
    reason: string;
    movie_title: string;
    role: string;
}

interface PersonMatchResult {
    status: 'found' | 'create' | 'review';
    tmdb_id: number;
    name: string;
    local_id?: number;
    firstName?: string;
    lastName?: string;
    gender?: 'MALE' | 'FEMALE' | null;
    reason?: string;
}

// Cache global para first_name_gender
let firstNameGenderCache: Map<string, 'MALE' | 'FEMALE'> | null = null;

// Lista de personas que necesitan revisión
const peopleForReview: PersonForReview[] = [];

// ============================================================================
// MAPEO DE GÉNEROS TMDB -> CINENACIONAL
// ============================================================================

const GENRE_MAP: Record<number, number> = {
    28: 32,    // Action -> Acción
    12: 30,    // Adventure -> Aventuras
    16: 18,    // Animation -> Animación
    35: 17,    // Comedy -> Comedia
    80: 21,    // Crime -> Policial
    99: 15,    // Documentary -> Documental
    18: 16,    // Drama -> Drama
    10751: 29, // Family -> Infantil
    14: 26,    // Fantasy -> Fantástico
    36: 28,    // History -> Histórica
    27: 19,    // Horror -> Terror
    10402: 25, // Music -> Musical
    9648: 22,  // Mystery -> Suspenso
    10749: 23, // Romance -> Romántica
    878: 27,   // Science Fiction -> Ciencia ficción
    53: 24,    // Thriller -> Thriller
    10752: 36, // War -> Bélica
    37: 33,    // Western -> Western
};

// ============================================================================
// MAPEO DE DEPARTAMENTOS TMDB -> CINENACIONAL
// ============================================================================

const DEPARTMENT_MAP: Record<string, string> = {
    'Directing': 'DIRECCION',
    'Production': 'PRODUCCION',
    'Writing': 'GUION',
    'Camera': 'FOTOGRAFIA',
    'Editing': 'MONTAJE',
    'Sound': 'SONIDO',
    'Art': 'ARTE',
    'Costume & Make-Up': 'VESTUARIO',
    'Visual Effects': 'POSTPRODUCCION',
    'Lighting': 'FOTOGRAFIA',
    'Crew': 'OTROS',
};

// Mapeo de jobs de TMDB a role_id de CineNacional
const JOB_TO_ROLE_ID: Record<string, number> = {
    'Director': config.roles.director,
    'Director of Photography': 526,
    'Screenplay': 3,
    'Writer': 3,
    'Producer': 689,
    'Executive Producer': 703,
    'Editor': 636,
    'Original Music Composer': 641,
    'Music': 641,
    'Production Design': 836,
    'Art Direction': 836,
    'Costume Design': 835,
    'Makeup Artist': 838,
    'Sound Designer': 444,
    'Sound Mixer': 629,
    'Sound': 767,
};

// Mapeo de código ISO a nombre del país en castellano (como está en locations)
const ISO_TO_COUNTRY_NAME: Record<string, string> = {
    'AR': 'Argentina',
    'UY': 'Uruguay',
    'BR': 'Brasil',
    'CL': 'Chile',
    'MX': 'México',
    'ES': 'España',
    'US': 'Estados Unidos',
    'FR': 'Francia',
    'IT': 'Italia',
    'DE': 'Alemania',
    'GB': 'Reino Unido',
    'CO': 'Colombia',
    'PE': 'Perú',
    'VE': 'Venezuela',
    'BO': 'Bolivia',
    'PY': 'Paraguay',
    'EC': 'Ecuador',
    'CU': 'Cuba',
    'PR': 'Puerto Rico',
    'DO': 'República Dominicana',
    'CR': 'Costa Rica',
    'PA': 'Panamá',
    'GT': 'Guatemala',
    'HN': 'Honduras',
    'SV': 'El Salvador',
    'NI': 'Nicaragua',
    'PT': 'Portugal',
    'CA': 'Canadá',
    'AU': 'Australia',
    'NZ': 'Nueva Zelanda',
    'JP': 'Japón',
    'CN': 'China',
    'KR': 'Corea del Sur',
    'IN': 'India',
    'RU': 'Rusia',
    'PL': 'Polonia',
    'NL': 'Países Bajos',
    'BE': 'Bélgica',
    'CH': 'Suiza',
    'AT': 'Austria',
    'SE': 'Suecia',
    'NO': 'Noruega',
    'DK': 'Dinamarca',
    'FI': 'Finlandia',
    'IE': 'Irlanda',
    'IL': 'Israel',
    'ZA': 'Sudáfrica',
};

// ============================================================================
// POOL DE CONEXIÓN
// ============================================================================

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: config.databaseUrl,
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return pool;
}

async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// ============================================================================
// FUNCIONES DE API TMDB
// ============================================================================

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
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

async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    return fetchTMDB<TMDBMovieDetails>(`/movie/${tmdbId}`, {
        append_to_response: 'credits,translations',
        language: 'es-ES',
    });
}

function getSpanishTitle(movie: TMDBMovieDetails): string {
    const esTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es' && t.iso_3166_1 === 'ES'
    );

    if (esTranslation?.data?.title) {
        return esTranslation.data.title;
    }

    const esLaTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es'
    );

    if (esLaTranslation?.data?.title) {
        return esLaTranslation.data.title;
    }

    return movie.title;
}

function getSpanishOverview(movie: TMDBMovieDetails): string {
    const esTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es' && t.iso_3166_1 === 'ES'
    );

    if (esTranslation?.data?.overview) {
        return esTranslation.data.overview;
    }

    const esLaTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es'
    );

    if (esLaTranslation?.data?.overview) {
        return esLaTranslation.data.overview;
    }

    return movie.overview || '';
}

// ============================================================================
// INTEGRACIÓN CON CLAUDE API
// ============================================================================

async function askClaude(prompt: string): Promise<string> {
    console.log('🔑 API Key (primeros 20 chars):', config.anthropicApiKey?.substring(0, 20));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropicApiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function rewriteSynopsis(originalSynopsis: string, isDocumental: boolean): Promise<string> {
    if (!originalSynopsis || originalSynopsis.trim().length === 0) {
        return '';
    }

    const prompt = `Convertí el siguiente texto en una sinopsis cinematográfica que cumpla con estos criterios:

Extensión: entre 400 y 500 caracteres (incluyendo espacios)

Contenido:
- Describí únicamente la premisa y situación inicial
- Presentá los personajes principales y el conflicto central
- Sin spoilers: no reveles giros argumentales, desenlaces ni información del último tercio de la película
${isDocumental ? '- Es un documental: comenzá con la estructura "Documental que..." e integrá esa palabra al texto' : ''}
- Si el texto fuente no ofrece suficiente información para alcanzar los 400 caracteres, es preferible entregar una sinopsis más breve antes que inventar o inferir datos que no estén en el original

Estilo:
- Tono neutral y objetivo, sin juicios de valor
- Sin lenguaje promocional ni adjetivos laudatorios
- Redacción clara y directa
- Tercera persona, tiempo presente
- Español rioplatense (con voseo) pero sin lunfardo ni jerga

Restricciones:
- NO incluyas título, director, actores, países ni datos técnicos
- NO uses metadiscurso como "La película narra...", "El film cuenta...", "Esta historia trata de..."
- Comenzá directamente con la acción o situación ${isDocumental ? '(usando "Documental que...")' : ''}

Texto original:
${originalSynopsis}

Responde SOLO con la sinopsis reescrita, sin explicaciones ni comentarios adicionales.`;

    try {
        const rewritten = await askClaude(prompt);
        return rewritten.trim();
    } catch (error) {
        console.log(`     ⚠ Error al reescribir sinopsis con Claude: ${error}`);
        return originalSynopsis; // Fallback al original
    }
}

/**
 * Filtra nombres de personajes que están en inglés o son genéricos
 */
function filterCharacterName(character: string | null): string | null {
    if (!character) return null;

    const invalidCharacters = [
        'self',
        'himself',
        'herself',
        'themselves',
        'narrator',
        'voice',
        'voice over',
        'voiceover',
        'archive footage',
        'archival footage',
        'interviewee',
        'additional voices',
        'uncredited',
    ];

    const lowerChar = character.toLowerCase().trim();

    // Si es un nombre inválido o genérico en inglés, retornar null
    if (invalidCharacters.includes(lowerChar)) {
        return null;
    }

    // Si empieza con "Self -" o "Self (" también es inválido
    if (lowerChar.startsWith('self -') || lowerChar.startsWith('self (')) {
        return null;
    }

    return character;
}

// ============================================================================
// FUNCIONES DE SEPARACIÓN DE NOMBRE Y GÉNERO
// ============================================================================

/**
 * Tokeniza un nombre respetando apodos entre comillas
 * Igual que en NameSplitModal.tsx
 */
function tokenizeName(fullName: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < fullName.length; i++) {
        const char = fullName[i];
        const prevChar = i > 0 ? fullName[i - 1] : '';

        // Detectar inicio de comillas (solo si hay espacio antes o es el inicio)
        if (!inQuotes && (char === '"' || char === "'" || char === '«' || char === '"')) {
            if (prevChar === ' ' || i === 0) {
                inQuotes = true;
                quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char);
                current += char;
                continue;
            }
        }

        // Detectar fin de comillas
        if (inQuotes && (char === quoteChar || (quoteChar === '"' && char === '"'))) {
            current += char;
            inQuotes = false;
            quoteChar = '';
            continue;
        }

        // Espacios fuera de comillas separan tokens
        if (char === ' ' && !inQuotes) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Agregar última palabra
    if (current.trim()) {
        tokens.push(current.trim());
    }

    return tokens;
}

/**
 * Carga el cache de first_name_gender desde la base de datos
 */
async function loadFirstNameGenderCache(): Promise<void> {
    if (firstNameGenderCache !== null) {
        return;
    }

    const pool = getPool();
    const result = await pool.query(`
    SELECT name, gender FROM first_name_genders
  `);

    firstNameGenderCache = new Map();
    for (const row of result.rows) {
        firstNameGenderCache.set(row.name.toLowerCase(), row.gender);
    }

    console.log(`📚 Cache de nombres cargado: ${firstNameGenderCache.size} entradas`);
}

/**
 * Busca un nombre en el cache de first_name_gender
 */
function lookupGender(name: string): 'MALE' | 'FEMALE' | null {
    if (!firstNameGenderCache) {
        return null;
    }

    const cleanName = name
        .replace(/["'"«»""]/g, '')
        .trim()
        .toLowerCase();

    return firstNameGenderCache.get(cleanName) || null;
}

/**
 * Separa un nombre completo en nombre y apellido, y determina el género
 */
function splitNameAndGetGender(fullName: string): NameSplitResult {
    const tokens = tokenizeName(fullName.trim());

    if (tokens.length === 0) {
        return {
            firstName: '',
            lastName: '',
            gender: null,
            needsReview: true,
            reviewReason: 'Nombre vacío'
        };
    }

    if (tokens.length === 1) {
        const gender = lookupGender(tokens[0]);
        return {
            firstName: tokens[0],
            lastName: '',
            gender,
            needsReview: gender === null,
            reviewReason: gender === null ? 'Nombre único no encontrado en base de datos' : undefined
        };
    }

    // Buscar progresivamente cuántos tokens forman el nombre
    let firstNameWordCount = 0;
    let detectedGender: 'MALE' | 'FEMALE' | null = null;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const gender = lookupGender(token);

        if (gender !== null) {
            firstNameWordCount = i + 1;

            if (detectedGender === null) {
                detectedGender = gender;
            }
        } else {
            break;
        }
    }

    // Si no se encontró ningún nombre conocido, usar la primera palabra
    if (firstNameWordCount === 0) {
        return {
            firstName: tokens[0],
            lastName: tokens.slice(1).join(' '),
            gender: null,
            needsReview: true,
            reviewReason: `Primer nombre "${tokens[0]}" no encontrado en base de datos`
        };
    }

    const firstName = tokens.slice(0, firstNameWordCount).join(' ');
    const lastName = tokens.slice(firstNameWordCount).join(' ');

    return {
        firstName,
        lastName,
        gender: detectedGender,
        needsReview: false
    };
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

async function movieExistsByTmdbId(tmdbId: number): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query(
        'SELECT id FROM movies WHERE tmdb_id = $1',
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

async function findPersonByTmdbId(tmdbId: number): Promise<LocalPerson | null> {
    const pool = getPool();
    const result = await pool.query(
        `SELECT id, first_name, last_name, tmdb_id, birth_year, death_year 
     FROM people WHERE tmdb_id = $1`,
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function findPersonByName(name: string): Promise<LocalPerson[]> {
    const pool = getPool();

    let query = `
    SELECT id, first_name, last_name, tmdb_id, birth_year, death_year 
    FROM people 
    WHERE LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) = LOWER($1)
       OR LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, ''))) = LOWER($1)
  `;

    const result = await pool.query(query, [name]);
    return result.rows;
}

async function findPersonByNameAndDepartment(
    name: string,
    department: string,
    movieYear: number
): Promise<LocalPerson | null> {
    const candidates = await findPersonByName(name);

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length === 1) {
        return candidates[0];
    }

    const pool = getPool();

    for (const candidate of candidates) {
        const deptResult = await pool.query(`
      SELECT DISTINCT mc.department 
      FROM movie_crew mc
      WHERE mc.person_id = $1
    `, [candidate.id]);

        const departments = deptResult.rows.map((r: any) => r.department);
        const localDept = DEPARTMENT_MAP[department] || 'OTROS';

        if (departments.includes(localDept)) {
            if (candidate.birth_year) {
                const estimatedAge = movieYear - candidate.birth_year;
                if (estimatedAge >= 15 && estimatedAge <= 90) {
                    return candidate;
                }
            } else {
                const yearsResult = await pool.query(`
          SELECT MIN(m.year) as min_year, MAX(m.year) as max_year
          FROM movies m
          JOIN movie_crew mc ON m.id = mc.movie_id
          WHERE mc.person_id = $1
        `, [candidate.id]);

                if (yearsResult.rows[0].min_year && yearsResult.rows[0].max_year) {
                    const minYear = yearsResult.rows[0].min_year;
                    const maxYear = yearsResult.rows[0].max_year;
                    if (movieYear >= minYear - 10 && movieYear <= maxYear + 30) {
                        return candidate;
                    }
                }
            }
        }
    }

    for (const candidate of candidates) {
        const castResult = await pool.query(`
      SELECT COUNT(*) as count FROM movie_cast WHERE person_id = $1
    `, [candidate.id]);

        if (castResult.rows[0].count > 0) {
            if (candidate.birth_year) {
                const estimatedAge = movieYear - candidate.birth_year;
                if (estimatedAge >= 5 && estimatedAge <= 95) {
                    return candidate;
                }
            }
        }
    }

    return null;
}

/**
 * Analiza una persona y determina qué se haría (sin insertar)
 */
async function analyzePersonMatch(
    tmdbId: number,
    name: string,
    department: string,
    movieYear: number
): Promise<PersonMatchResult> {
    // 1. Buscar por tmdb_id
    const byTmdb = await findPersonByTmdbId(tmdbId);
    if (byTmdb) {
        return {
            status: 'found',
            tmdb_id: tmdbId,
            name: name,
            local_id: byTmdb.id
        };
    }

    // 2. Buscar por nombre
    const byName = await findPersonByNameAndDepartment(name, department, movieYear);
    if (byName) {
        return {
            status: 'found',
            tmdb_id: tmdbId,
            name: name,
            local_id: byName.id
        };
    }

    // 3. Se crearía nueva - analizar nombre
    const splitResult = splitNameAndGetGender(name);

    if (splitResult.needsReview) {
        return {
            status: 'review',
            tmdb_id: tmdbId,
            name: name,
            firstName: splitResult.firstName,
            lastName: splitResult.lastName,
            gender: splitResult.gender,
            reason: splitResult.reviewReason
        };
    }

    return {
        status: 'create',
        tmdb_id: tmdbId,
        name: name,
        firstName: splitResult.firstName,
        lastName: splitResult.lastName,
        gender: splitResult.gender
    };
}

async function createPerson(
    tmdbId: number,
    name: string,
    knownForDepartment: string,
    movieTitle: string,
    role: string
): Promise<number> {
    const pool = getPool();

    const splitResult = splitNameAndGetGender(name);
    const { firstName, lastName, gender, needsReview, reviewReason } = splitResult;

    if (needsReview) {
        peopleForReview.push({
            tmdb_id: tmdbId,
            full_name: name,
            first_name: firstName,
            last_name: lastName,
            gender,
            reason: reviewReason || 'Requiere revisión manual',
            movie_title: movieTitle,
            role
        });
    }

    // Generar slug único
    const baseSlug = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existing = await pool.query('SELECT id FROM people WHERE slug = $1', [slug]);
        if (existing.rows.length === 0) break;
        slug = `${baseSlug}-${counter++}`;
    }

    const result = await pool.query(`
    INSERT INTO people (first_name, last_name, slug, tmdb_id, gender, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
    RETURNING id
  `, [firstName, lastName, slug, tmdbId, gender]);

    return result.rows[0].id;
}

async function createMovie(
    movie: TMDBMovieDetails,
    title: string,
    synopsis: string,
    hasCoproduction: boolean
): Promise<number> {
    const pool = getPool();

    const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;

    // Calcular tipo_duracion según duración
    let tipoDuracion = 'largometraje';
    if (movie.runtime) {
        if (movie.runtime < 30) {
            tipoDuracion = 'cortometraje';
        } else if (movie.runtime <= 59) {
            tipoDuracion = 'mediometraje';
        }
    }

    const baseSlug = title.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    let slug = year ? `${baseSlug}-${year}` : baseSlug;
    let counter = 1;

    while (true) {
        const existing = await pool.query('SELECT id FROM movies WHERE slug = $1', [slug]);
        if (existing.rows.length === 0) break;
        slug = `${baseSlug}-${year}-${counter++}`;
    }

    const result = await pool.query(`
    INSERT INTO movies (
      title, slug, year, 
      duration, synopsis, tmdb_id,
      stage, data_completeness,
      sound_type, color_type_id, tipo_duracion,
      is_coproduction,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, 
      $4, $5, $6,
      'COMPLETA', 'BASIC_PRESS_KIT',
      'Sonora', 1, $7,
      $8,
      NOW(), NOW()
    )
    RETURNING id
  `, [
        title,
        slug,
        year,
        movie.runtime,
        synopsis,
        movie.id,
        tipoDuracion,
        hasCoproduction,
    ]);

    return result.rows[0].id;
}

async function addMovieGenres(movieId: number, tmdbGenres: Array<{ id: number }>): Promise<void> {
    const pool = getPool();

    for (let i = 0; i < tmdbGenres.length; i++) {
        const tmdbGenreId = tmdbGenres[i].id;
        const localGenreId = GENRE_MAP[tmdbGenreId];

        if (localGenreId) {
            await pool.query(`
        INSERT INTO movie_genres (movie_id, genre_id, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [movieId, localGenreId, i === 0]);
        }
    }
}

async function addMovieCountries(movieId: number, countries: Array<{ iso_3166_1: string }>): Promise<void> {
    const pool = getPool();

    // Solo agregar países que NO sean Argentina
    const coProducers = countries.filter(c => c.iso_3166_1 !== 'AR');

    for (const country of coProducers) {
        const countryName = ISO_TO_COUNTRY_NAME[country.iso_3166_1];

        if (countryName) {
            const countryResult = await pool.query(
                `SELECT id FROM locations WHERE name = $1 LIMIT 1`,
                [countryName]
            );

            if (countryResult.rows.length > 0) {
                await pool.query(`
          INSERT INTO movie_countries (movie_id, country_id, is_primary)
          VALUES ($1, $2, false)
          ON CONFLICT DO NOTHING
        `, [movieId, countryResult.rows[0].id]);
            } else {
                console.log(`     ⚠ País no encontrado en locations: ${countryName} (${country.iso_3166_1})`);
            }
        } else {
            console.log(`     ⚠ Código ISO no mapeado: ${country.iso_3166_1}`);
        }
    }
}

async function addMovieCast(
    movieId: number,
    cast: TMDBCastMember[],
    movieYear: number,
    movieTitle: string,
    tmdbGenres: Array<{ id: number; name: string }>,
    stats: { created: number }
): Promise<number> {
    const pool = getPool();
    let imported = 0;

    // Detectar si es documental (género TMDB id 99)
    const isDocumental = tmdbGenres.some(g => g.id === 99);
    const isActor = !isDocumental;

    const mainCast = cast.slice(0, 20);

    for (const member of mainCast) {
        let personId: number | null = null;

        const byTmdb = await findPersonByTmdbId(member.id);
        if (byTmdb) {
            personId = byTmdb.id;
        } else {
            const byName = await findPersonByNameAndDepartment(
                member.name,
                'Acting',
                movieYear
            );

            if (byName) {
                personId = byName.id;
                if (!byName.tmdb_id) {
                    await pool.query(
                        'UPDATE people SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
                        [member.id, personId]
                    );
                }
            } else {
                personId = await createPerson(
                    member.id,
                    member.name,
                    member.known_for_department,
                    movieTitle,
                    'cast'
                );
                stats.created++;
            }
        }

        await pool.query(`
      INSERT INTO movie_cast (
        movie_id, person_id, character_name, billing_order, is_principal, is_actor
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [movieId, personId, filterCharacterName(member.character), member.order, member.order < 5, isActor]);

        imported++;
    }

    return imported;
}

async function addMovieCrew(
    movieId: number,
    crew: TMDBCrewMember[],
    movieYear: number,
    movieTitle: string,
    stats: { created: number }
): Promise<number> {
    const pool = getPool();
    let imported = 0;

    const importantJobs = Object.keys(JOB_TO_ROLE_ID);

    const relevantCrew = crew.filter(c => importantJobs.includes(c.job));
    const uniqueCrew = new Map<string, TMDBCrewMember>();

    for (const member of relevantCrew) {
        const key = `${member.id}-${member.job}`;
        if (!uniqueCrew.has(key)) {
            uniqueCrew.set(key, member);
        }
    }

    // Registrar jobs no mapeados para el reporte
    const unmappedJobs = crew.filter(c => !importantJobs.includes(c.job));
    const uniqueUnmappedJobs = new Map<string, TMDBCrewMember>();
    for (const member of unmappedJobs) {
        const key = `${member.id}-${member.job}`;
        if (!uniqueUnmappedJobs.has(key)) {
            uniqueUnmappedJobs.set(key, member);
        }
    }

    // Agregar los no mapeados al reporte de revisión
    for (const [, member] of uniqueUnmappedJobs) {
        peopleForReview.push({
            tmdb_id: member.id,
            full_name: member.name,
            first_name: '',
            last_name: '',
            gender: null,
            reason: `Job no mapeado: "${member.job}" (${member.department})`,
            movie_title: movieTitle,
            role: member.job
        });
    }

    for (const [, member] of uniqueCrew) {
        let personId: number | null = null;

        const byTmdb = await findPersonByTmdbId(member.id);
        if (byTmdb) {
            personId = byTmdb.id;
        } else {
            const byName = await findPersonByNameAndDepartment(
                member.name,
                member.department,
                movieYear
            );

            if (byName) {
                personId = byName.id;
                if (!byName.tmdb_id) {
                    await pool.query(
                        'UPDATE people SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
                        [member.id, personId]
                    );
                }
            } else {
                personId = await createPerson(
                    member.id,
                    member.name,
                    member.known_for_department,
                    movieTitle,
                    member.job
                );
                stats.created++;
            }
        }

        const roleId = JOB_TO_ROLE_ID[member.job];

        await pool.query(`
      INSERT INTO movie_crew (movie_id, person_id, role_id, billing_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [movieId, personId, roleId, null]);

        imported++;
    }

    return imported;
}

// ============================================================================
// FUNCIÓN DE ANÁLISIS DRY-RUN
// ============================================================================

async function analyzeMovieDryRun(
    movie: TMDBMovieDetails,
    title: string,
    movieYear: number
): Promise<{ found: number; create: number; review: number }> {
    const stats = { found: 0, create: 0, review: 0 };

    // Analizar Cast
    const mainCast = movie.credits.cast.slice(0, 20);
    console.log(`\n  👥 CAST (${mainCast.length} personas):`);

    for (const member of mainCast) {
        const result = await analyzePersonMatch(member.id, member.name, 'Acting', movieYear);

        if (result.status === 'found') {
            console.log(`     ✓ ${member.name} (tmdb:${member.id}) → Encontrado: ID ${result.local_id}`);
            stats.found++;
        } else if (result.status === 'create') {
            const genderStr = result.gender ? (result.gender === 'MALE' ? 'M' : 'F') : '?';
            console.log(`     + ${member.name} (tmdb:${member.id}) → CREAR: "${result.firstName}" + "${result.lastName}" (${genderStr})`);
            stats.create++;
        } else {
            console.log(`     ⚠ ${member.name} (tmdb:${member.id}) → CREAR: "${result.firstName}" + "${result.lastName}" (?) - ${result.reason}`);
            stats.review++;
        }
    }

    // Analizar Crew
    const importantJobs = ['Director', 'Director of Photography', 'Screenplay', 'Writer',
        'Producer', 'Executive Producer', 'Editor', 'Original Music Composer', 'Music',
        'Production Design', 'Art Direction', 'Costume Design', 'Makeup Artist',
        'Sound Designer', 'Sound Mixer'];

    const relevantCrew = movie.credits.crew.filter(c => importantJobs.includes(c.job));
    const uniqueCrew = new Map<string, TMDBCrewMember>();

    for (const member of relevantCrew) {
        const key = `${member.id}-${member.job}`;
        if (!uniqueCrew.has(key)) {
            uniqueCrew.set(key, member);
        }
    }

    console.log(`\n  🎬 CREW (${uniqueCrew.size} personas):`);

    for (const [, member] of uniqueCrew) {
        const result = await analyzePersonMatch(member.id, member.name, member.department, movieYear);

        if (result.status === 'found') {
            console.log(`     ✓ ${member.name} [${member.job}] (tmdb:${member.id}) → Encontrado: ID ${result.local_id}`);
            stats.found++;
        } else if (result.status === 'create') {
            const genderStr = result.gender ? (result.gender === 'MALE' ? 'M' : 'F') : '?';
            console.log(`     + ${member.name} [${member.job}] (tmdb:${member.id}) → CREAR: "${result.firstName}" + "${result.lastName}" (${genderStr})`);
            stats.create++;
        } else {
            console.log(`     ⚠ ${member.name} [${member.job}] (tmdb:${member.id}) → CREAR: "${result.firstName}" + "${result.lastName}" (?) - ${result.reason}`);
            stats.review++;
        }
    }

    return stats;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE IMPORTACIÓN
// ============================================================================

async function importMovie(tmdbId: number, dryRun: boolean): Promise<ImportResult> {
    const result: ImportResult = {
        tmdb_id: tmdbId,
        title: '',
        status: 'error',
        message: '',
        cast_imported: 0,
        crew_imported: 0,
        people_created: 0,
        people_found: 0,
        people_needs_review: 0,
    };

    try {
        const existingId = await movieExistsByTmdbId(tmdbId);
        if (existingId) {
            result.status = 'skipped';
            result.message = `Ya existe con ID ${existingId}`;
            result.movie_id = existingId;
            return result;
        }

        console.log(`  📥 Obteniendo datos de TMDB...`);
        const movie = await getMovieDetails(tmdbId);
        await sleep(RATE_LIMIT_MS);

        const title = getSpanishTitle(movie);
        const originalSynopsis = getSpanishOverview(movie);
        const isDocumental = movie.genres.some(g => g.id === 99);

        // Reescribir sinopsis con Claude
        let synopsis = originalSynopsis;
        if (originalSynopsis && !dryRun) {
            console.log(`  ✍️  Reescribiendo sinopsis con Claude...`);
            synopsis = await rewriteSynopsis(originalSynopsis, isDocumental);
        }
        const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();

        result.title = title;

        console.log(`  📋 Título: ${title}`);
        console.log(`  📅 Año: ${year}`);
        console.log(`  ⏱️  Duración: ${movie.runtime || 'N/A'} min`);
        console.log(`  🎭 Géneros: ${movie.genres.map(g => g.name).join(', ')}`);
        console.log(`  🌍 Países: ${movie.production_countries.map(c => c.iso_3166_1).join(', ')}`);

        if (dryRun) {
            // Análisis detallado de personas
            const personStats = await analyzeMovieDryRun(movie, title, year);

            result.people_found = personStats.found;
            result.people_created = personStats.create;
            result.people_needs_review = personStats.review;

            console.log(`\n  📊 Resumen personas:`);
            console.log(`     ✓ Encontradas: ${personStats.found}`);
            console.log(`     + A crear: ${personStats.create}`);
            console.log(`     ⚠ Requieren revisión: ${personStats.review}`);

            result.status = 'success';
            result.message = 'DRY RUN - Análisis completado';
            return result;
        }

        console.log(`\n  💾 Creando película...`);
        // Detectar si hay coproducción (otro país además de Argentina)
        const hasCoproduction = movie.production_countries.some(c => c.iso_3166_1 !== 'AR');
        const movieId = await createMovie(movie, title, synopsis, hasCoproduction);
        result.movie_id = movieId;

        console.log(`  🏷️  Agregando géneros...`);
        await addMovieGenres(movieId, movie.genres);

        console.log(`  🌍 Agregando países...`);
        await addMovieCountries(movieId, movie.production_countries);

        console.log(`  👥 Importando cast...`);
        const stats = { created: 0 };
        result.cast_imported = await addMovieCast(movieId, movie.credits.cast, year, title, movie.genres, stats);

        console.log(`  🎬 Importando crew...`);
        result.crew_imported = await addMovieCrew(movieId, movie.credits.crew, year, title, stats);
        result.people_created = stats.created;

        result.status = 'success';
        result.message = `Importada exitosamente`;

    } catch (error) {
        result.status = 'error';
        result.message = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
}

// ============================================================================
// PARSEO DE CSV
// ============================================================================

function parseCSV(filePath: string): Array<{ tmdb_id: number; tmdb_title: string }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.replace(/"/g, '').replace(/^\uFEFF/, ''));
    const tmdbIdIndex = headers.findIndex(h => h === 'tmdb_id');
    const titleIndex = headers.findIndex(h => h === 'tmdb_title');

    if (tmdbIdIndex === -1) {
        throw new Error('No se encontró la columna tmdb_id en el CSV');
    }

    const movies: Array<{ tmdb_id: number; tmdb_title: string }> = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const tmdbId = parseInt(values[tmdbIdIndex]);
        const title = titleIndex >= 0 ? values[titleIndex]?.replace(/"/g, '') : '';

        if (!isNaN(tmdbId)) {
            movies.push({ tmdb_id: tmdbId, tmdb_title: title });
        }
    }

    return movies;
}

// ============================================================================
// GENERACIÓN DE REPORTE DE REVISIÓN
// ============================================================================

function generateReviewReport(): void {
    if (peopleForReview.length === 0) {
        console.log('\n✅ No hay personas que requieran revisión manual.');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(__dirname, 'reports', `people-review-${timestamp}.csv`);

    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const headers = ['tmdb_id', 'full_name', 'first_name', 'last_name', 'gender', 'reason', 'movie_title', 'role'];
    const rows = peopleForReview.map(p => [
        p.tmdb_id,
        `"${p.full_name}"`,
        `"${p.first_name}"`,
        `"${p.last_name}"`,
        p.gender || 'NULL',
        `"${p.reason}"`,
        `"${p.movie_title}"`,
        `"${p.role}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(reportPath, csvContent, 'utf-8');

    console.log(`\n📋 PERSONAS QUE REQUIEREN REVISIÓN: ${peopleForReview.length}`);
    console.log(`   Reporte guardado en: ${reportPath}`);

    const reasonCounts = new Map<string, number>();
    for (const p of peopleForReview) {
        const count = reasonCounts.get(p.reason) || 0;
        reasonCounts.set(p.reason, count + 1);
    }

    console.log('\n   Resumen por razón:');
    for (const [reason, count] of reasonCounts) {
        console.log(`   - ${reason}: ${count}`);
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    console.log('🎬 TMDB Movie Import Script v2.0');
    console.log('================================\n');

    const args = process.argv.slice(2);
    const csvIndex = args.indexOf('--csv');
    const idIndex = args.indexOf('--id');
    const limitIndex = args.indexOf('--limit');
    const dryRun = args.includes('--dry-run');

    let moviesToImport: Array<{ tmdb_id: number; tmdb_title: string }> = [];

    if (idIndex !== -1 && args[idIndex + 1]) {
        const tmdbId = parseInt(args[idIndex + 1]);
        if (isNaN(tmdbId)) {
            console.error('❌ ID inválido');
            process.exit(1);
        }
        moviesToImport = [{ tmdb_id: tmdbId, tmdb_title: '' }];
    } else if (csvIndex !== -1 && args[csvIndex + 1]) {
        const csvPath = args[csvIndex + 1];
        if (!fs.existsSync(csvPath)) {
            const reportsPath = path.join(__dirname, 'reports', csvPath);
            if (fs.existsSync(reportsPath)) {
                moviesToImport = parseCSV(reportsPath);
            } else {
                console.error(`❌ No se encontró el archivo: ${csvPath}`);
                process.exit(1);
            }
        } else {
            moviesToImport = parseCSV(csvPath);
        }
    } else {
        console.log('Uso:');
        console.log('  npx tsx import-tmdb-movies.ts --id <tmdb_id>              # Importar una película');
        console.log('  npx tsx import-tmdb-movies.ts --csv <archivo.csv>        # Importar desde CSV');
        console.log('  npx tsx import-tmdb-movies.ts --csv <archivo.csv> --limit 5');
        console.log('  npx tsx import-tmdb-movies.ts --id <tmdb_id> --dry-run   # Solo mostrar qué haría');
        process.exit(0);
    }

    if (limitIndex !== -1 && args[limitIndex + 1]) {
        const limit = parseInt(args[limitIndex + 1]);
        if (!isNaN(limit)) {
            moviesToImport = moviesToImport.slice(0, limit);
        }
    }

    console.log(`📋 Películas a importar: ${moviesToImport.length}`);
    if (dryRun) {
        console.log('🔍 MODO DRY-RUN: No se aplicarán cambios\n');
    }

    // Cargar cache de nombres SIEMPRE (para dry-run también)
    await loadFirstNameGenderCache();

    const results: ImportResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < moviesToImport.length; i++) {
        const movie = moviesToImport[i];
        console.log(`\n[${i + 1}/${moviesToImport.length}] 🎬 TMDB ID: ${movie.tmdb_id} - ${movie.tmdb_title || '(sin título)'}`);

        const result = await importMovie(movie.tmdb_id, dryRun);
        results.push(result);

        const statusIcon = result.status === 'success' ? '✅' :
            result.status === 'skipped' ? '⏭️' : '❌';
        console.log(`\n  ${statusIcon} ${result.message}`);

        if (result.status === 'success' && !dryRun) {
            console.log(`     ID: ${result.movie_id} | Cast: ${result.cast_imported} | Crew: ${result.crew_imported} | Personas nuevas: ${result.people_created}`);
        }

        await sleep(RATE_LIMIT_MS);
    }

    // Resumen
    const elapsed = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN GENERAL');
    console.log('='.repeat(50));
    console.log(`   Total procesadas:    ${results.length}`);
    console.log(`   ✅ Exitosas:         ${successCount}`);
    console.log(`   ⏭️  Ya existían:      ${skippedCount}`);
    console.log(`   ❌ Errores:          ${errorCount}`);

    if (dryRun) {
        const totalFound = results.reduce((sum, r) => sum + r.people_found, 0);
        const totalCreate = results.reduce((sum, r) => sum + r.people_created, 0);
        const totalReview = results.reduce((sum, r) => sum + r.people_needs_review, 0);

        console.log(`\n   👥 Personas:`);
        console.log(`      ✓ Encontradas:       ${totalFound}`);
        console.log(`      + A crear:           ${totalCreate}`);
        console.log(`      ⚠ Requieren revisión: ${totalReview}`);
    } else {
        const totalPeopleCreated = results.reduce((sum, r) => sum + r.people_created, 0);
        console.log(`   👤 Personas creadas: ${totalPeopleCreated}`);
    }

    console.log(`   ⏱️  Tiempo:           ${Math.round(elapsed / 1000)}s`);

    if (dryRun) {
        console.log('\n💡 Modo dry-run: Para aplicar cambios, quitar --dry-run');
    }

    // Generar reporte de personas que necesitan revisión (solo si no es dry-run)
    if (!dryRun) {
        generateReviewReport();
    }

    await closePool();
    console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});