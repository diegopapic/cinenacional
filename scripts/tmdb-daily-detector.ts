/**
 * TMDB Daily Detector v2.0
 * 
 * Script que detecta películas argentinas nuevas en TMDB basándose en IDs.
 * Guarda el último ID procesado para retomar en la próxima ejecución.
 * 
 * Uso:
 *   npx tsx scripts/tmdb-daily-detector.ts                    # Ejecutar desde último ID guardado
 *   npx tsx scripts/tmdb-daily-detector.ts --from-id 1619544  # Empezar desde ID específico
 *   npx tsx scripts/tmdb-daily-detector.ts --dry-run          # Solo mostrar, no guardar
 *   npx tsx scripts/tmdb-daily-detector.ts --limit 1000       # Procesar máximo 1000 IDs
 */

import { Pool } from 'pg';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const config = {
    tmdbAccessToken: process.env.TMDB_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWU4NjYxYmU4NDc4YzQ2ODljOWZmYTVmMTAzOGY4ZiIsIm5iZiI6MTU3NDIxMjg5NC41MzMsInN1YiI6IjVkZDQ5NTFlMzU2YTcxNTg3NWViM2RmNyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.nhpEuKh4uyr4Mp0avMqNmGuwPC2cj0byvHJaAsGIdkE',
    tmdbBaseUrl: 'https://api.themoviedb.org/3',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://cinenacional:Paganitzu@localhost:5432/cinenacional',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7690309153:AAEa3LZ1o-f5NayeOHwtjyuQ1BfY6LRj6s0',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '1414789486',
    
    // Configuración de búsqueda por ID
    delayBetweenRequests: 30,   // ms entre requests a TMDB (más rápido porque muchos serán 404)
    defaultLimit: 5000,         // Máximo de IDs a procesar por ejecución
    
    // Umbrales de matching
    matching: {
        exactMatchThreshold: 90,   // Score >= 90: match exacto, asignar automáticamente
        fuzzyMatchThreshold: 60,   // Score 60-89: match dudoso, preguntar
        yearTolerance: 1,          // ±1 año de tolerancia
    },
    
    // Rol de director
    directorRoleId: 2,
};

// ============================================================================
// TIPOS
// ============================================================================

interface TMDBMovie {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    release_date: string;
    runtime: number | null;
    genre_ids?: number[];
    adult: boolean;
}

interface TMDBMovieDetails extends TMDBMovie {
    credits: {
        crew: Array<{
            id: number;
            name: string;
            job: string;
            department: string;
        }>;
    };
    production_countries: Array<{
        iso_3166_1: string;
        name: string;
    }>;
}

interface LocalMovie {
    id: number;
    title: string;
    year: number | null;
    tmdb_id: number | null;
    director_name: string | null;
    director_tmdb_id: number | null;
}

interface PendingMovie {
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
    local_director_name: string | null;
    action_type: 'match_exact' | 'match_fuzzy' | 'no_match';
    match_score: number | null;
}

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
// FUNCIONES DE ESTADO (ÚLTIMO ID PROCESADO)
// ============================================================================

/**
 * Crea la tabla de estado si no existe
 */
async function ensureSyncStateTable(): Promise<void> {
    const pool = getPool();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tmdb_sync_state (
            id SERIAL PRIMARY KEY,
            key VARCHAR(50) UNIQUE NOT NULL,
            value_int BIGINT,
            value_text TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
}

/**
 * Obtiene el último ID procesado de la BD
 */
async function getLastProcessedId(): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query(
        "SELECT value_int FROM tmdb_sync_state WHERE key = 'last_processed_tmdb_id'"
    );
    return result.rows.length > 0 ? Number(result.rows[0].value_int) : null;
}

/**
 * Guarda el último ID procesado en la BD
 */
async function saveLastProcessedId(id: number): Promise<void> {
    const pool = getPool();
    await pool.query(`
        INSERT INTO tmdb_sync_state (key, value_int, updated_at)
        VALUES ('last_processed_tmdb_id', $1, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value_int = EXCLUDED.value_int,
            updated_at = NOW()
    `, [id]);
}

