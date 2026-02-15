/**
 * Script para importar imágenes de galería (backdrops) desde TMDB a Cloudinary
 *
 * Busca películas con tmdb_id que no tengan ninguna imagen en la tabla images,
 * obtiene los backdrops de TMDB, los sube a Cloudinary y los inserta en la BD.
 *
 * Uso:
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --dry-run              # Solo preview
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --apply                # Aplicar cambios
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --apply --limit=10     # Primeras 10
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --apply --movie-id=123 # Una película
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --resume               # Retomar
 *   npx tsx scripts/tmdb/import-tmdb-images.ts --reset-progress       # Limpiar progreso
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { v2 as cloudinary } from 'cloudinary';
import { getPool, closePool, resetPool } from './lib/database';
import { getMovieImages } from './tmdb-client';
import config from './config';
import { formatDuration, progressBar, log } from './utils';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

cloudinary.config({
    cloud_name: 'dzndglyjr',
    api_key: process.env.CLOUDINARY_API_KEY || '916999397279161',
    api_secret: process.env.CLOUDINARY_API_SECRET || '6K7EQkELG4dgl4RgdA5wsTwSPpI',
});

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const CLOUDINARY_UPLOAD_DELAY = 100; // ms entre uploads a Cloudinary
const PROGRESS_FILE = path.join(__dirname, 'reports', '.import-tmdb-images-progress.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

// ============================================================================
// TIPOS
// ============================================================================

interface MovieToProcess {
    id: number;
    title: string;
    tmdb_id: number;
    year: number | null;
}

interface SyncStats {
    movies_processed: number;
    movies_with_images: number;
    movies_no_backdrops: number;
    movies_error: number;
    images_uploaded: number;
    images_inserted: number;
    images_skipped_duplicate: number;
}

interface ProgressData {
    lastProcessedMovieId: number;
    lastRun: string;
    stats: SyncStats;
    /** file_paths de TMDB ya subidos para la película en curso (por si se corta a mitad) */
    currentMovieUploaded?: { movieId: number; filePaths: string[] };
}

// ============================================================================
// RECONEXIÓN / PAUSA (copiado de sync-cast-crew.ts)
// ============================================================================

function isConnectionError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code || '';
    const connectionPatterns = [
        'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'EHOSTUNREACH',
        'connection terminated', 'Connection terminated',
        'Client has encountered a connection error',
        'cannot acquire a client', 'pool is draining',
        'terminating connection', 'server closed the connection',
        'Connection lost', 'socket hang up', 'read ECONNRESET',
        'This socket has been ended',
    ];
    return connectionPatterns.some(p => msg.includes(p) || code.includes(p));
}

async function waitForUserResume(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        console.log('\n⏸️  ════════════════════════════════════════════════════════');
        console.log('   CONEXIÓN PERDIDA — El script está en PAUSA');
        console.log('   Reconectá el SSH y presioná ENTER para continuar...');
        console.log('   ════════════════════════════════════════════════════════\n');
        rl.question('', () => {
            rl.close();
            resolve();
        });
    });
}

async function reconnectDatabase(): Promise<void> {
    await resetPool();

    while (true) {
        try {
            const pool = getPool();
            await pool.query('SELECT 1');
            console.log('✅ Conexión a la base de datos restablecida\n');
            return;
        } catch (error) {
            await resetPool();
            console.log('❌ Todavía sin conexión a la DB. Presioná ENTER para reintentar...');
            await waitForUserResume();
        }
    }
}

async function withResilience<T>(fn: () => Promise<T>, context: string): Promise<T> {
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (isConnectionError(error)) {
                console.log(`\n❌ Conexión perdida durante: ${context}`);
                await waitForUserResume();
                await reconnectDatabase();
                console.log(`🔄 Reintentando: ${context}`);
            } else {
                throw error;
            }
        }
    }
}

// ============================================================================
// PROGRESO
// ============================================================================

function loadProgress(): ProgressData | null {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        }
    } catch {
        // Si hay error leyendo, empezar de cero
    }
    return null;
}

