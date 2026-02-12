/**
 * Script para sincronizar imdbVotes desde OMDB API
 *
 * Uso:
 *   npx tsx scripts/tmdb/sync-imdb-votes.ts [opciones]
 *
 * Opciones:
 *   --limit N                 Límite de registros a procesar (default: sin límite)
 *   --dry-run                 Modo prueba, no escribe en DB
 *   --batch-size N            Tamaño del batch (default: 100)
 *   --delay N                 Delay entre requests en ms (default: 100)
 *   --only-missing            Solo actualizar registros sin imdbVotes
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Cargar dotenv solo si está disponible
try {
    const pathModule = require('path');
    const dotenv = require('dotenv');
    dotenv.config({ path: pathModule.resolve(__dirname, '../../.env') });
} catch {
    // dotenv no disponible
}

const prisma = new PrismaClient();

const OMDB_API_KEY = process.env.OMDB_API_KEY || 'trilogy';

interface SyncOptions {
    limit?: number;
    dryRun: boolean;
    batchSize: number;
    delay: number;
    onlyMissing: boolean;
}

interface SyncResult {
    id: number;
    imdbId: string;
    title: string;
    oldVotes: number | null;
    newVotes: number | null;
    status: 'updated' | 'unchanged' | 'error' | 'not_found';
    error?: string;
}

interface OMDBResponse {
    Response: string;
    imdbVotes?: string;
    Title?: string;
    Error?: string;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOMDB(imdbId: string): Promise<OMDBResponse> {
    const url = `http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`;
    const response = await fetch(url);
    return response.json();
}

function parseVotes(votesStr: string | undefined): number | null {
    if (!votesStr || votesStr === 'N/A') return null;
    return parseInt(votesStr.replace(/,/g, ''), 10);
}

function parseArgs(): SyncOptions {
    const args = process.argv.slice(2);
    const options: SyncOptions = {
        dryRun: false,
        batchSize: 100,
        delay: 100, // OMDB tiene rate limit más estricto
        onlyMissing: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
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

async function syncImdbVotes(options: SyncOptions): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const whereClause: any = {
        imdbId: { not: null },
    };

    if (options.onlyMissing) {
        whereClause.imdbVotes = null;
    }

    const totalCount = await prisma.movie.count({ where: whereClause });
    const limit = options.limit || totalCount;

    console.log(`\n📽️  Sincronizando IMDB votes...`);
    console.log(`   Total con imdbId: ${totalCount}`);
    console.log(`   A procesar: ${Math.min(limit, totalCount)}`);

    // Obtener todos los IDs primero para evitar problemas de paginación
    // cuando se actualiza imdbVotesUpdatedAt (cambia el orden durante el proceso)
    const movieIds = await prisma.movie.findMany({
        where: whereClause,
        select: { id: true },
        orderBy: [
            { imdbVotesUpdatedAt: { sort: 'asc', nulls: 'first' } },
            { id: 'asc' }
        ],
        take: limit,
    });

    console.log(`   IDs obtenidos: ${movieIds.length}`);

    let processed = 0;

    for (let i = 0; i < movieIds.length; i += options.batchSize) {
        const batchIds = movieIds.slice(i, i + options.batchSize).map(m => m.id);

        const movies = await prisma.movie.findMany({
            where: { id: { in: batchIds } },
            select: {
                id: true,
                imdbId: true,
                title: true,
                imdbVotes: true,
            },
        });

        // Ordenar por el orden original de IDs
        const orderedMovies = batchIds.map(id => movies.find(m => m.id === id)!).filter(Boolean);

        for (const movie of orderedMovies) {
            const result: SyncResult = {
                id: movie.id,
                imdbId: movie.imdbId!,
                title: movie.title,
                oldVotes: movie.imdbVotes,
                newVotes: null,
                status: 'unchanged',
            };

            try {
                const omdbData = await fetchOMDB(movie.imdbId!);

                if (omdbData.Response === 'False') {
                    result.status = 'not_found';
                    result.error = omdbData.Error || 'No encontrado en OMDB';
                    // Marcar como procesado aunque no se encuentre
                    if (!options.dryRun) {
                        await prisma.movie.update({
                            where: { id: movie.id },
                            data: { imdbVotesUpdatedAt: new Date() },
                        });
                    }
                } else {
                    result.newVotes = parseVotes(omdbData.imdbVotes);

                    if (result.oldVotes !== result.newVotes) {
                        result.status = 'updated';
                    }
                    // Siempre actualizar imdbVotesUpdatedAt para marcar como procesado
                    if (!options.dryRun) {
                        await prisma.movie.update({
                            where: { id: movie.id },
                            data: {
                                imdbVotes: result.newVotes,
                                imdbVotesUpdatedAt: new Date(),
                            },
                        });
                    }
                }
            } catch (error: any) {
                result.status = 'error';
                result.error = error.message;
            }

            results.push(result);
            processed++;

            const statusIcon = result.status === 'updated' ? '✅' :
                              result.status === 'unchanged' ? '➖' :
                              result.status === 'not_found' ? '🔍' : '❌';
            const votesDisplay = result.newVotes !== null ? result.newVotes.toLocaleString() : 'N/A';
            console.log(`   ${statusIcon} [${processed}/${movieIds.length}] ${movie.title}: ${votesDisplay} votes`);

            await sleep(options.delay);
        }
    }

    return results;
}

function generateReport(results: SyncResult[], options: SyncOptions): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const prefix = options.dryRun ? 'dry-run-' : '';
    const reportsDir = path.join(__dirname, 'reports');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvPath = path.join(reportsDir, `${prefix}imdb-votes-sync-${timestamp}.csv`);
    const csvHeader = 'id,imdb_id,title,old_votes,new_votes,status,error\n';
    const csvRows = results.map(r =>
        `${r.id},${r.imdbId},"${r.title.replace(/"/g, '""')}",${r.oldVotes ?? ''},${r.newVotes ?? ''},${r.status},"${r.error || ''}"`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`\n📄 Reporte guardado en: ${csvPath}`);
}

function printSummary(results: SyncResult[], startTime: Date, endTime: Date): void {
    const stats = {
        updated: results.filter(r => r.status === 'updated').length,
        unchanged: results.filter(r => r.status === 'unchanged').length,
        errors: results.filter(r => r.status === 'error').length,
        notFound: results.filter(r => r.status === 'not_found').length,
    };

    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    console.log('\n' + '='.repeat(50));
    console.log('RESUMEN DE SINCRONIZACIÓN');
    console.log('='.repeat(50));

    console.log(`\n📽️  PELÍCULAS (${results.length} procesadas)`);
    console.log(`   ✅ Actualizadas: ${stats.updated}`);
    console.log(`   ➖ Sin cambios:  ${stats.unchanged}`);
    console.log(`   ❌ Errores:      ${stats.errors}`);
    console.log(`   🔍 No encontradas: ${stats.notFound}`);

    console.log(`\n⏱️  Duración: ${duration} segundos`);
    console.log('='.repeat(50));
}

async function main() {
    const options = parseArgs();
    const startTime = new Date();

    console.log('='.repeat(50));
    console.log('SINCRONIZACIÓN DE IMDB VOTES');
    console.log('='.repeat(50));
    console.log(`Límite: ${options.limit || 'sin límite'}`);
    console.log(`Dry-run: ${options.dryRun ? 'SÍ' : 'NO'}`);
    console.log(`Solo missing: ${options.onlyMissing ? 'SÍ' : 'NO'}`);
    console.log(`Batch size: ${options.batchSize}`);
    console.log(`Delay: ${options.delay}ms`);

    try {
        const results = await syncImdbVotes(options);
        const endTime = new Date();

        generateReport(results, options);
        printSummary(results, startTime, endTime);

    } catch (error) {
        console.error('Error durante la sincronización:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
