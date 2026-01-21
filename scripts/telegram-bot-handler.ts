/**
 * Telegram Bot Handler
 * 
 * Servicio que hace polling a Telegram para recibir las respuestas de los botones
 * y procesar las acciones correspondientes (asignar tmdb_id o importar películas).
 * 
 * Uso:
 *   npx tsx scripts/telegram-bot-handler.ts          # Ejecutar en modo continuo
 *   npx tsx scripts/telegram-bot-handler.ts --once   # Ejecutar una sola vez
 */

import { Pool } from 'pg';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const config = {
    tmdbAccessToken: process.env.TMDB_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWU4NjYxYmU4NDc4YzQ2ODljOWZmYTVmMTAzOGY4ZiIsIm5iZiI6MTU3NDIxMjg5NC41MzMsInN1YiI6IjVkZDQ5NTFlMzU2YTcxNTg3NWViM2RmNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.nhpEuKh4uyr4Mp0avMqNmGuwPC2cj0byvHJaAsGIdkE',
    tmdbBaseUrl: 'https://api.themoviedb.org/3',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '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',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://cinenacional:Paganitzu@localhost:5432/cinenacional',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7690309153:AAEa3LZ1o-f5NayeOHwtjyuQ1BfY6LRj6s0',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '1414789486',
    
    pollingInterval: 5000,  // 5 segundos entre polls
    
    // Mapeo de géneros TMDB -> CineNacional
    genreMap: {
        28: 32, 12: 30, 16: 18, 35: 17, 80: 21, 99: 15, 18: 16,
        10751: 29, 14: 26, 36: 28, 27: 19, 10402: 25, 9648: 22,
        10749: 23, 878: 27, 53: 24, 10752: 36, 37: 33,
    } as Record<number, number>,
    
    // Mapeo de jobs TMDB -> role_id
    jobToRoleId: {
        'Director': 2,
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
    } as Record<string, number>,
    
    // Mapeo de países
    isoToCountryName: {
        'AR': 'Argentina', 'UY': 'Uruguay', 'BR': 'Brasil', 'CL': 'Chile',
        'MX': 'México', 'ES': 'España', 'US': 'Estados Unidos', 'FR': 'Francia',
        'IT': 'Italia', 'DE': 'Alemania', 'GB': 'Reino Unido', 'CO': 'Colombia',
        'PE': 'Perú', 'VE': 'Venezuela', 'BO': 'Bolivia', 'PY': 'Paraguay',
    } as Record<string, string>,
    
    // Mapeo de status TMDB -> stage CineNacional
    tmdbStatusToStage: {
        'Released': 'COMPLETA',
        'Post Production': 'EN_POSTPRODUCCION',
        'In Production': 'EN_RODAJE',
        'Planned': 'EN_DESARROLLO',
        'Canceled': 'INCONCLUSA',
        'Rumored': 'EN_DESARROLLO',
    } as Record<string, string>,
};

// ============================================================================
// TIPOS
// ============================================================================

interface TelegramUpdate {
    update_id: number;
    callback_query?: {
        id: string;
        from: { id: number };
        message?: {
            message_id: number;
            chat: { id: number };
        };
        data?: string;
    };
}

interface PendingMovie {
    id: number;
    tmdb_id: number;
    tmdb_title: string;
    tmdb_original_title: string | null;
    tmdb_year: number | null;
    tmdb_overview: string | null;
    tmdb_runtime: number | null;
    tmdb_director_name: string | null;
    tmdb_director_id: number | null;
    local_movie_id: number | null;
    local_movie_title: string | null;
    local_movie_year: number | null;
    action_type: string;
    match_score: number | null;
    telegram_message_id: number | null;
}