// ============================================================================
// FUNCIONES DE API TMDB
// ============================================================================

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Obtiene el último ID de película en TMDB
 */
async function getLatestTMDBId(): Promise<number> {
    const response = await fetchTMDB<{ id: number }>('/movie/latest');
    return response.id;
}

/**
 * Obtiene detalles de una película de TMDB
 * Retorna null si no existe (404)
 */
async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
    try {
        return await fetchTMDB<TMDBMovieDetails>(`/movie/${tmdbId}`, {
            append_to_response: 'credits',
            language: 'es-ES',
        });
    } catch (error: any) {
        // Los 404 son esperados (IDs que no existen), no logueamos
        if (error.message?.includes('404')) {
            return null;
        }
        // Otros errores sí los logueamos
        console.log(`   ⚠️ Error obteniendo TMDB ID ${tmdbId}: ${error.message}`);
        return null;
    }
}

/**
 * Verifica si una película es argentina
 */
function isArgentineMovie(movie: TMDBMovieDetails): boolean {
    return movie.production_countries?.some(c => c.iso_3166_1 === 'AR') || false;
}

/**
 * Obtiene el director de una película
 */
function getDirector(movie: TMDBMovieDetails): { name: string; id: number } | null {
    const director = movie.credits?.crew?.find(c => c.job === 'Director');
    return director ? { name: director.name, id: director.id } : null;
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS LOCAL
// ============================================================================

/**
 * Verifica si ya tenemos una película por tmdb_id
 */
async function movieExistsByTmdbId(tmdbId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
        'SELECT id FROM movies WHERE tmdb_id = $1',
        [tmdbId]
    );
    return result.rows.length > 0;
}

/**
 * Verifica si ya tenemos esta película en pending
 */
async function isPendingMovie(tmdbId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
        "SELECT id FROM tmdb_pending_movies WHERE tmdb_id = $1 AND status = 'pending'",
        [tmdbId]
    );
    return result.rows.length > 0;
}

/**
 * Busca películas locales que podrían hacer match
 */
async function findPotentialMatches(
    title: string,
    originalTitle: string | null,
    year: number | null
): Promise<LocalMovie[]> {
    const pool = getPool();
    
    // Normalizar títulos para comparación
    const normalizedTitle = normalizeTitle(title);
    const normalizedOriginal = originalTitle ? normalizeTitle(originalTitle) : null;
    
    // Buscar por título similar y año cercano
    const yearCondition = year 
        ? `AND (m.year BETWEEN $2 AND $3 OR m.year IS NULL)`
        : '';
    
    const query = `
        SELECT 
            m.id,
            m.title,
            m.year,
            m.tmdb_id,
            CONCAT(p.first_name, ' ', p.last_name) as director_name,
            p.tmdb_id as director_tmdb_id
        FROM movies m
        LEFT JOIN movie_crew mc ON m.id = mc.movie_id AND mc.role_id = $1
        LEFT JOIN people p ON mc.person_id = p.id
        WHERE m.tmdb_id IS NULL
        ${yearCondition}
        ORDER BY m.year DESC
        LIMIT 100
    `;
    
    const params: (number | string)[] = [config.directorRoleId];
    if (year) {
        params.push(year - config.matching.yearTolerance);
        params.push(year + config.matching.yearTolerance);
    }
    
    const result = await pool.query(query, params);
    
    // Filtrar por similitud de título
    const matches: LocalMovie[] = [];
    for (const row of result.rows) {
        const localNormalized = normalizeTitle(row.title);
        const titleScore = calculateSimilarity(normalizedTitle, localNormalized);
        const originalScore = normalizedOriginal 
            ? calculateSimilarity(normalizedOriginal, localNormalized)
            : 0;
        
        const maxScore = Math.max(titleScore, originalScore);
        
        if (maxScore >= config.matching.fuzzyMatchThreshold) {
            matches.push({
                id: row.id,
                title: row.title,
                year: row.year,
                tmdb_id: row.tmdb_id,
                director_name: row.director_name,
                director_tmdb_id: row.director_tmdb_id,
            });
        }
    }
    
    return matches;
}

