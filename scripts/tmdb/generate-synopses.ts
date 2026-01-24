/**
 * Script para generar sinopsis de películas usando Claude
 *
 * Busca películas que:
 * - Tengan fecha de estreno (releaseYear no nulo)
 * - Sean largometrajes (duración > 60 minutos)
 * - No tengan la sinopsis lockeada (synopsisLocked = false)
 *
 * Uso:
 *   npx tsx generate-synopses.ts --dry-run          # Solo mostrar qué películas se procesarían
 *   npx tsx generate-synopses.ts --limit 10         # Procesar solo 10 películas
 *   npx tsx generate-synopses.ts --movie-id 123     # Procesar una película específica
 *   npx tsx generate-synopses.ts                    # Procesar todas las películas
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde la raíz del proyecto ANTES de importar config
// Usar override:true porque puede haber variables del sistema con valores vacíos
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, override: true });

import config from './config';
import { getPool, closePool } from './lib/database';

// Verificar API key (usar directamente de process.env ya que config puede tener problemas de timing)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY no está configurada en', envPath);
    console.error('   Verificá que el archivo .env existe y contiene ANTHROPIC_API_KEY');
    process.exit(1);
}

const RATE_LIMIT_MS = 5000; // 5 segundos entre llamadas a Claude (web search usa más tokens)
const MAX_RETRIES = 3; // Reintentos en caso de rate limit
const RETRY_DELAY_MS = 60000; // 60 segundos de espera en caso de rate limit

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mapeo de géneros del prompt a IDs en la base de datos
const GENRE_NAME_TO_ID: Record<string, number> = {
    'Acción': 32,
    'Animación': 18,
    'Aventuras': 30,
    'Biográfica': 31,
    'Bélica': 36,
    'Ciencia ficción': 27,
    'Comedia': 17,
    'Deportes': 35,
    'Documental': 15,
    'Drama': 16,
    'Ensayo': 37,
    'Erótica': 34,
    'Experimental': 20,
    'Fantástico': 26,
    'Histórica': 28,
    'Infantil': 29,
    'Musical': 25,
    'Policial': 21,
    'Política': 38,
    'Romántica': 23,
    'Suspenso': 22,
    'Terror': 19,
    'Thriller': 24,
    'Western': 33,
};

interface MovieToProcess {
    id: number;
    title: string;
    year: number | null;
    releaseYear: number | null;
    synopsis: string | null;
    synopsisLocked: boolean;
    duration: number | null;
    directorName: string | null;
}

interface ProcessResult {
    movieId: number;
    title: string;
    status: 'success' | 'skipped' | 'error' | 'empty';
    message: string;
    synopsis?: string;
    genres?: string[];
    charCount?: number;
}

// ============================================================================
// FUNCIONES DE CLAUDE
// ============================================================================

async function askClaudeWithWebSearch(prompt: string, maxTokens: number = 4096, retryCount: number = 0): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            tools: [{
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 3
            }],
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        // Si es rate limit y no hemos excedido los reintentos, esperar y reintentar
        if (response.status === 429 && retryCount < MAX_RETRIES) {
            const waitTime = RETRY_DELAY_MS * (retryCount + 1); // Backoff exponencial
            console.log(`     ⏳ Rate limit alcanzado. Esperando ${waitTime / 1000}s antes de reintentar (${retryCount + 1}/${MAX_RETRIES})...`);
            await sleep(waitTime);
            return askClaudeWithWebSearch(prompt, maxTokens, retryCount + 1);
        }

        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extraer todos los bloques de texto de la respuesta
    const textBlocks = data.content.filter((block: any) => block.type === 'text');
    if (textBlocks.length === 0) {
        throw new Error('No se encontró bloque de texto en la respuesta');
    }

    // Concatenar todos los textos
    return textBlocks.map((block: any) => block.text).join('');
}

// Versión simple sin web search para reescritura de sinopsis existentes
async function askClaude(prompt: string, maxTokens: number = 1500, retryCount: number = 0): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        // Si es rate limit y no hemos excedido los reintentos, esperar y reintentar
        if (response.status === 429 && retryCount < MAX_RETRIES) {
            const waitTime = RETRY_DELAY_MS * (retryCount + 1);
            console.log(`     ⏳ Rate limit alcanzado. Esperando ${waitTime / 1000}s antes de reintentar (${retryCount + 1}/${MAX_RETRIES})...`);
            await sleep(waitTime);
            return askClaude(prompt, maxTokens, retryCount + 1);
        }

        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function generateSynopsis(title: string, year: number | null, director: string | null): Promise<{ synopsis: string; genres: string[]; charCount: number } | null> {
    const directorInfo = director ? `Director: ${director}` : '';
    const yearInfo = year ? `Año: ${year}` : '';

    const prompt = `PROMPT PARA GENERAR SINOPSIS DE PELÍCULAS ARGENTINAS

IMPORTANTE: Usá la herramienta de búsqueda web para investigar sobre esta película argentina antes de escribir la sinopsis. Buscá información sobre su trama, personajes y género.

Si después de buscar no encontrás información suficiente sobre esta película específica, respondé ÚNICAMENTE con: NO_INFO

⚠️ FORMATO DE RESPUESTA OBLIGATORIO ⚠️

Tu respuesta final debe tener EXACTAMENTE este formato (sin ningún texto adicional antes o después):

[Texto de la sinopsis entre 400-500 caracteres]

Caracteres: [número]

Géneros: [lista separada por comas]

PROHIBIDO:
• NO escribas "Basándome en...", "Según la información...", "La sinopsis es..." ni ninguna introducción
• NO generes artefactos ni documentos
• NO muestres informes de investigación
• NO incluyas análisis, contexto ni explicaciones
• NO menciones premios, festivales ni recepción crítica
• NO uses formato markdown con títulos ni secciones
• NO inventes información si no la encontraste en la búsqueda
• Comenzá DIRECTAMENTE con el texto de la sinopsis

INSTRUCCIONES DE REDACCIÓN

Paso 1 - Investigación:
Usá la búsqueda web para encontrar información sobre la película. Buscá sinopsis, reseñas o información de la trama.

Paso 2 - Redacción de sinopsis:
Con la información obtenida, escribí una sinopsis que cumpla estos requisitos:
• Extensión: entre 400 y 500 caracteres (incluyendo espacios)
• Sin spoilers: no reveles giros argumentales, desenlaces ni información del último tercio de la película
• Tono: neutral y objetivo, sin juicios de valor ni lenguaje promocional
• Contenido: describí únicamente la premisa y situación inicial, presentando personajes principales y conflicto central
• Estilo: redacción clara y directa, en tercera persona, tiempo presente
• Terminología: usá "dictadura militar" (nunca "dictadura cívico-militar")
• Lenguaje: español rioplatense (con voseo) pero sin lunfardo ni jerga. Evitá españolismos como "timo", "molar", "currar", "tío", etc. Usá formas rioplatenses: "vuelve" en lugar de "regresa", "chico" en lugar de "niño", "enojado" en lugar de "enfadado", "lindo" en lugar de "bonito", "agarrar" en lugar de "coger".
• Números: los años (edad, fechas) deben escribirse en cifras, no en letras. Las décadas en letras: los ochenta, los noventa (no los 80, los 90)
• Evitar repeticiones estructurales: no uses construcciones paralelas para describir personajes. Variá la sintaxis y el enfoque narrativo.
• Documentales: si es documental, aclaralo explícitamente
• Solo argumento: NO incluyas título, director, actores, países ni datos técnicos
• Sin metadiscurso: NO uses "La película es…", "El film trata de…", etc. Comenzá directamente con la historia
• Evitar lugares comunes: no uses expresiones cliché o fórmulas gastadas como "amigas inseparables", "viaje iniciático", "nada volverá a ser igual", "secretos que salen a la luz", "en busca de respuestas", etc. Buscá formas más precisas y originales de expresar las ideas.

Paso 3 - Conteo:
Antes de entregar, verificá el conteo de caracteres usando una herramienta de conteo. No estimes ni calcules mentalmente: contá con precisión.

Paso 4 - Clasificación de géneros:
Asigná a la película uno o más géneros de la siguiente lista cerrada. Usá únicamente los géneros que correspondan según el contenido y tono de la película. No inventes géneros ni uses sinónimos.

Géneros disponibles: Acción, Animación, Aventuras, Biográfica, Bélica, Ciencia ficción, Comedia, Deportes, Documental, Drama, Ensayo, Erótica, Experimental, Fantástico, Histórica, Infantil, Musical, Policial, Política, Romántica, Suspenso, Terror, Thriller, Western.

⚠️ RECORDATORIO FINAL:
- Primero buscá información sobre la película en la web
- Si no encontrás información suficiente → respondé solo: NO_INFO
- Si encontrás información → respondé ÚNICAMENTE sinopsis + conteo + géneros

Película argentina: ${title}
${yearInfo}
${directorInfo}`;

    try {
        const response = await askClaudeWithWebSearch(prompt);
        const trimmed = response.trim();

        // Si no hay información
        if (trimmed === 'NO_INFO' || trimmed.includes('NO_INFO')) {
            return null;
        }

        // Parsear la respuesta
        const lines = trimmed.split('\n').filter(l => l.trim());

        // Buscar la sinopsis (todo el texto hasta encontrar "Caracteres:" o "Géneros:")
        let synopsisLines: string[] = [];
        let charCount = 0;
        let genres: string[] = [];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.startsWith('caracteres:') || lowerLine.startsWith('conteo:') || lowerLine.match(/^\d+\s*caracteres/i)) {
                const match = line.match(/(\d+)/);
                if (match) {
                    charCount = parseInt(match[1]);
                }
            } else if (lowerLine.startsWith('géneros:') || lowerLine.startsWith('género:')) {
                const genreText = line.replace(/^g[eé]neros?:\s*/i, '');
                genres = genreText.split(/[,;]/).map(g => g.trim()).filter(g => g);
            } else if (!lowerLine.includes('sinopsis:')) {
                // Es parte de la sinopsis
                synopsisLines.push(line);
            }
        }

        const synopsis = synopsisLines.join('\n').trim();

        if (!synopsis || synopsis.length < 100) {
            return null;
        }

        // Si no se detectó el conteo, calcularlo
        if (charCount === 0) {
            charCount = synopsis.length;
        }

        return {
            synopsis,
            genres,
            charCount
        };
    } catch (error) {
        console.log(`     ⚠ Error al generar sinopsis con Claude: ${error}`);
        return null;
    }
}