interface TMDBMovieDetails {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    release_date: string;
    runtime: number | null;
    status: string;
    genres: Array<{ id: number; name: string }>;
    production_countries: Array<{ iso_3166_1: string; name: string }>;
    credits: {
        cast: Array<{
            id: number;
            name: string;
            character: string;
            order: number;
            known_for_department: string;
        }>;
        crew: Array<{
            id: number;
            name: string;
            job: string;
            department: string;
            known_for_department: string;
        }>;
    };
    translations: {
        translations: Array<{
            iso_3166_1: string;
            iso_639_1: string;
            data: { title: string; overview: string };
        }>;
    };
}

// ============================================================================
// POOL DE CONEXIÓN
// ============================================================================

let pool: Pool | null = null;
let lastUpdateId = 0;

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
// CACHE DE NOMBRES PARA GÉNERO
// ============================================================================

let firstNameGenderCache: Map<string, 'MALE' | 'FEMALE'> | null = null;

async function loadFirstNameGenderCache(): Promise<void> {
    if (firstNameGenderCache !== null) return;
    
    const pool = getPool();
    const result = await pool.query('SELECT name, gender FROM first_name_genders');
    
    firstNameGenderCache = new Map();
    for (const row of result.rows) {
        firstNameGenderCache.set(row.name.toLowerCase(), row.gender);
    }
    console.log(`📚 Cache de nombres cargado: ${firstNameGenderCache.size} entradas`);
}

function lookupGender(name: string): 'MALE' | 'FEMALE' | null {
    if (!firstNameGenderCache) return null;
    return firstNameGenderCache.get(name.toLowerCase().replace(/["'"«»""]/g, '').trim()) || null;
}

// ============================================================================
// FUNCIONES DE TELEGRAM
// ============================================================================

