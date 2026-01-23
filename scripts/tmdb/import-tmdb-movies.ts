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
import config from './config';

import {
    // Tipos
    type TMDBMovieDetails,
    type TMDBCrewMember,
    type ImportResult,
    type PersonMatchResult,
    type PersonForReview,

    // Mapeos
    JOB_TO_ROLE_ID,
    JOB_TO_MULTIPLE_ROLES,
    DEPARTMENT_MAP,

    // API
    getMovieDetails,
    sleep,

    // Base de datos
    getPool,
    closePool,
    movieExistsByTmdbId,
    findPersonByTmdbId,
    findPersonByNameAndDepartment,

    // Nombres
    loadFirstNameGenderCache,
    lookupGender,
    splitNameAndGetGenderSync,

    // Claude
    peopleForReview,
    clearPeopleForReview,

    // Importer
    getSpanishTitle,
    importMovie,
} from './lib';

const RATE_LIMIT_MS = config.delayBetweenRequests;

// ============================================================================
// FUNCIÓN DE ANÁLISIS DRY-RUN
// ============================================================================

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

    // 3. Se crearía nueva - analizar nombre (versión síncrona para dry-run)
    const splitResult = splitNameAndGetGenderSync(name);

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
    const singleRoleJobs = Object.keys(JOB_TO_ROLE_ID);
    const multiRoleJobs = Object.keys(JOB_TO_MULTIPLE_ROLES);
    const importantJobs = [...singleRoleJobs, ...multiRoleJobs];

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
// FUNCIÓN PRINCIPAL DE IMPORTACIÓN CON DRY-RUN
// ============================================================================

async function processMovie(tmdbId: number, dryRun: boolean): Promise<ImportResult> {
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
        const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : new Date().getFullYear();

        result.title = title;

        if (dryRun) {
            console.log(`  📋 Título: ${title}`);
            console.log(`  📅 Año: ${year}`);
            console.log(`  ⏱️  Duración: ${movie.runtime || 'N/A'} min`);
            console.log(`  🎭 Géneros: ${movie.genres.map(g => g.name).join(', ')}`);
            console.log(`  🌍 Países: ${movie.production_countries.map(c => c.iso_3166_1).join(', ')}`);

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

        // Importación real usando el módulo compartido
        const importResult = await importMovie(movie);
        return importResult;

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
    console.log('🎬 TMDB Movie Import Script v3.0');
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

    // Cargar cache de nombres
    await loadFirstNameGenderCache();

    // Limpiar lista de revisión
    clearPeopleForReview();

    const results: ImportResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < moviesToImport.length; i++) {
        const movie = moviesToImport[i];
        console.log(`\n[${i + 1}/${moviesToImport.length}] 🎬 TMDB ID: ${movie.tmdb_id} - ${movie.tmdb_title || '(sin título)'}`);

        const result = await processMovie(movie.tmdb_id, dryRun);
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