/**
 * Normaliza un título para comparación
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Quitar acentos
        .replace(/[^a-z0-9\s]/g, '')       // Solo alfanuméricos
        .replace(/\s+/g, ' ')              // Normalizar espacios
        .trim();
}

/**
 * Calcula la similitud entre dos strings (0-100)
 * Usa distancia de Levenshtein normalizada
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (!str1 || !str2) return 0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Matriz de distancia
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    
    return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Calcula el score de match considerando título, año y director
 */
function calculateMatchScore(
    tmdbMovie: TMDBMovieDetails,
    localMovie: LocalMovie,
    tmdbDirector: { name: string; id: number } | null
): number {
    let score = 0;
    
    // Score por título (máx 50 puntos)
    const titleSimilarity = Math.max(
        calculateSimilarity(normalizeTitle(tmdbMovie.title), normalizeTitle(localMovie.title)),
        calculateSimilarity(normalizeTitle(tmdbMovie.original_title), normalizeTitle(localMovie.title))
    );
    score += titleSimilarity * 0.5;
    
    // Score por año (máx 25 puntos)
    const tmdbYear = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null;
    if (tmdbYear && localMovie.year) {
        const yearDiff = Math.abs(tmdbYear - localMovie.year);
        if (yearDiff === 0) score += 25;
        else if (yearDiff === 1) score += 15;
        else if (yearDiff === 2) score += 5;
    }
    
    // Score por director (máx 25 puntos)
    if (tmdbDirector && localMovie.director_name) {
        // Match por tmdb_id del director
        if (localMovie.director_tmdb_id && localMovie.director_tmdb_id === tmdbDirector.id) {
            score += 25;
        } else {
            // Match por nombre del director
            const directorSimilarity = calculateSimilarity(
                normalizeTitle(tmdbDirector.name),
                normalizeTitle(localMovie.director_name)
            );
            score += directorSimilarity * 0.25;
        }
    }
    
    return Math.round(score);
}

// ============================================================================
// FUNCIONES DE TELEGRAM
// ============================================================================

async function sendTelegramMessage(
    text: string,
    buttons?: Array<Array<{ text: string; callback_data: string }>>
): Promise<number | null> {
    try {
        const body: Record<string, unknown> = {
            chat_id: config.telegramChatId,
            text,
            parse_mode: 'HTML',
        };
        
        if (buttons) {
            body.reply_markup = {
                inline_keyboard: buttons,
            };
        }
        
        const response = await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        
        if (!response.ok) {
            const error = await response.text();
            console.log(`   ⚠️ Error enviando mensaje a Telegram: ${error}`);
            return null;
        }
        
        const data = await response.json();
        return data.result?.message_id || null;
    } catch (error) {
        console.log(`   ⚠️ Error enviando mensaje a Telegram: ${error}`);
        return null;
    }
}

function formatMovieMessage(pending: PendingMovie): string {
    let message = `🎬 <b>Nueva película argentina en TMDB</b>\n\n`;
    message += `<b>Título:</b> ${pending.tmdb_title}\n`;
    
    if (pending.tmdb_original_title && pending.tmdb_original_title !== pending.tmdb_title) {
        message += `<b>Título original:</b> ${pending.tmdb_original_title}\n`;
    }
    
    if (pending.tmdb_year) {
        message += `<b>Año:</b> ${pending.tmdb_year}\n`;
    }
    
    if (pending.tmdb_director_name) {
        message += `<b>Director:</b> ${pending.tmdb_director_name}\n`;
    }
    
    if (pending.tmdb_runtime) {
        message += `<b>Duración:</b> ${pending.tmdb_runtime} min\n`;
    }
    
    message += `\n🔗 <a href="https://www.themoviedb.org/movie/${pending.tmdb_id}">Ver en TMDB</a>\n`;
    
    if (pending.action_type === 'match_fuzzy' && pending.local_movie_id) {
        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `⚠️ <b>Posible match encontrado:</b>\n\n`;
        message += `<b>En tu BD:</b> ${pending.local_movie_title}`;
        if (pending.local_movie_year) {
            message += ` (${pending.local_movie_year})`;
        }
        message += `\n`;
        if (pending.local_director_name) {
            message += `<b>Director:</b> ${pending.local_director_name}\n`;
        }
        message += `<b>Score:</b> ${pending.match_score}%\n`;
        message += `\n🔗 <a href="https://cinenacional.com/admin/movies?id=${pending.local_movie_id}">Ver en CineNacional</a>`;
    } else if (pending.action_type === 'no_match') {
        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `❓ <b>No se encontró en tu base de datos</b>`;
    }
    
    return message;
}