async function getUpdates(): Promise<TelegramUpdate[]> {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
        );
        
        if (!response.ok) {
            console.log(`⚠️ Error en getUpdates: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        return data.result || [];
    } catch (error) {
        console.log(`⚠️ Error en getUpdates: ${error}`);
        return [];
    }
}

async function answerCallbackQuery(callbackId: string, text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/answerCallbackQuery`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    callback_query_id: callbackId,
                    text,
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en answerCallbackQuery: ${error}`);
    }
}

async function editMessageText(chatId: number, messageId: number, text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/editMessageText`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text,
                    parse_mode: 'HTML',
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en editMessageText: ${error}`);
    }
}

async function sendMessage(text: string): Promise<void> {
    try {
        await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegramChatId,
                    text,
                    parse_mode: 'HTML',
                }),
            }
        );
    } catch (error) {
        console.log(`⚠️ Error en sendMessage: ${error}`);
    }
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

async function getPendingMovie(tmdbId: number): Promise<PendingMovie | null> {
    const pool = getPool();
    const result = await pool.query(
        "SELECT * FROM tmdb_pending_movies WHERE tmdb_id = $1 AND status = 'pending'",
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function updatePendingStatus(tmdbId: number, status: string): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE tmdb_pending_movies SET status = $1, processed_at = NOW() WHERE tmdb_id = $2',
        [status, tmdbId]
    );
}

async function assignTmdbIdToMovie(localMovieId: number, tmdbId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE movies SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
        [tmdbId, localMovieId]
    );
}

// ============================================================================
// FUNCIONES DE TMDB
// ============================================================================

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${config.tmdbBaseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${config.tmdbAccessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
    }

    return response.json();
}

async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    return fetchTMDB<TMDBMovieDetails>(`/movie/${tmdbId}`, {
        append_to_response: 'credits,translations',
        language: 'es-ES',
    });
}

// ============================================================================
// FUNCIONES DE IMPORTACIÓN
// ============================================================================

function getSpanishTitle(movie: TMDBMovieDetails): string {
    const es = movie.translations.translations.find(t => t.iso_639_1 === 'es');
    return es?.data?.title || movie.title;
}

function getSpanishOverview(movie: TMDBMovieDetails): string {
    const es = movie.translations.translations.find(t => t.iso_639_1 === 'es');
    return es?.data?.overview || movie.overview || '';
}

/**
 * Mapea el status de TMDB al stage de CineNacional
 */
function getStageFromTmdbStatus(status: string | null): string {
    if (!status) return 'COMPLETA';
    return config.tmdbStatusToStage[status] || 'COMPLETA';
}

async function askClaude(prompt: string): Promise<string> {
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
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function rewriteSynopsis(originalSynopsis: string, isDocumental: boolean): Promise<string> {
    if (!originalSynopsis?.trim()) return '';

    const prompt = `Convertí el siguiente texto en una sinopsis cinematográfica que cumpla con estos criterios:

Extensión: entre 400 y 500 caracteres (incluyendo espacios)

Contenido:
- Describí únicamente la premisa y situación inicial
- Presentá los personajes principales y el conflicto central
- Sin spoilers: no reveles giros argumentales, desenlaces ni información del último tercio de la película
${isDocumental ? '- Es un documental: comenzá con la estructura "Documental que..." e integrá esa palabra al texto' : ''}

Estilo:
- Tono neutral y objetivo, sin juicios de valor
- Sin lenguaje promocional ni adjetivos laudatorios
- Redacción clara y directa
- Tercera persona, tiempo presente
- Español rioplatense (con voseo) pero sin lunfardo ni jerga

Restricciones:
- NO incluyas título, director, actores, países ni datos técnicos
- NO uses metadiscurso como "La película narra...", "El film cuenta..."
- Comenzá directamente con la acción o situación

Texto original:
${originalSynopsis}

Responde SOLO con la sinopsis reescrita, sin explicaciones.`;

    try {
        return (await askClaude(prompt)).trim();
    } catch (error) {
        console.log(`⚠️ Error reescribiendo sinopsis: ${error}`);
        return originalSynopsis;
    }
}

function splitNameAndGetGender(fullName: string): { firstName: string; lastName: string; gender: 'MALE' | 'FEMALE' | null } {
    const tokens = fullName.trim().split(/\s+/);
    
    if (tokens.length === 0) {
        return { firstName: '', lastName: '', gender: null };
    }
    
    if (tokens.length === 1) {
        return { firstName: tokens[0], lastName: '', gender: lookupGender(tokens[0]) };
    }
    
    // Buscar progresivamente cuántos tokens forman el nombre
    let firstNameWordCount = 0;
    let detectedGender: 'MALE' | 'FEMALE' | null = null;
    
    for (let i = 0; i < tokens.length; i++) {
        const gender = lookupGender(tokens[i]);
        if (gender !== null) {
            firstNameWordCount = i + 1;
            if (detectedGender === null) detectedGender = gender;
        } else {
            break;
        }
    }
    
    if (firstNameWordCount === 0) {
        return { firstName: tokens[0], lastName: tokens.slice(1).join(' '), gender: null };
    }
    
    return {
        firstName: tokens.slice(0, firstNameWordCount).join(' '),
        lastName: tokens.slice(firstNameWordCount).join(' '),
        gender: detectedGender,
    };
}

async function findOrCreatePerson(
    tmdbId: number,
    name: string,
    knownForDepartment: string
): Promise<number> {
    const pool = getPool();
    
    // Buscar por tmdb_id
    let result = await pool.query('SELECT id FROM people WHERE tmdb_id = $1', [tmdbId]);
    if (result.rows.length > 0) return result.rows[0].id;
    
    // Buscar por nombre
    result = await pool.query(
        `SELECT id FROM people WHERE LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) = LOWER($1)`,
        [name]
    );
    if (result.rows.length > 0) {
        // Actualizar tmdb_id
        await pool.query('UPDATE people SET tmdb_id = $1 WHERE id = $2', [tmdbId, result.rows[0].id]);
        return result.rows[0].id;
    }
    
    // Crear nueva persona
    const { firstName, lastName, gender } = splitNameAndGetGender(name);
    
    const baseSlug = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const existing = await pool.query('SELECT id FROM people WHERE slug = $1', [slug]);
        if (existing.rows.length === 0) break;
        slug = `${baseSlug}-${counter++}`;
    }
    
    result = await pool.query(`
        INSERT INTO people (first_name, last_name, slug, tmdb_id, gender, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING id
    `, [firstName, lastName, slug, tmdbId, gender]);
    
    return result.rows[0].id;
}

async function importMovie(tmdbId: number): Promise<{ success: boolean; movieId?: number; error?: string }> {
    try {
        const pool = getPool();
        
        // Verificar que no exista
        const existing = await pool.query('SELECT id FROM movies WHERE tmdb_id = $1', [tmdbId]);
        if (existing.rows.length > 0) {
            return { success: false, error: 'La película ya existe en la base de datos' };
        }
        
        console.log(`📥 Importando película TMDB ID ${tmdbId}...`);
        
        // Obtener detalles de TMDB
        const movie = await getMovieDetails(tmdbId);
        const title = getSpanishTitle(movie);
        const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
        const isDocumental = movie.genres.some(g => g.id === 99);
        
        // Mapear status de TMDB a stage de CineNacional
        const stage = getStageFromTmdbStatus(movie.status);
        console.log(`   Estado TMDB: ${movie.status} → Stage: ${stage}`);
        
        // Reescribir sinopsis con Claude
        const rawSynopsis = getSpanishOverview(movie);
        const synopsis = await rewriteSynopsis(rawSynopsis, isDocumental);
        
        // Detectar coproducción
        const hasCoproduction = movie.production_countries.length > 1;
        
        // Calcular tipo de duración
        let tipoDuracion = 'largometraje';
        if (movie.runtime) {
            if (movie.runtime < 30) tipoDuracion = 'cortometraje';
            else if (movie.runtime <= 59) tipoDuracion = 'mediometraje';
        }
        
        // Generar slug
        const baseSlug = title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        let slug = year ? `${baseSlug}-${year}` : baseSlug;
        let counter = 1;
        while (true) {
            const existingSlug = await pool.query('SELECT id FROM movies WHERE slug = $1', [slug]);
            if (existingSlug.rows.length === 0) break;
            slug = `${baseSlug}-${year}-${counter++}`;
        }
        
        // Insertar película con stage mapeado desde status de TMDB
        const movieResult = await pool.query(`
            INSERT INTO movies (
                title, slug, year, duration, synopsis, tmdb_id,
                stage, data_completeness, sound_type, color_type_id, tipo_duracion,
                is_coproduction, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'BASIC_PRESS_KIT', 'Sonora', 1, $8, $9, NOW(), NOW())
            RETURNING id
        `, [title, slug, year, movie.runtime, synopsis, tmdbId, stage, tipoDuracion, hasCoproduction]);
        
        const movieId = movieResult.rows[0].id;
        console.log(`   ✅ Película creada con ID ${movieId}`);
        
        // Agregar géneros
        for (let i = 0; i < movie.genres.length; i++) {
            const localGenreId = config.genreMap[movie.genres[i].id];
            if (localGenreId) {
                await pool.query(
                    'INSERT INTO movie_genres (movie_id, genre_id, is_primary) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                    [movieId, localGenreId, i === 0]
                );
            }
        }
        
        // Agregar países coproductores (no Argentina)
        for (const country of movie.production_countries) {
            if (country.iso_3166_1 !== 'AR') {
                const countryName = config.isoToCountryName[country.iso_3166_1];
                if (countryName) {
                    const countryResult = await pool.query(
                        'SELECT id FROM locations WHERE name = $1 LIMIT 1',
                        [countryName]
                    );
                    if (countryResult.rows.length > 0) {
                        await pool.query(
                            'INSERT INTO movie_countries (movie_id, country_id, is_primary) VALUES ($1, $2, false) ON CONFLICT DO NOTHING',
                            [movieId, countryResult.rows[0].id]
                        );
                    }
                }
            }
        }
        
        // Agregar cast (primeros 20)
        const mainCast = movie.credits.cast.slice(0, 20);
        for (const member of mainCast) {
            const personId = await findOrCreatePerson(member.id, member.name, member.known_for_department);
            
            // Filtrar nombres de personaje inválidos
            let character = member.character;
            const invalidChars = ['self', 'himself', 'herself', 'narrator', 'voice', 'archive footage'];
            if (character && invalidChars.some(inv => character.toLowerCase().includes(inv))) {
                character = '';
            }
            
            await pool.query(`
                INSERT INTO movie_cast (movie_id, person_id, character_name, billing_order, is_principal, is_actor)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [movieId, personId, character || null, member.order, member.order < 5, !isDocumental]);
        }
        console.log(`   👥 Cast importado: ${mainCast.length} personas`);
        
        // Agregar crew
        const importantJobs = Object.keys(config.jobToRoleId);
        const relevantCrew = movie.credits.crew.filter(c => importantJobs.includes(c.job));
        const uniqueCrew = new Map<string, typeof relevantCrew[0]>();
        for (const member of relevantCrew) {
            const key = `${member.id}-${member.job}`;
            if (!uniqueCrew.has(key)) uniqueCrew.set(key, member);
        }
        
        for (const [, member] of uniqueCrew) {
            const personId = await findOrCreatePerson(member.id, member.name, member.known_for_department);
            const roleId = config.jobToRoleId[member.job];
            
            await pool.query(`
                INSERT INTO movie_crew (movie_id, person_id, role_id, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, [movieId, personId, roleId]);
        }
        console.log(`   🎬 Crew importado: ${uniqueCrew.size} personas`);
        
        return { success: true, movieId };
        
    } catch (error) {
        console.error(`❌ Error importando película:`, error);
        return { success: false, error: String(error) };
    }
}

// ============================================================================
// HANDLERS DE ACCIONES
// ============================================================================

async function handleConfirmMatch(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }
    
    if (!pending.local_movie_id) {
        await editMessageText(chatId, messageId, '❌ No hay película local asociada para hacer match');
        return;
    }
    
    await assignTmdbIdToMovie(pending.local_movie_id, tmdbId);
    await updatePendingStatus(tmdbId, 'confirmed');
    
    await editMessageText(chatId, messageId, 
        `✅ <b>Match confirmado</b>\n\n` +
        `Se asignó TMDB ID ${tmdbId} a:\n` +
        `<b>${pending.local_movie_title}</b> (${pending.local_movie_year || 'sin año'})`
    );
    
    console.log(`✅ Match confirmado: TMDB ${tmdbId} -> Local ${pending.local_movie_id}`);
}

async function handleRejectMatch(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }
    
    // Cambiar a "no_match" para que pueda decidir si importar
    const pool = getPool();
    await pool.query(
        "UPDATE tmdb_pending_movies SET action_type = 'no_match', local_movie_id = NULL WHERE tmdb_id = $1",
        [tmdbId]
    );
    
    // Enviar nuevo mensaje preguntando si importar
    await editMessageText(chatId, messageId,
        `❌ <b>Match rechazado</b>\n\n` +
        `<b>${pending.tmdb_title}</b> (${pending.tmdb_year || 'sin año'})\n\n` +
        `¿Querés importar esta película como nueva?`
    );
    
    // Enviar botones de importar
    await fetch(
        `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `📥 <b>¿Importar "${pending.tmdb_title}"?</b>`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Importar película', callback_data: `import_new:${tmdbId}` }],
                        [{ text: '❌ No importar', callback_data: `reject_import:${tmdbId}` }],
                    ],
                },
            }),
        }
    );
    
    console.log(`❌ Match rechazado para TMDB ${tmdbId}`);
}

