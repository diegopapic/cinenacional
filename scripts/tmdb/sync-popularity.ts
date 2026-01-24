/**
 * Script para sincronizar popularidad de TMDB a películas y personas
 *
 * Uso:
 *   npx tsx scripts/tmdb/sync-popularity.ts [opciones]
 *
 * Opciones:
 *   --type movies|people|all  Tipo de registros a sincronizar (default: all)
 *   --limit N                 Límite de registros a procesar (default: sin límite)
 *   --dry-run                 Modo prueba, no escribe en DB
 *   --batch-size N            Tamaño del batch (default: 100)
 *   --delay N                 Delay entre requests en ms (default: 30)
 *   --only-missing            Solo actualizar registros sin popularidad
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import config from './config';
import { getMoviePopularity, getPersonPopularity, sleep } from './lib/api';

const prisma = new PrismaClient();

interface SyncOptions {
    type: 'movies' | 'people' | 'all';
    limit?: number;
    dryRun: boolean;
    batchSize: number;
    delay: number;
    onlyMissing: boolean;
}

interface SyncResult {
    id: number;
    tmdbId: number;
    title: string;
    oldPopularity: number | null;
    newPopularity: number | null;
    status: 'updated' | 'unchanged' | 'error' | 'not_found';
    error?: string;
}

interface SyncStats {
    total: number;
    updated: number;
    unchanged: number;
    errors: number;
    notFound: number;
    startTime: Date;
    endTime?: Date;
}

function parseArgs(): SyncOptions {
    const args = process.argv.slice(2);
    const options: SyncOptions = {
        type: 'all',
        dryRun: false,
        batchSize: 100,
        delay: config.delayBetweenRequests,
        onlyMissing: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--type':
                const type = args[++i];
                if (type === 'movies' || type === 'people' || type === 'all') {
                    options.type = type;
                }
                break;
            case '--limit':
                options.limit = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i], 10);
                break;
            case '--delay':
                options.delay = parseInt(args[++i], 10);
                break;
            case '--only-missing':
                options.onlyMissing = true;
                break;
        }
    }

    return options;
}

async function syncMoviesPopularity(options: SyncOptions): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const whereClause: any = {
        tmdbId: { not: null },
    };

    if (options.onlyMissing) {
        whereClause.tmdbPopularity = null;
    }

    const totalCount = await prisma.movie.count({ where: whereClause });
    const limit = options.limit || totalCount;

    console.log(`\n📽️  Sincronizando películas...`);
    console.log(`   Total con tmdbId: ${totalCount}`);
    console.log(`   A procesar: ${Math.min(limit, totalCount)}`);

    let processed = 0;
    let offset = 0;

    while (processed < limit) {
        const batchLimit = Math.min(options.batchSize, limit - processed);

        const movies = await prisma.movie.findMany({
            where: whereClause,
            select: {
                id: true,
                tmdbId: true,
                title: true,
                tmdbPopularity: true,
            },
            orderBy: [
                { tmdbPopularityUpdatedAt: { sort: 'asc', nulls: 'first' } },
                { id: 'asc' }
            ],
            skip: offset,
            take: batchLimit,
        });

        if (movies.length === 0) break;

        for (const movie of movies) {
            const result: SyncResult = {
                id: movie.id,
                tmdbId: movie.tmdbId!,
                title: movie.title,
                oldPopularity: movie.tmdbPopularity,
                newPopularity: null,
                status: 'unchanged',
            };

            try {
                const tmdbData = await getMoviePopularity(movie.tmdbId!);
                result.newPopularity = tmdbData.popularity;

                if (result.oldPopularity !== result.newPopularity) {
                    result.status = 'updated';

                    if (!options.dryRun) {
                        await prisma.movie.update({
                            where: { id: movie.id },
                            data: {
                                tmdbPopularity: tmdbData.popularity,
                                tmdbPopularityUpdatedAt: new Date(),
                            },
                        });
                    }
                }
            } catch (error: any) {
                if (error.message?.includes('404')) {
                    result.status = 'not_found';
                    result.error = 'No encontrado en TMDB';
                } else {
                    result.status = 'error';
                    result.error = error.message;
                }
            }

            results.push(result);
            processed++;

            if (processed % 50 === 0) {
                console.log(`   Procesadas: ${processed}/${Math.min(limit, totalCount)}`);
            }

            await sleep(options.delay);
        }

        offset += batchLimit;
    }

    return results;
}

async function syncPeoplePopularity(options: SyncOptions): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const whereClause: any = {
        tmdbId: { not: null },
    };

    if (options.onlyMissing) {
        whereClause.tmdbPopularity = null;
    }

    const totalCount = await prisma.person.count({ where: whereClause });
    const limit = options.limit || totalCount;

    console.log(`\n👤 Sincronizando personas...`);
    console.log(`   Total con tmdbId: ${totalCount}`);
    console.log(`   A procesar: ${Math.min(limit, totalCount)}`);

    let processed = 0;
    let offset = 0;

    while (processed < limit) {
        const batchLimit = Math.min(options.batchSize, limit - processed);

        const people = await prisma.person.findMany({
            where: whereClause,
            select: {
                id: true,
                tmdbId: true,
                firstName: true,
                lastName: true,
                tmdbPopularity: true,
            },
            orderBy: [
                { tmdbPopularityUpdatedAt: { sort: 'asc', nulls: 'first' } },
                { id: 'asc' }
            ],
            skip: offset,
            take: batchLimit,
        });

        if (people.length === 0) break;

        for (const person of people) {
            const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ') || `ID ${person.id}`;

            const result: SyncResult = {
                id: person.id,
                tmdbId: person.tmdbId!,
                title: fullName,
                oldPopularity: person.tmdbPopularity,
                newPopularity: null,
                status: 'unchanged',
            };

            try {
                const tmdbData = await getPersonPopularity(person.tmdbId!);
                result.newPopularity = tmdbData.popularity;

                if (result.oldPopularity !== result.newPopularity) {
                    result.status = 'updated';

                    if (!options.dryRun) {
                        await prisma.person.update({
                            where: { id: person.id },
                            data: {
                                tmdbPopularity: tmdbData.popularity,
                                tmdbPopularityUpdatedAt: new Date(),
                            },
                        });
                    }
                }
            } catch (error: any) {
                if (error.message?.includes('404')) {
                    result.status = 'not_found';
                    result.error = 'No encontrado en TMDB';
                } else {
                    result.status = 'error';
                    result.error = error.message;
                }
            }

            results.push(result);
            processed++;

            if (processed % 50 === 0) {
                console.log(`   Procesadas: ${processed}/${Math.min(limit, totalCount)}`);
            }

            await sleep(options.delay);
        }

        offset += batchLimit;
    }

    return results;
}

function generateReport(movieResults: SyncResult[], peopleResults: SyncResult[], options: SyncOptions): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = options.dryRun ? 'dry-run-' : '';
    const reportsDir = path.join(__dirname, 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const allResults = [
        ...movieResults.map(r => ({ ...r, type: 'movie' })),
        ...peopleResults.map(r => ({ ...r, type: 'person' })),
    ];

    const csvPath = path.join(reportsDir, `${prefix}popularity-sync-${timestamp}.csv`);
    const csvHeader = 'type,id,tmdb_id,title,old_popularity,new_popularity,status,error\n';
    const csvRows = allResults.map(r =>
        `${r.type},${r.id},${r.tmdbId},"${r.title.replace(/"/g, '""')}",${r.oldPopularity ?? ''},${r.newPopularity ?? ''},${r.status},"${r.error || ''}"`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`\n📄 Reporte guardado en: ${csvPath}`);
}

function printSummary(movieResults: SyncResult[], peopleResults: SyncResult[], stats: SyncStats): void {
    const movieStats = {
        updated: movieResults.filter(r => r.status === 'updated').length,
        unchanged: movieResults.filter(r => r.status === 'unchanged').length,
        errors: movieResults.filter(r => r.status === 'error').length,
        notFound: movieResults.filter(r => r.status === 'not_found').length,
    };

    const peopleStats = {
        updated: peopleResults.filter(r => r.status === 'updated').length,
        unchanged: peopleResults.filter(r => r.status === 'unchanged').length,
        errors: peopleResults.filter(r => r.status === 'error').length,
        notFound: peopleResults.filter(r => r.status === 'not_found').length,
    };

    const duration = stats.endTime
        ? Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000)
        : 0;

    console.log('\n' + '='.repeat(50));
    console.log('RESUMEN DE SINCRONIZACIÓN');
    console.log('='.repeat(50));

    if (movieResults.length > 0) {
        console.log(`\n📽️  PELÍCULAS (${movieResults.length} procesadas)`);
        console.log(`   ✅ Actualizadas: ${movieStats.updated}`);
        console.log(`   ➖ Sin cambios:  ${movieStats.unchanged}`);
        console.log(`   ❌ Errores:      ${movieStats.errors}`);
        console.log(`   🔍 No encontradas: ${movieStats.notFound}`);
    }

    if (peopleResults.length > 0) {
        console.log(`\n👤 PERSONAS (${peopleResults.length} procesadas)`);
        console.log(`   ✅ Actualizadas: ${peopleStats.updated}`);
        console.log(`   ➖ Sin cambios:  ${peopleStats.unchanged}`);
        console.log(`   ❌ Errores:      ${peopleStats.errors}`);
        console.log(`   🔍 No encontradas: ${peopleStats.notFound}`);
    }

    console.log(`\n⏱️  Duración: ${duration} segundos`);
    console.log('='.repeat(50));
}

async function main() {
    const options = parseArgs();
    const stats: SyncStats = {
        total: 0,
        updated: 0,
        unchanged: 0,
        errors: 0,
        notFound: 0,
        startTime: new Date(),
    };

    console.log('='.repeat(50));
    console.log('SINCRONIZACIÓN DE POPULARIDAD TMDB');
    console.log('='.repeat(50));
    console.log(`Tipo: ${options.type}`);
    console.log(`Límite: ${options.limit || 'sin límite'}`);
    console.log(`Dry-run: ${options.dryRun ? 'SÍ' : 'NO'}`);
    console.log(`Solo missing: ${options.onlyMissing ? 'SÍ' : 'NO'}`);
    console.log(`Batch size: ${options.batchSize}`);
    console.log(`Delay: ${options.delay}ms`);

    let movieResults: SyncResult[] = [];
    let peopleResults: SyncResult[] = [];

    try {
        if (options.type === 'movies' || options.type === 'all') {
            movieResults = await syncMoviesPopularity(options);
        }

        if (options.type === 'people' || options.type === 'all') {
            peopleResults = await syncPeoplePopularity(options);
        }

        stats.endTime = new Date();

        generateReport(movieResults, peopleResults, options);
        printSummary(movieResults, peopleResults, stats);

    } catch (error) {
        console.error('Error durante la sincronización:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