function saveProgress(data: ProgressData): void {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function resetProgressFile(): void {
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
        log('Progreso reiniciado', 'success');
    } else {
        log('No había progreso guardado', 'info');
    }
}

// ============================================================================
// QUERIES
// ============================================================================

async function getMoviesWithoutImages(
    limit?: number,
    movieId?: number,
    afterMovieId?: number,
): Promise<MovieToProcess[]> {
    const pool = getPool();

    let query = `
        SELECT m.id, m.title, m.tmdb_id, m.year
        FROM movies m
        WHERE m.tmdb_id IS NOT NULL AND m.tmdb_id > 0
          AND NOT EXISTS (SELECT 1 FROM images i WHERE i.movie_id = m.id)
    `;
    const params: any[] = [];

    if (movieId) {
        query += ` AND m.id = $${params.length + 1}`;
        params.push(movieId);
    }

    if (afterMovieId) {
        query += ` AND m.id > $${params.length + 1}`;
        params.push(afterMovieId);
    }

    query += ` ORDER BY m.id ASC`;

    if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
}

// ============================================================================
// CLOUDINARY
// ============================================================================

async function uploadBackdropToCloudinary(
    movieId: number,
    filePath: string,
): Promise<{ success: boolean; publicId?: string; error?: string }> {
    try {
        const tmdbImageUrl = `${TMDB_IMAGE_BASE_URL}${filePath}`;

        // Misma carpeta que el widget de upload manual (CloudinaryUploadWidget)
        // Sin public_id: Cloudinary genera uno random (ej: "iaxnaapc2wzlj07wqa8z")
        const result = await cloudinary.uploader.upload(tmdbImageUrl, {
            folder: `cinenacional/gallery/${movieId}`,
            resource_type: 'image',
            timeout: 120000,
        });

        return { success: true, publicId: result.public_id };
    } catch (error: any) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// DATABASE INSERT
// ============================================================================

async function insertImageRecord(
    movieId: number,
    cloudinaryPublicId: string,
): Promise<boolean> {
    const pool = getPool();

    const result = await pool.query(`
        INSERT INTO images (cloudinary_public_id, type, photo_date, photographer_credit, event_name, movie_id, created_at, updated_at)
        VALUES ($1, 'STILL', NULL, NULL, NULL, $2, NOW(), NOW())
        ON CONFLICT (cloudinary_public_id) DO NOTHING
        RETURNING id
    `, [cloudinaryPublicId, movieId]);

    return result.rowCount !== null && result.rowCount > 0;
}

// ============================================================================
// PROCESAR UNA PELÍCULA
// ============================================================================

async function processMovie(
    movie: MovieToProcess,
    isDryRun: boolean,
    stats: SyncStats,
    alreadyUploaded: Set<string>,
    onImageUploaded: (filePath: string) => void,
): Promise<void> {
    // 1. Obtener backdrops de TMDB
    const imagesResponse = await getMovieImages(movie.tmdb_id);
    const backdrops = imagesResponse.backdrops;

    if (!backdrops || backdrops.length === 0) {
        console.log(`     - Sin backdrops en TMDB`);
        stats.movies_no_backdrops++;
        return;
    }

    console.log(`     ${backdrops.length} backdrops encontrados`);
    stats.movies_with_images++;

    if (isDryRun) {
        console.log(`     (dry-run) Se importarían ${backdrops.length} imágenes`);
        stats.images_uploaded += backdrops.length;
        stats.images_inserted += backdrops.length;
        return;
    }

    // 2. Subir cada backdrop a Cloudinary e insertar en la BD
    for (let j = 0; j < backdrops.length; j++) {
        const backdrop = backdrops[j];

        // Si ya se subió este file_path (reprocesando película tras corte), saltar
        if (alreadyUploaded.has(backdrop.file_path)) {
            console.log(`     ~ Imagen ${j + 1}/${backdrops.length}: ya subida previamente (skip)`);
            stats.images_skipped_duplicate++;
            continue;
        }

        // Subir a Cloudinary
        const uploadResult = await uploadBackdropToCloudinary(movie.id, backdrop.file_path);

        if (!uploadResult.success) {
            console.log(`     ✗ Error subiendo imagen ${j + 1}: ${uploadResult.error}`);
            continue;
        }

        stats.images_uploaded++;

        // Insertar en la BD (con resiliencia para errores de conexión)
        const inserted = await withResilience(
            () => insertImageRecord(movie.id, uploadResult.publicId!),
            `INSERT imagen para película ${movie.id}`,
        );

        if (inserted) {
            stats.images_inserted++;
            console.log(`     + Imagen ${j + 1}/${backdrops.length}: ${uploadResult.publicId}`);
        } else {
            stats.images_skipped_duplicate++;
            console.log(`     ~ Imagen ${j + 1}/${backdrops.length}: ya existe en BD (skip)`);
        }

        // Registrar como subida en el progreso
        onImageUploaded(backdrop.file_path);

        // Delay entre uploads a Cloudinary
        if (j < backdrops.length - 1) {
            await new Promise(resolve => setTimeout(resolve, CLOUDINARY_UPLOAD_DELAY));
        }
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = !args.includes('--apply');
    const isResume = args.includes('--resume');

    const limitArg = args.find(a => a.startsWith('--limit'));
    const limit = limitArg
        ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1])
        : undefined;

    const movieIdArg = args.find(a => a.startsWith('--movie-id'));
    const movieId = movieIdArg
        ? parseInt(movieIdArg.split('=')[1] || args[args.indexOf('--movie-id') + 1])
        : undefined;

    if (args.includes('--reset-progress')) {
        resetProgressFile();
        return;
    }

    console.log('\n🖼️  Importar imágenes de galería desde TMDB');
    console.log('='.repeat(50) + '\n');
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (sin cambios)' : 'APPLY (modificando BD y Cloudinary)'}`);
    if (limit) console.log(`Límite: ${limit} películas`);
    if (movieId) console.log(`Película específica: ID ${movieId}`);
    if (isResume) console.log(`Retomando desde progreso guardado`);
    console.log('');

    const startTime = Date.now();

    // Cargar progreso si --resume
    let afterMovieId: number | undefined;
    let resumedStats: SyncStats | undefined;
    let resumedCurrentMovie: ProgressData['currentMovieUploaded'] | undefined;

    if (isResume) {
        const progress = loadProgress();
        if (progress) {
            afterMovieId = progress.lastProcessedMovieId;
            resumedStats = progress.stats;
            resumedCurrentMovie = progress.currentMovieUploaded;
            log(`Retomando desde movie_id > ${afterMovieId} (último run: ${progress.lastRun})`, 'info');
            if (resumedCurrentMovie) {
                log(`Película en curso: movie_id=${resumedCurrentMovie.movieId} con ${resumedCurrentMovie.filePaths.length} imágenes ya subidas`, 'info');
            }
        } else {
            log('No hay progreso guardado, empezando desde el inicio', 'warn');
        }
    }

    // Obtener películas sin imágenes
    log('Obteniendo películas sin imágenes...', 'info');
    const movies = await withResilience(
        () => getMoviesWithoutImages(limit, movieId, afterMovieId),
        'Obtener películas sin imágenes',
    );
    log(`Encontradas ${movies.length} películas para procesar`, 'info');

    if (movies.length === 0) {
        log('No hay películas para procesar', 'success');
        await closePool();
        return;
    }

    const stats: SyncStats = resumedStats || {
        movies_processed: 0,
        movies_with_images: 0,
        movies_no_backdrops: 0,
        movies_error: 0,
        images_uploaded: 0,
        images_inserted: 0,
        images_skipped_duplicate: 0,
    };

    const totalMovies = (resumedStats?.movies_processed || 0) + movies.length;

    // Tracking de imágenes subidas para la película en curso (para evitar duplicados tras corte)
    let currentMovieUploaded: { movieId: number; filePaths: string[] } =
        resumedCurrentMovie || { movieId: 0, filePaths: [] };

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        stats.movies_processed++;

        console.log(`\n${progressBar(stats.movies_processed, totalMovies)}`);
        console.log(`  🎬 [${movie.id}] ${movie.title} (${movie.year || '?'}) — tmdb_id=${movie.tmdb_id}`);

        // Preparar set de file_paths ya subidos para esta película
        const alreadyUploaded = new Set<string>(
            currentMovieUploaded.movieId === movie.id ? currentMovieUploaded.filePaths : [],
        );

        // Resetear tracking para esta película
        if (currentMovieUploaded.movieId !== movie.id) {
            currentMovieUploaded = { movieId: movie.id, filePaths: [] };
        }

        try {
            await processMovie(movie, isDryRun, stats, alreadyUploaded, (filePath) => {
                currentMovieUploaded.filePaths.push(filePath);
                // Guardar progreso incremental (por imagen)
                if (!isDryRun) {
                    saveProgress({
                        lastProcessedMovieId: i > 0 ? movies[i - 1].id : (afterMovieId || 0),
                        lastRun: new Date().toISOString(),
                        stats,
                        currentMovieUploaded,
                    });
                }
            });

            // Película completada — guardar progreso limpio (sin currentMovieUploaded)
            currentMovieUploaded = { movieId: 0, filePaths: [] };
            if (!isDryRun) {
                saveProgress({
                    lastProcessedMovieId: movie.id,
                    lastRun: new Date().toISOString(),
                    stats,
                });
            }

        } catch (error) {
            if (isConnectionError(error)) {
                console.log(`\n❌ Conexión perdida procesando: "${movie.title}"`);

                // Guardar progreso con las imágenes ya subidas de la película en curso
                if (!isDryRun) {
                    saveProgress({
                        lastProcessedMovieId: i > 0 ? movies[i - 1].id : (afterMovieId || 0),
                        lastRun: new Date().toISOString(),
                        stats,
                        currentMovieUploaded,
                    });
                }

                await waitForUserResume();
                await reconnectDatabase();

                // Reintentar esta misma película
                i--;
                stats.movies_processed--;
                console.log(`🔄 Reintentando película: "${movie.title}"`);
                continue;
            }

            const msg = error instanceof Error ? error.message : String(error);
            console.log(`     ❌ Error: ${msg}`);
            stats.movies_error++;

            // Limpiar tracking de película con error
            currentMovieUploaded = { movieId: 0, filePaths: [] };

            // Si es rate limit, esperar
            if (msg.includes('429') || msg.includes('rate')) {
                log('Rate limit alcanzado, esperando 10 segundos...', 'warn');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    // Guardar progreso final
    if (!isDryRun && movies.length > 0) {
        saveProgress({
            lastProcessedMovieId: movies[movies.length - 1].id,
            lastRun: new Date().toISOString(),
            stats,
        });
    }

    const elapsed = Date.now() - startTime;

    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE IMPORTACIÓN DE IMÁGENES');
    console.log('='.repeat(50));
    console.log(`   Películas procesadas:     ${stats.movies_processed}`);
    console.log(`   Películas con imágenes:   ${stats.movies_with_images}`);
    console.log(`   Películas sin backdrops:  ${stats.movies_no_backdrops}`);
    console.log(`   Películas con error:      ${stats.movies_error}`);
    console.log('');
    console.log(`   Imágenes subidas:         ${stats.images_uploaded}`);
    console.log(`   Imágenes insertadas en BD:${stats.images_inserted}`);
    console.log(`   Imágenes duplicadas:      ${stats.images_skipped_duplicate}`);
    console.log('');
    console.log(`   Duración:                 ${formatDuration(elapsed)}`);
    console.log('='.repeat(50));

    if (isDryRun) {
        console.log('\n💡 Modo dry-run: No se aplicaron cambios.');
        console.log('   Para aplicar: npx tsx scripts/tmdb/import-tmdb-images.ts --apply');
    }

    await closePool();
    console.log('\n✨ Proceso completado\n');
}

main().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
});