function getMessageButtons(pending: PendingMovie): Array<Array<{ text: string; callback_data: string }>> {
    if (pending.action_type === 'match_fuzzy') {
        return [
            [
                { text: '✅ Es match - Asignar TMDB ID', callback_data: `confirm_match:${pending.tmdb_id}` },
            ],
            [
                { text: '❌ No es match', callback_data: `reject_match:${pending.tmdb_id}` },
            ],
            [
                { text: '📥 Importar como nueva', callback_data: `import_new:${pending.tmdb_id}` },
            ],
        ];
    } else {
        // no_match
        return [
            [
                { text: '✅ Importar película', callback_data: `import_new:${pending.tmdb_id}` },
            ],
            [
                { text: '❌ No importar', callback_data: `reject_import:${pending.tmdb_id}` },
            ],
        ];
    }
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

async function savePendingMovie(pending: PendingMovie): Promise<number> {
    const pool = getPool();
    
    const result = await pool.query(`
        INSERT INTO tmdb_pending_movies (
            tmdb_id, tmdb_title, tmdb_original_title, tmdb_year,
            tmdb_overview, tmdb_runtime, tmdb_director_name, tmdb_director_id,
            local_movie_id, local_movie_title, local_movie_year, local_director_name,
            action_type, match_score, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
        ON CONFLICT (tmdb_id) DO UPDATE SET
            tmdb_title = EXCLUDED.tmdb_title,
            local_movie_id = EXCLUDED.local_movie_id,
            match_score = EXCLUDED.match_score,
            action_type = EXCLUDED.action_type,
            status = 'pending'
        RETURNING id
    `, [
        pending.tmdb_id,
        pending.tmdb_title,
        pending.tmdb_original_title,
        pending.tmdb_year,
        pending.tmdb_overview,
        pending.tmdb_runtime,
        pending.tmdb_director_name,
        pending.tmdb_director_id,
        pending.local_movie_id,
        pending.local_movie_title,
        pending.local_movie_year,
        pending.local_director_name,
        pending.action_type,
        pending.match_score,
    ]);
    
    return result.rows[0].id;
}

async function updatePendingMessageId(pendingId: number, messageId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE tmdb_pending_movies SET telegram_message_id = $1 WHERE id = $2',
        [messageId, pendingId]
    );
}

async function assignTmdbId(localMovieId: number, tmdbId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE movies SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
        [tmdbId, localMovieId]
    );
    console.log(`   ✅ Asignado TMDB ID ${tmdbId} a película local ${localMovieId}`);
}

