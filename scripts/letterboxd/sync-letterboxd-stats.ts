/**
 * Importar stats de Letterboxd a la DB desde CSV
 *
 * Lee el CSV generado por scrape-letterboxd-stats.ts y actualiza
 * los campos letterboxd_watches, letterboxd_lists, letterboxd_likes,
 * letterboxd_rating y popularity de la tabla movies.
 *
 * Resiliente a cortes del túnel SSH: pausa y espera reconexión.
 *
 * Uso:
 *   npx tsx scripts/letterboxd/sync-letterboxd-stats.ts [opciones]
 *
 * Opciones:
 *   --input FILE    Archivo CSV de entrada (default: scripts/letterboxd/letterboxd-stats.csv)
 *   --batch-size N  Tamaño del batch para updates (default: 100)
 *   --dry-run       Modo prueba, no escribe en DB
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {
    // dotenv no disponible
}

let prisma = new PrismaClient();

const DB_HOST = 'localhost';
const DB_PORT = 5433;
const TUNNEL_CHECK_INTERVAL = 5000;

interface Options {
    input: string;
    batchSize: number;
    dryRun: boolean;
}

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const options: Options = {
        input: path.join(__dirname, 'letterboxd-stats.csv'),
        batchSize: 100,
        dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
                options.input = args[++i];
                break;
            case '--batch-size':
                options.batchSize = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
        }
    }

    return options;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Túnel SSH ────────────────────────────────────────────────────────

function checkTunnel(): Promise<boolean> {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.connect(DB_PORT, DB_HOST);
    });
}

async function waitForTunnel(): Promise<void> {
    if (await checkTunnel()) return;
    console.log('\n⏸  Túnel SSH caído. Esperando reconexión...');
    while (true) {
        await sleep(TUNNEL_CHECK_INTERVAL);
        if (await checkTunnel()) {
            console.log('▶  Túnel reconectado. Continuando...\n');
            return;
        }
    }
}

async function reconnectPrisma(): Promise<void> {
    try { await prisma.$disconnect(); } catch { /* ignorar */ }
    prisma = new PrismaClient();
}

async function withDbRetry<T>(op: () => Promise<T>): Promise<T> {
    while (true) {
        try {
            return await op();
        } catch (error: any) {
            const msg = error.message || '';
            const isConn = msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') ||
                msg.includes('ETIMEDOUT') || msg.includes('connection closed') ||
                msg.includes('Connection lost') || msg.includes('Can\'t reach database server') ||
                msg.includes('socket hang up');
            if (!isConn) throw error;
            await waitForTunnel();
            await reconnectPrisma();
        }
    }
}

// ── CSV parsing ──────────────────────────────────────────────────────

interface CsvRow {
    id: number;
    tmdbId: number;
    slug: string;
    watches: number | null;
    lists: number | null;
    likes: number | null;
    rating: number | null;
    score: number | null;
    title: string;
}

function parseCsv(filePath: string): CsvRow[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const rows: CsvRow[] = [];

    // Header: id,tmdb_id,slug,watches,lists,likes,rating,score,title
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCsvLine(line);
        const id = parseInt(parts[0], 10);
        const tmdbId = parseInt(parts[1], 10);
        const slug = parts[2] || '';

        if (isNaN(id) || isNaN(tmdbId)) continue;

        const watches = parseOptionalInt(parts[3]);
        const lists = parseOptionalInt(parts[4]);
        const likes = parseOptionalInt(parts[5]);
        const rating = parseOptionalFloat(parts[6]);
        const score = parseOptionalFloat(parts[7]);
        const title = parts[8] || '';

        // Saltear filas sin ningún dato útil
        if (watches === null && lists === null && likes === null && rating === null) continue;

        rows.push({ id, tmdbId, slug, watches, lists, likes, rating, score, title });
    }

    return rows;
}

function parseOptionalInt(val: string | undefined): number | null {
    if (!val || val === '') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
}

function parseOptionalFloat(val: string | undefined): number | null {
    if (!val || val === '') return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function parseCsvLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                parts.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    parts.push(current);
    return parts;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
    const options = parseArgs();
    const startTime = Date.now();

    console.log('='.repeat(55));
    console.log('IMPORTAR STATS DE LETTERBOXD A DB');
    console.log('='.repeat(55));
    console.log(`Archivo: ${options.input}`);
    console.log(`Batch size: ${options.batchSize}`);
    console.log(`Dry-run: ${options.dryRun ? 'SÍ' : 'NO'}`);
    console.log('');

    if (!fs.existsSync(options.input)) {
        console.error(`Error: no se encontró el archivo ${options.input}`);
        console.error('Ejecutá primero: npx tsx scripts/letterboxd/scrape-letterboxd-stats.ts');
        process.exit(1);
    }

    const rows = parseCsv(options.input);
    console.log(`Filas en CSV con datos: ${rows.length.toLocaleString()}`);

    if (rows.length === 0) {
        console.log('Nada que importar.');
        return;
    }

    // Mostrar ejemplos
    console.log('\nEjemplos:');
    for (const row of rows.slice(0, 5)) {
        const w = row.watches?.toLocaleString() ?? '—';
        const l = row.lists?.toLocaleString() ?? '—';
        const lk = row.likes?.toLocaleString() ?? '—';
        const r = row.rating?.toFixed(2) ?? '—';
        const s = row.score?.toFixed(4) ?? '—';
        console.log(`  ${row.title} — watches=${w} lists=${l} likes=${lk} rating=${r} score=${s}`);
    }
    if (rows.length > 5) {
        console.log(`  ... y ${rows.length - 5} más`);
    }

    if (options.dryRun) {
        console.log('\n[DRY RUN] No se actualizó la base de datos.');
        return;
    }

    // Esperar túnel
    await waitForTunnel();

    // Escribir en batches
    console.log(`\nActualizando DB en batches de ${options.batchSize}...`);
    const now = new Date();

    for (let i = 0; i < rows.length; i += options.batchSize) {
        const batch = rows.slice(i, i + options.batchSize);

        await withDbRetry(() =>
            prisma.$transaction(
                batch.map(row =>
                    prisma.movie.update({
                        where: { id: row.id },
                        data: {
                            letterboxdWatches: row.watches,
                            letterboxdLists: row.lists,
                            letterboxdLikes: row.likes,
                            letterboxdRating: row.rating,
                            popularity: row.score,
                            popularityUpdatedAt: now,
                        },
                    })
                )
            )
        );

        const count = Math.min(i + options.batchSize, rows.length);
        console.log(`  [${count}/${rows.length}] actualizados`);
    }

    console.log('\nDB actualizada exitosamente.');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Tiempo total: ${elapsed}s`);

    await prisma.$disconnect();
}

main().catch(async error => {
    console.error('\nError fatal:', error);
    try { await prisma.$disconnect(); } catch { /* ignorar */ }
    process.exit(1);
});