async function handleImportNew(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }
    
    await editMessageText(chatId, messageId, 
        `⏳ <b>Importando...</b>\n\n` +
        `${pending.tmdb_title} (${pending.tmdb_year || 'sin año'})`
    );
    
    const result = await importMovie(tmdbId);
    
    if (result.success) {
        await updatePendingStatus(tmdbId, 'imported');
        await editMessageText(chatId, messageId,
            `✅ <b>Película importada</b>\n\n` +
            `<b>${pending.tmdb_title}</b> (${pending.tmdb_year || 'sin año'})\n\n` +
            `ID en CineNacional: ${result.movieId}\n` +
            `🔗 <a href="https://cinenacional.com/admin/movies?id=${result.movieId}">Ver en admin</a>`
        );
        console.log(`✅ Película importada: TMDB ${tmdbId} -> Local ${result.movieId}`);
    } else {
        await editMessageText(chatId, messageId,
            `❌ <b>Error al importar</b>\n\n` +
            `${pending.tmdb_title}\n\n` +
            `Error: ${result.error}`
        );
        console.log(`❌ Error importando TMDB ${tmdbId}: ${result.error}`);
    }
}

async function handleRejectImport(tmdbId: number, chatId: number, messageId: number): Promise<void> {
    const pending = await getPendingMovie(tmdbId);
    if (!pending) {
        await editMessageText(chatId, messageId, '❌ Película no encontrada en pendientes');
        return;
    }
    
    await updatePendingStatus(tmdbId, 'rejected');
    
    await editMessageText(chatId, messageId,
        `🚫 <b>Importación descartada</b>\n\n` +
        `${pending.tmdb_title} (${pending.tmdb_year || 'sin año'})`
    );
    
    console.log(`🚫 Importación rechazada para TMDB ${tmdbId}`);
}