async function rewriteExistingSynopsis(originalSynopsis: string, isDocumental: boolean): Promise<string> {
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

Texto a convertir:
${originalSynopsis}

Responde SOLO con la sinopsis reescrita. Si el texto no tiene suficiente información narrativa, respondé ÚNICAMENTE con: SINOPSIS_VACIA`;

    try {
        const rewritten = await askClaude(prompt, 800);
        const trimmed = rewritten.trim();

        if (trimmed === 'SINOPSIS_VACIA' || trimmed.includes('SINOPSIS_VACIA')) {
            return '';
        }

        return trimmed;
    } catch (error) {
        console.log(`     ⚠ Error al reescribir sinopsis con Claude: ${error}`);
        throw error; // Propagar el error para manejarlo en el nivel superior
    }
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS
// ============================================================================

async function getMoviesToProcess(movieId?: number, limit?: number): Promise<MovieToProcess[]> {
    const pool = getPool();

    let query = `
        SELECT
            m.id,
            m.title,
            m.year,
            m.release_year as "releaseYear",
            m.synopsis,
            m.synopsis_locked as "synopsisLocked",
            m.duration,
            (
                SELECT p.first_name || ' ' || p.last_name
                FROM movie_crew mc
                JOIN people p ON mc.person_id = p.id
                WHERE mc.movie_id = m.id AND mc.role_id = 2
                ORDER BY mc.billing_order NULLS LAST
                LIMIT 1
            ) as "directorName"
        FROM movies m
        WHERE m.release_year IS NOT NULL
          AND m.duration > 60
          AND m.synopsis_locked = false
    `;

    const params: any[] = [];

    if (movieId) {
        query += ` AND m.id = $1`;
        params.push(movieId);
    }

    query += ` ORDER BY m.tmdb_popularity DESC NULLS LAST, m.release_year DESC, m.id`;

    if (limit && !movieId) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
}

async function hasGenreDocumental(movieId: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
        `SELECT 1 FROM movie_genres WHERE movie_id = $1 AND genre_id = $2 LIMIT 1`,
        [movieId, GENRE_NAME_TO_ID['Documental']]
    );
    return result.rows.length > 0;
}

async function updateMovieSynopsisAndGenres(
    movieId: number,
    synopsis: string,
    genres: string[],
    lock: boolean
): Promise<void> {
    const pool = getPool();

    // Actualizar sinopsis y lock
    await pool.query(
        `UPDATE movies SET synopsis = $1, synopsis_locked = $2, updated_at = NOW() WHERE id = $3`,
        [synopsis, lock, movieId]
    );

    // Si hay géneros, actualizarlos
    if (genres.length > 0) {
        // Eliminar géneros existentes
        await pool.query(`DELETE FROM movie_genres WHERE movie_id = $1`, [movieId]);

        // Insertar nuevos géneros
        for (let i = 0; i < genres.length; i++) {
            const genreName = genres[i];
            const genreId = GENRE_NAME_TO_ID[genreName];

            if (genreId) {
                const isPrimary = i === 0;
                await pool.query(
                    `INSERT INTO movie_genres (movie_id, genre_id, is_primary) VALUES ($1, $2, $3)`,
                    [movieId, genreId, isPrimary]
                );
            }
        }
    }
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// ============================================================================

async function processMovie(movie: MovieToProcess, dryRun: boolean): Promise<ProcessResult> {
    const result: ProcessResult = {
        movieId: movie.id,
        title: movie.title,
        status: 'error',
        message: ''
    };

    try {
        console.log(`     📖 Generando sinopsis para "${movie.title}" (${movie.releaseYear})...`);

        // Primero intentar generar sinopsis con investigación web
        const generated = await generateSynopsis(movie.title, movie.releaseYear || movie.year, movie.directorName);

        if (generated) {
            result.synopsis = generated.synopsis;
            result.genres = generated.genres;
            result.charCount = generated.charCount;

            if (dryRun) {
                result.status = 'success';
                result.message = `Generada (${generated.charCount} caracteres)`;
            } else {
                // Actualizar en la base de datos
                await updateMovieSynopsisAndGenres(
                    movie.id,
                    generated.synopsis,
                    generated.genres,
                    true // Lock
                );
                result.status = 'success';
                result.message = `Actualizada y lockeada (${generated.charCount} caracteres)`;
            }
            return result;
        }

        // Si no se pudo generar, intentar reescribir la existente
        if (movie.synopsis && movie.synopsis.trim().length > 0) {
            console.log(`     📝 Reescribiendo sinopsis existente...`);
            const isDocumental = await hasGenreDocumental(movie.id);

            try {
                const rewritten = await rewriteExistingSynopsis(movie.synopsis, isDocumental);

                if (rewritten && rewritten.length > 0) {
                    result.synopsis = rewritten;
                    result.charCount = rewritten.length;

                    if (dryRun) {
                        result.status = 'success';
                        result.message = `Reescrita (${rewritten.length} caracteres)`;
                    } else {
                        await updateMovieSynopsisAndGenres(movie.id, rewritten, [], true);
                        result.status = 'success';
                        result.message = `Reescrita y lockeada (${rewritten.length} caracteres)`;
                    }
                    return result;
                }
            } catch (error) {
                // Si falla la reescritura, continuar al caso "empty"
                console.log(`     ℹ️  No se pudo reescribir, dejando sin cambios`);
            }
        }

        // Si no hay sinopsis o no se pudo reescribir, dejar vacía
        result.status = 'empty';
        result.message = 'Sin información suficiente, sinopsis dejada vacía';

    } catch (error) {
        result.status = 'error';
        result.message = error instanceof Error ? error.message : 'Error desconocido';
    }

    return result;
}

// ============================================================================
// GENERACIÓN DE REPORTE
// ============================================================================

function generateReport(results: ProcessResult[], dryRun: boolean): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = dryRun ? 'dry-run-' : '';
    const reportPath = path.join(__dirname, 'reports', `${prefix}synopses-${timestamp}.csv`);

    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const headers = ['movie_id', 'title', 'status', 'message', 'char_count', 'genres'];
    const rows = results.map(r => [
        r.movieId,
        `"${r.title.replace(/"/g, '""')}"`,
        r.status,
        `"${r.message.replace(/"/g, '""')}"`,
        r.charCount || '',
        r.genres ? `"${r.genres.join(', ')}"` : ''
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(reportPath, csvContent, 'utf-8');

    console.log(`\n📋 Reporte guardado en: ${reportPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
    console.log('🎬 Generador de Sinopsis v1.0');
    console.log('==============================\n');

    const args = process.argv.slice(2);
    const movieIdIndex = args.indexOf('--movie-id');
    const limitIndex = args.indexOf('--limit');
    const dryRun = args.includes('--dry-run');

    let movieId: number | undefined;
    let limit: number | undefined;

    if (movieIdIndex !== -1 && args[movieIdIndex + 1]) {
        movieId = parseInt(args[movieIdIndex + 1]);
        if (isNaN(movieId)) {
            console.error('❌ ID de película inválido');
            process.exit(1);
        }
    }

    if (limitIndex !== -1 && args[limitIndex + 1]) {
        limit = parseInt(args[limitIndex + 1]);
        if (isNaN(limit)) {
            console.error('❌ Límite inválido');
            process.exit(1);
        }
    }

    if (dryRun) {
        console.log('🔍 MODO DRY-RUN: No se aplicarán cambios\n');
    }

    // Obtener películas a procesar
    console.log('📋 Buscando películas a procesar...');
    const movies = await getMoviesToProcess(movieId, limit);

    if (movies.length === 0) {
        console.log('✅ No hay películas que procesar.');
        await closePool();
        return;
    }

    console.log(`📋 Películas a procesar: ${movies.length}\n`);

    const results: ProcessResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        console.log(`[${i + 1}/${movies.length}] 🎬 ${movie.title} (ID: ${movie.id})`);

        const result = await processMovie(movie, dryRun);
        results.push(result);

        const statusIcon = result.status === 'success' ? '✅' :
            result.status === 'empty' ? '⚪' :
            result.status === 'skipped' ? '⏭️' : '❌';

        console.log(`     ${statusIcon} ${result.message}`);

        if (result.synopsis && dryRun) {
            console.log(`     📝 Sinopsis: ${result.synopsis.substring(0, 100)}...`);
            if (result.genres && result.genres.length > 0) {
                console.log(`     🎭 Géneros: ${result.genres.join(', ')}`);
            }
        }

        // Rate limiting
        if (i < movies.length - 1) {
            await sleep(RATE_LIMIT_MS);
        }
    }

    // Resumen
    const elapsed = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const emptyCount = results.filter(r => r.status === 'empty').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN GENERAL');
    console.log('='.repeat(50));
    console.log(`   Total procesadas:    ${results.length}`);
    console.log(`   ✅ Exitosas:         ${successCount}`);
    console.log(`   ⚪ Sin info:         ${emptyCount}`);
    console.log(`   ❌ Errores:          ${errorCount}`);
    console.log(`   ⏱️  Tiempo:           ${Math.round(elapsed / 1000)}s`);

    if (dryRun) {
        console.log('\n💡 Modo dry-run: Para aplicar cambios, quitar --dry-run');
    }

    // Generar reporte
    generateReport(results, dryRun);

    await closePool();
    console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
    console.error('Error fatal:', error);
    closePool().finally(() => process.exit(1));
});
