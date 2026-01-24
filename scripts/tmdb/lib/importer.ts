/**
 * Lógica core de importación de películas desde TMDB
 */

import {
    GENRE_MAP,
    ISO_TO_COUNTRY_NAME,
    JOB_TO_ROLE_ID,
    JOB_TO_MULTIPLE_ROLES,
    TMDB_STATUS_TO_STAGE,
    type TMDBMovieDetails,
    type TMDBCastMember,
    type TMDBCrewMember,
    type ImportResult,
    type PersonForReview,
} from './config';
import { getPool, findPersonByTmdbId, findPersonByNameAndDepartment, updatePersonTmdbId, getCountryIdByName } from './database';
import { splitNameAndGetGender, rewriteSynopsis, peopleForReview } from './claude';
import { getPersonDetails } from '../tmdb-client';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
    cloud_name: 'dzndglyjr',
    api_key: process.env.CLOUDINARY_API_KEY || '916999397279161',
    api_secret: process.env.CLOUDINARY_API_SECRET || '6K7EQkELG4dgl4RgdA5wsTwSPpI'
});

// URL base de TMDB para imágenes
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

// ============================================================================
// FUNCIONES DE TÍTULO Y SINOPSIS
// ============================================================================

export function getSpanishTitle(movie: TMDBMovieDetails): string {
    // 1. Si el idioma original es español, usar el título original directamente
    if (movie.original_language === 'es' && movie.original_title) {
        return movie.original_title;
    }

    // 2. Buscar traducción es-ES (castellano de España)
    const esEsTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es' && t.iso_3166_1 === 'ES'
    );
    if (esEsTranslation?.data?.title) {
        return esEsTranslation.data.title;
    }

    // 3. Fallback: cualquier traducción en español
    const esTranslation = movie.translations.translations.find(
        t => t.iso_639_1 === 'es'
    );
    if (esTranslation?.data?.title) {
        return esTranslation.data.title;
    }

    // 4. Fallback: título de la API (ya viene en es-ES por el parámetro language)
    if (movie.title) {
        return movie.title;
    }

    // 5. Último recurso: título original
    return movie.original_title;
}