// ============================================================================
// PROCESAMIENTO DE CALLBACKS
// ============================================================================

async function processCallback(update: TelegramUpdate): Promise<void> {
    const callback = update.callback_query;
    if (!callback?.data || !callback.message) return;
    
    const [action, tmdbIdStr] = callback.data.split(':');
    const tmdbId = parseInt(tmdbIdStr);
    
    if (isNaN(tmdbId)) {
        await answerCallbackQuery(callback.id, '❌ ID inválido');
        return;
    }
    
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    
    console.log(`\n📩 Callback recibido: ${action} para TMDB ${tmdbId}`);
    
    await answerCallbackQuery(callback.id, '⏳ Procesando...');
    
    switch (action) {
        case 'confirm_match':
            await handleConfirmMatch(tmdbId, chatId, messageId);
            break;
        case 'reject_match':
            await handleRejectMatch(tmdbId, chatId, messageId);
            break;
        case 'import_new':
            await handleImportNew(tmdbId, chatId, messageId);
            break;
        case 'reject_import':
            await handleRejectImport(tmdbId, chatId, messageId);
            break;
        default:
            console.log(`⚠️ Acción desconocida: ${action}`);
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

async function main(): Promise<void> {
    console.log('🤖 Telegram Bot Handler v1.1');
    console.log('============================\n');
    
    const args = process.argv.slice(2);
    const runOnce = args.includes('--once');
    
    // Cargar cache de nombres
    await loadFirstNameGenderCache();
    
    if (runOnce) {
        console.log('🔄 Ejecutando una sola vez...\n');
    } else {
        console.log('🔄 Iniciando polling continuo...\n');
        console.log(`   Intervalo: ${config.pollingInterval}ms`);
        console.log('   Presiona Ctrl+C para detener\n');
    }
    
    const poll = async () => {
        try {
            const updates = await getUpdates();
            
            for (const update of updates) {
                lastUpdateId = Math.max(lastUpdateId, update.update_id);
                
                if (update.callback_query) {
                    await processCallback(update);
                }
            }
        } catch (error) {
            console.log(`⚠️ Error en polling: ${error}`);
        }
    };
    
    if (runOnce) {
        await poll();
    } else {
        // Polling continuo
        while (true) {
            await poll();
            await new Promise(resolve => setTimeout(resolve, config.pollingInterval));
        }
    }
    
    await closePool();
    console.log('\n✨ Bot detenido\n');
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Recibido SIGINT, cerrando...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Recibido SIGTERM, cerrando...');
    await closePool();
    process.exit(0);
});

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});