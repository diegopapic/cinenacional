/**
 * Script para importar numVotes desde el dataset gratuito de IMDB
 *
 * Descarga title.ratings.tsv.gz de datasets.imdb.com y actualiza imdb_votes
 * para todas las películas que tengan imdb_id.
 *
 * Uso:
 *   npx tsx scripts/tmdb/import-imdb-votes-dataset.ts [opciones]
 *
 * Opciones:
 *   --dry-run       Modo prueba, no escribe en DB
 *   --batch-size N  Tamaño del batch para updates (default: 500)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';

try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {
    // dotenv no disponible
}

const prisma = new PrismaClient();

const DATASET_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const TEMP_DIR = path.join(__dirname, 'temp');
const GZ_PATH = path.join(TEMP_DIR, 'title.ratings.tsv.gz');
const TSV_PATH = path.join(TEMP_DIR, 'title.ratings.tsv');

interface Options {
    dryRun: boolean;
    batchSize: number;
}

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const options: Options = {
        dryRun: false,
        batchSize: 500,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i], 10);
                break;
        }
    }

    return options;
}

async function downloadDataset(): Promise<void> {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    console.log(`Descargando ${DATASET_URL}...`);
    const response = await fetch(DATASET_URL);
    if (!response.ok) {
        throw new Error(`Error descargando dataset: ${response.status} ${response.statusText}`);
    }

    const fileStream = createWriteStream(GZ_PATH);
    await pipeline(Readable.fromWeb(response.body as any), fileStream);

    const stats = fs.statSync(GZ_PATH);
    console.log(`Descargado: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

async function decompressDataset(): Promise<void> {
    console.log('Descomprimiendo...');
    const input = fs.createReadStream(GZ_PATH);
    const output = createWriteStream(TSV_PATH);
    const gunzip = zlib.createGunzip();
    await pipeline(input, gunzip, output);

    const stats = fs.statSync(TSV_PATH);
    console.log(`Descomprimido: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

function parseRatingsDataset(): Map<string, number> {
    console.log('Parseando dataset...');
    const votesMap = new Map<string, number>();

    const content = fs.readFileSync(TSV_PATH, 'utf-8');
    const lines = content.split('\n');

    // Skip header: tconst	averageRating	numVotes
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const tabIndex1 = line.indexOf('\t');
        const tabIndex2 = line.indexOf('\t', tabIndex1 + 1);

        const tconst = line.substring(0, tabIndex1);
        const numVotes = parseInt(line.substring(tabIndex2 + 1), 10);

        if (tconst && !isNaN(numVotes)) {
            votesMap.set(tconst, numVotes);
        }
    }

    console.log(`Dataset: ${votesMap.size.toLocaleString()} títulos con ratings`);
    return votesMap;
}

async function updateMovies(votesMap: Map<string, number>, options: Options): Promise<void> {
    // Obtener todas las películas con imdbId
    const movies = await prisma.movie.findMany({
        where: { imdbId: { not: null } },
        select: { id: true, imdbId: true, title: true, imdbVotes: true },
    });

    console.log(`\nPelículas con imdbId: ${movies.length.toLocaleString()}`);

    let matched = 0;
    let updated = 0;
    let unchanged = 0;
    let notInDataset = 0;

    const updates: { id: number; imdbVotes: number }[] = [];

    for (const movie of movies) {
        const numVotes = votesMap.get(movie.imdbId!);

        if (numVotes === undefined) {
            notInDataset++;
            continue;
        }

        matched++;

        if (movie.imdbVotes === numVotes) {
            unchanged++;
        } else {
            updated++;
            updates.push({ id: movie.id, imdbVotes: numVotes });
        }
    }

    console.log(`Encontrados en dataset: ${matched.toLocaleString()}`);
    console.log(`A actualizar: ${updated.toLocaleString()}`);
    console.log(`Sin cambios: ${unchanged.toLocaleString()}`);
    console.log(`No encontrados en dataset: ${notInDataset.toLocaleString()}`);

    if (options.dryRun) {
        console.log('\n[DRY RUN] No se actualizó la base de datos.');

        // Mostrar algunos ejemplos
        if (updates.length > 0) {
            console.log('\nEjemplos de actualizaciones:');
            const examples = updates.slice(0, 10);
            for (const u of examples) {
                const movie = movies.find(m => m.id === u.id)!;
                console.log(`  ${movie.title}: ${movie.imdbVotes ?? 'null'} -> ${u.imdbVotes}`);
            }
            if (updates.length > 10) {
                console.log(`  ... y ${updates.length - 10} más`);
            }
        }
        return;
    }

    // Actualizar en batches usando transacciones
    console.log(`\nActualizando DB en batches de ${options.batchSize}...`);
    const now = new Date();

    for (let i = 0; i < updates.length; i += options.batchSize) {
        const batch = updates.slice(i, i + options.batchSize);

        await prisma.$transaction(
            batch.map(u =>
                prisma.movie.update({
                    where: { id: u.id },
                    data: {
                        imdbVotes: u.imdbVotes,
                        imdbVotesUpdatedAt: now,
                    },
                })
            )
        );

        const progress = Math.min(i + options.batchSize, updates.length);
        console.log(`  [${progress}/${updates.length}] actualizados`);
    }

    console.log(`\nDB actualizada exitosamente.`);
}

function cleanup(): void {
    if (fs.existsSync(GZ_PATH)) fs.unlinkSync(GZ_PATH);
    if (fs.existsSync(TSV_PATH)) fs.unlinkSync(TSV_PATH);
    if (fs.existsSync(TEMP_DIR)) {
        try { fs.rmdirSync(TEMP_DIR); } catch { /* no vacío */ }
    }
    console.log('Archivos temporales eliminados.');
}

async function main() {
    const options = parseArgs();
    const startTime = Date.now();

    console.log('='.repeat(50));
    console.log('IMPORTAR IMDB VOTES DESDE DATASET');
    console.log('='.repeat(50));
    console.log(`Dry-run: ${options.dryRun ? 'SÍ' : 'NO'}`);
    console.log(`Batch size: ${options.batchSize}`);

    try {
        await downloadDataset();
        await decompressDataset();
        const votesMap = parseRatingsDataset();
        await updateMovies(votesMap, options);
    } catch (error) {
        console.error('\nError:', error);
        process.exit(1);
    } finally {
        cleanup();
        await prisma.$disconnect();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nTiempo total: ${elapsed}s`);
}

main();