async function processMovie(tmdbId: number, dryRun: boolean): Promise<'skipped' | 'not_found' | 'not_argentine' | 'processed'> {
    // Verificar si ya lo tenemos con este tmdb_id
    if (await movieExistsByTmdbId(tmdbId)) {
        return 'skipped';
    }
    
    // Verificar si ya está pendiente
    if (await isPendingMovie(tmdbId)) {
        return 'skipped';
    }
    
    // Obtener detalles de TMDB
    const movie = await getMovieDetails(tmdbId);
    if (!movie) {
        return 'not_found';
    }
    
    // Filtrar películas para adultos
    if (movie.adult) {
        return 'skipped';
    }
    
    // Verificar si es argentina
    if (!isArgentineMovie(movie)) {
        return 'not_argentine';
    }
    
    const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
    const director = getDirector(movie);
    
    console.log(`\n🇦🇷 Película argentina: ${movie.title} (${year || 'sin año'}) - TMDB ID: ${tmdbId}`);
    if (director) {
        console.log(`   Director: ${director.name}`);
    }
    
    // Buscar matches potenciales
    const matches = await findPotentialMatches(movie.title, movie.original_title, year);
    
    let bestMatch: LocalMovie | null = null;
    let bestScore = 0;
    
    for (const match of matches) {
        const score = calculateMatchScore(movie, match, director);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = match;
        }
    }
    
    // Determinar tipo de acción
    let actionType: 'match_exact' | 'match_fuzzy' | 'no_match';
    
    if (bestMatch && bestScore >= config.matching.exactMatchThreshold) {
        actionType = 'match_exact';
        console.log(`   🎯 Match exacto encontrado: "${bestMatch.title}" (score: ${bestScore}%)`);
        
        if (!dryRun) {
            // Asignar TMDB ID automáticamente
            await assignTmdbId(bestMatch.id, tmdbId);
            
            // Notificar por Telegram
            await sendTelegramMessage(
                `✅ <b>Match automático</b>\n\n` +
                `<b>TMDB:</b> ${movie.title} (${year})\n` +
                `<b>Local:</b> ${bestMatch.title} (${bestMatch.year})\n` +
                `<b>Score:</b> ${bestScore}%\n\n` +
                `Se asignó TMDB ID ${tmdbId} automáticamente.`
            );
        }
    } else if (bestMatch && bestScore >= config.matching.fuzzyMatchThreshold) {
        actionType = 'match_fuzzy';
        console.log(`   ⚠️ Match dudoso encontrado: "${bestMatch.title}" (score: ${bestScore}%)`);
    } else {
        actionType = 'no_match';
        console.log(`   ❓ Sin match en base de datos local`);
    }
    
    // Si no es match exacto, guardar para confirmación
    if (actionType !== 'match_exact') {
        const pending: PendingMovie = {
            tmdb_id: tmdbId,
            tmdb_title: movie.title,
            tmdb_original_title: movie.original_title !== movie.title ? movie.original_title : null,
            tmdb_year: year,
            tmdb_overview: movie.overview || null,
            tmdb_runtime: movie.runtime,
            tmdb_director_name: director?.name || null,
            tmdb_director_id: director?.id || null,
            local_movie_id: bestMatch?.id || null,
            local_movie_title: bestMatch?.title || null,
            local_movie_year: bestMatch?.year || null,
            local_director_name: bestMatch?.director_name || null,
            action_type: actionType,
            match_score: bestMatch ? bestScore : null,
        };
        
        if (!dryRun) {
            // Guardar en BD
            const pendingId = await savePendingMovie(pending);
            
            // Enviar a Telegram
            const message = formatMovieMessage(pending);
            const buttons = getMessageButtons(pending);
            const messageId = await sendTelegramMessage(message, buttons);
            
            if (messageId) {
                await updatePendingMessageId(pendingId, messageId);
            }
        }
    }
    
    return 'processed';
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    console.log('🎬 TMDB Daily Detector v2.0 (ID-based)');
    console.log('=======================================\n');
    
    const args = process.argv.slice(2);
    const fromIdIndex = args.indexOf('--from-id');
    const limitIndex = args.indexOf('--limit');
    const dryRun = args.includes('--dry-run');
    
    let startFromId: number | null = null;
    if (fromIdIndex !== -1 && args[fromIdIndex + 1]) {
        startFromId = parseInt(args[fromIdIndex + 1]);
    }
    
    let limit = config.defaultLimit;
    if (limitIndex !== -1 && args[limitIndex + 1]) {
        limit = parseInt(args[limitIndex + 1]) || limit;
    }
    
    if (dryRun) {
        console.log('🔍 MODO DRY-RUN: No se guardarán cambios\n');
    }
    
    try {
        // Asegurar que existe la tabla de estado
        await ensureSyncStateTable();
        
        // Obtener último ID procesado
        let lastProcessedId = startFromId || await getLastProcessedId();
        
        if (!lastProcessedId) {
            console.log('⚠️ No hay ID inicial guardado.');
            console.log('   Usa --from-id XXXXXX para especificar desde dónde empezar.');
            console.log('   Ejemplo: npx tsx scripts/tmdb-daily-detector.ts --from-id 1619544\n');
            return;
        }
        
        // Obtener último ID de TMDB
        console.log('📡 Obteniendo último ID de TMDB...');
        const latestTmdbId = await getLatestTMDBId();
        console.log(`   Último ID en TMDB: ${latestTmdbId}`);
        console.log(`   Último ID procesado: ${lastProcessedId}`);
        
        const idsToProcess = latestTmdbId - lastProcessedId;
        console.log(`   IDs por procesar: ${idsToProcess}\n`);
        
        if (idsToProcess <= 0) {
            console.log('✅ Ya estás actualizado. No hay IDs nuevos para procesar.\n');
            return;
        }
        
        const actualLimit = Math.min(idsToProcess, limit);
        const endId = lastProcessedId + actualLimit;
        
        console.log(`🚀 Procesando IDs del ${lastProcessedId + 1} al ${endId} (${actualLimit} IDs)...\n`);
        
        // Estadísticas
        let stats = {
            processed: 0,
            notFound: 0,
            notArgentine: 0,
            skipped: 0,
            argentine: 0,
        };
        
        let lastSuccessfulId = lastProcessedId;
        
        for (let id = lastProcessedId + 1; id <= endId; id++) {
            // Progreso cada 100 IDs
            if ((id - lastProcessedId) % 100 === 0) {
                const percent = Math.round(((id - lastProcessedId) / actualLimit) * 100);
                console.log(`📊 Progreso: ${id - lastProcessedId}/${actualLimit} (${percent}%) - Argentinas: ${stats.argentine}`);
            }
            
            const result = await processMovie(id, dryRun);
            
            switch (result) {
                case 'not_found':
                    stats.notFound++;
                    break;
                case 'not_argentine':
                    stats.notArgentine++;
                    break;
                case 'skipped':
                    stats.skipped++;
                    break;
                case 'processed':
                    stats.argentine++;
                    break;
            }
            
            stats.processed++;
            lastSuccessfulId = id;
            
            await sleep(config.delayBetweenRequests);
        }
        
        // Guardar último ID procesado
        if (!dryRun) {
            await saveLastProcessedId(lastSuccessfulId);
            console.log(`\n💾 Guardado último ID procesado: ${lastSuccessfulId}`);
        }
        
        // Resumen
        console.log('\n' + '═'.repeat(50));
        console.log('📊 RESUMEN');
        console.log('═'.repeat(50));
        console.log(`   IDs procesados: ${stats.processed}`);
        console.log(`   No encontrados (404): ${stats.notFound}`);
        console.log(`   No argentinas: ${stats.notArgentine}`);
        console.log(`   Ya en BD/Pendientes: ${stats.skipped}`);
        console.log(`   🇦🇷 Películas argentinas: ${stats.argentine}`);
        console.log('═'.repeat(50));
        
        if (lastSuccessfulId < latestTmdbId) {
            console.log(`\n⚠️ Quedan ${latestTmdbId - lastSuccessfulId} IDs por procesar.`);
            console.log('   Ejecuta el script nuevamente para continuar.');
        } else {
            console.log('\n✅ ¡Completado! Todos los IDs procesados.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        // Notificar error por Telegram
        await sendTelegramMessage(
            `❌ <b>Error en TMDB Daily Detector</b>\n\n${error}`
        );
    } finally {
        await closePool();
    }
    
    console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});