export function getSpanishOverview(movie: TMDBMovieDetails): string {
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

export function getStageFromTmdbStatus(status: string | null): string {
    if (!status) return 'COMPLETA';
    return TMDB_STATUS_TO_STAGE[status] || 'COMPLETA';
}

/**
 * Filtra nombres de personajes que están en inglés o son genéricos
 */
export function filterCharacterName(character: string | null): string | null {
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

    if (invalidCharacters.includes(lowerChar)) {
        return null;
    }

    if (lowerChar.startsWith('self -') || lowerChar.startsWith('self (')) {
        return null;
    }

    return character;
}

// ============================================================================
// FUNCIONES DE POSTER
// ============================================================================

/**
 * Sube el poster de TMDB a Cloudinary y actualiza la película
 */
export async function uploadPosterToCloudinary(
    movieId: number,
    posterPath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const tmdbPosterUrl = `${TMDB_IMAGE_BASE_URL}${posterPath}`;

        const result = await cloudinary.uploader.upload(tmdbPosterUrl, {
            folder: `cinenacional/posters/${movieId}`,
            public_id: 'poster',
            overwrite: true,
            resource_type: 'image',
            timeout: 120000,
            transformation: [
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
            ]
        });

        // Actualizar la película con la URL del poster
        const pool = getPool();
        await pool.query(
            'UPDATE movies SET poster_url = $1, poster_public_id = $2, updated_at = NOW() WHERE id = $3',
            [result.secure_url, result.public_id, movieId]
        );

        return { success: true, url: result.secure_url };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Sube el retrato de una persona desde TMDB a Cloudinary
 * Usa proporción 3:4 con detección de cara para centrar el crop
 */
export async function uploadPortraitToCloudinary(
    personId: number,
    profilePath: string
): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
    try {
        const tmdbProfileUrl = `${TMDB_IMAGE_BASE_URL}${profilePath}`;

        const result = await cloudinary.uploader.upload(tmdbProfileUrl, {
            folder: `cinenacional/people/${personId}`,
            public_id: 'portrait',
            overwrite: true,
            resource_type: 'image',
            timeout: 120000,
            transformation: [
                { aspect_ratio: '3:4', gravity: 'face', crop: 'fill' },
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
            ]
        });

        // Actualizar la persona con la URL del retrato
        const pool = getPool();
        await pool.query(
            'UPDATE people SET photo_url = $1, photo_public_id = $2, updated_at = NOW() WHERE id = $3',
            [result.secure_url, result.public_id, personId]
        );

        return { success: true, url: result.secure_url, publicId: result.public_id };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// ============================================================================
// FUNCIONES DE CREACIÓN
// ============================================================================

export async function createPerson(
    tmdbId: number,
    name: string,
    knownForDepartment: string,
    movieTitle: string,
    role: string
): Promise<number> {
    const pool = getPool();

    const splitResult = await splitNameAndGetGender(name);
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

    const personId = result.rows[0].id;

    // Intentar migrar retrato desde TMDB
    try {
        const tmdbDetails = await getPersonDetails(tmdbId);
        if (tmdbDetails.profile_path) {
            const portraitResult = await uploadPortraitToCloudinary(personId, tmdbDetails.profile_path);
            if (portraitResult.success) {
                console.log(`     ✓ Retrato migrado: ${portraitResult.url}`);
            } else {
                console.log(`     ⚠️ Error migrando retrato: ${portraitResult.error}`);
            }
        }
    } catch (error) {
        // No fallar si no se puede migrar el retrato, solo loguear
        console.log(`     ⚠️ Error obteniendo retrato de TMDB: ${error instanceof Error ? error.message : String(error)}`);
    }

    return personId;
}

export async function createMovie(
    movie: TMDBMovieDetails,
    title: string,
    synopsis: string,
    hasCoproduction: boolean
): Promise<number> {
    const pool = getPool();

    const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
    const stage = getStageFromTmdbStatus(movie.status);

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
            $7, 'BASIC_PRESS_KIT',
            'Sonora', 1, $8,
            $9,
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
        stage,
        tipoDuracion,
        hasCoproduction,
    ]);

    return result.rows[0].id;
}

export async function addMovieGenres(movieId: number, tmdbGenres: Array<{ id: number }>): Promise<void> {
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

export async function addMovieCountries(movieId: number, countries: Array<{ iso_3166_1: string }>): Promise<void> {
    const pool = getPool();

    // Solo agregar países que NO sean Argentina
    const coProducers = countries.filter(c => c.iso_3166_1 !== 'AR');

    for (const country of coProducers) {
        const countryName = ISO_TO_COUNTRY_NAME[country.iso_3166_1];

        if (countryName) {
            const countryId = await getCountryIdByName(countryName);

            if (countryId) {
                await pool.query(`
                    INSERT INTO movie_countries (movie_id, country_id, is_primary)
                    VALUES ($1, $2, false)
                    ON CONFLICT DO NOTHING
                `, [movieId, countryId]);
            } else {
                console.log(`     ⚠ País no encontrado en locations: ${countryName} (${country.iso_3166_1})`);
            }
        } else {
            console.log(`     ⚠ Código ISO no mapeado: ${country.iso_3166_1}`);
        }
    }
}

export async function addMovieCast(
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
                    await updatePersonTmdbId(personId, member.id);
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

export async function addMovieCrew(
    movieId: number,
    crew: TMDBCrewMember[],
    movieYear: number,
    movieTitle: string,
    stats: { created: number }
): Promise<number> {
    const pool = getPool();
    let imported = 0;

    // Jobs que mapean a un solo role
    const singleRoleJobs = Object.keys(JOB_TO_ROLE_ID);
    // Jobs que mapean a múltiples roles
    const multiRoleJobs = Object.keys(JOB_TO_MULTIPLE_ROLES);
    // Todos los jobs importables
    const allImportableJobs = [...singleRoleJobs, ...multiRoleJobs];

    const relevantCrew = crew.filter(c => allImportableJobs.includes(c.job));
    const uniqueCrew = new Map<string, TMDBCrewMember>();

    for (const member of relevantCrew) {
        const key = `${member.id}-${member.job}`;
        if (!uniqueCrew.has(key)) {
            uniqueCrew.set(key, member);
        }
    }

    // Registrar jobs no mapeados para el reporte
    const unmappedJobs = crew.filter(c => !allImportableJobs.includes(c.job));
    const uniqueUnmappedJobs = new Map<string, TMDBCrewMember>();
    for (const member of unmappedJobs) {
        const key = `${member.id}-${member.job}`;
        if (!uniqueUnmappedJobs.has(key)) {
            uniqueUnmappedJobs.set(key, member);
        }
    }

    // Agregar los no mapeados al reporte de revisión
    for (const member of Array.from(uniqueUnmappedJobs.values())) {
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

    for (const member of Array.from(uniqueCrew.values())) {
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
                    await updatePersonTmdbId(personId, member.id);
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

        // Determinar si es un job de un solo role o múltiples
        if (JOB_TO_ROLE_ID[member.job]) {
            const roleId = JOB_TO_ROLE_ID[member.job];
            await pool.query(`
                INSERT INTO movie_crew (movie_id, person_id, role_id, billing_order, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, [movieId, personId, roleId, null]);
            imported++;
        } else if (JOB_TO_MULTIPLE_ROLES[member.job]) {
            const roleIds = JOB_TO_MULTIPLE_ROLES[member.job];
            for (const roleId of roleIds) {
                await pool.query(`
                    INSERT INTO movie_crew (movie_id, person_id, role_id, billing_order, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                `, [movieId, personId, roleId, null]);
                imported++;
            }
        }
    }

    return imported;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE IMPORTACIÓN
// ============================================================================

export async function importMovie(
    movie: TMDBMovieDetails,
    options: { skipSynopsisRewrite?: boolean } = {}
): Promise<ImportResult> {
    const result: ImportResult = {
        tmdb_id: movie.id,
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
        const title = getSpanishTitle(movie);
        const originalSynopsis = getSpanishOverview(movie);
        const isDocumental = movie.genres.some(g => g.id === 99);
        const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();

        result.title = title;

        // Reescribir sinopsis con Claude (opcional)
        let synopsis = originalSynopsis;
        if (!options.skipSynopsisRewrite && originalSynopsis) {
            console.log(`  ✍️  Reescribiendo sinopsis con Claude...`);
            synopsis = await rewriteSynopsis(originalSynopsis, isDocumental);
        }

        console.log(`  📋 Título: ${title}`);
        console.log(`  📅 Año: ${year}`);
        console.log(`  ⏱️  Duración: ${movie.runtime || 'N/A'} min`);
        console.log(`  🎭 Géneros: ${movie.genres.map(g => g.name).join(', ')}`);
        console.log(`  🌍 Países: ${movie.production_countries.map(c => c.iso_3166_1).join(', ')}`);
        console.log(`  📊 Estado TMDB: ${movie.status} → Stage: ${getStageFromTmdbStatus(movie.status)}`);

        // Detectar coproducción
        const hasCoproduction = movie.production_countries.some(c => c.iso_3166_1 !== 'AR');

        console.log(`\n  💾 Creando película...`);
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

        // Subir poster a Cloudinary si existe
        if (movie.poster_path) {
            console.log(`  🖼️  Subiendo poster a Cloudinary...`);
            const posterResult = await uploadPosterToCloudinary(movieId, movie.poster_path);
            if (posterResult.success) {
                console.log(`  ✓ Poster subido: ${posterResult.url}`);
            } else {
                console.log(`  ⚠️ Error subiendo poster: ${posterResult.error}`);
            }
        } else {
            console.log(`  - Sin poster en TMDB`);
        }

        result.status = 'success';
        result.message = `Importada exitosamente`;

    } catch (error) {
        result.status = 'error';
        result.message = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
}
