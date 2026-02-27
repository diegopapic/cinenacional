/**
 * Script: Actualización diaria de popularidad desde Letterboxd
 *
 * Diseñado para correr diariamente vía crontab. Cada día procesa
 * un lote de películas (total con tmdb_id / 30) para que todas
 * las películas se actualicen en un ciclo de ~30 días.
 *
 * Proceso:
 *   1. Cuenta películas con tmdb_id
 *   2. Calcula tamaño del lote: total / 30
 *   3. Toma las N más antiguas por popularity_updated_at (NULLs primero)
 *   4. Scrapea stats de Letterboxd (watches, lists, likes, rating)
 *   5. Calcula score de popularidad
 *   6. Actualiza la DB directamente
 *
 * Uso:
 *   npx tsx scripts/letterboxd/update-popularity-daily.ts [opciones]
 *
 * Opciones:
 *   --delay N       Delay entre requests en ms (default: 1500)
 *   --limit N       Override manual del tamaño del lote
 *   --dry-run       No escribir en DB, solo mostrar lo que haría
 */

import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import * as path from 'path';

try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch { /* dotenv no disponible */ }

// ── Constantes ───────────────────────────────────────────────────────

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CYCLE_DAYS = 30;

// ── Tipos ────────────────────────────────────────────────────────────

interface Options {
    delay: number;
    limit: number | null;
    dryRun: boolean;
}

interface FilmStats {
    watches: number | null;
    lists: number | null;
    likes: number | null;
    rating: number | null;
}

// ── CLI ──────────────────────────────────────────────────────────────

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const options: Options = {
        delay: 1500,
        limit: null,
        dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--delay':
                options.delay = parseInt(args[++i], 10);
                break;
            case '--limit':
                options.limit = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
        }
    }

    return options;
}

// ── Utilidades ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function elapsed(startTime: number): string {
    const ms = Date.now() - startTime;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseNum(raw: string): number | null {
    const n = parseInt(raw.replace(/,/g, ''), 10);
    return isNaN(n) ? null : n;
}

// ── HTTP ─────────────────────────────────────────────────────────────

function curlGet(url: string, followRedirects: boolean): string {
    const args = ['-s', '-D', '-'];
    if (followRedirects) args.push('-L');
    args.push('-H', `User-Agent: ${USER_AGENT}`);
    args.push('-H', 'Accept-Language: en-US,en;q=0.9');
    args.push('-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    args.push(url);
    return execFileSync('curl', args, { encoding: 'utf-8', timeout: 20000 });
}

function extractBody(raw: string): string {
    const sep = raw.indexOf('\r\n\r\n');
    return sep > -1 ? raw.substring(sep + 4) : raw;
}

// ── Resolución de slug ───────────────────────────────────────────────

function resolveLetterboxdSlug(tmdbId: number): string | null {
    const raw = curlGet(`https://letterboxd.com/tmdb/${tmdbId}`, true);
    const locations = [...raw.matchAll(/^location: (.+)$/gmi)];
    for (let i = locations.length - 1; i >= 0; i--) {
        const match = locations[i][1].match(/\/film\/([^/\r\n]+)/);
        if (match) return match[1];
    }
    return null;
}

// ── Scraping de stats ────────────────────────────────────────────────

function scrapeStatsEndpoint(slug: string): Pick<FilmStats, 'watches' | 'lists' | 'likes'> {
    const raw = curlGet(`https://letterboxd.com/csi/film/${slug}/stats/`, false);
    const body = extractBody(raw);

    const watchPatterns = [
        /aria-label="Watched by ([\d,]+)(?:&nbsp;|\s)/i,
        /Watched by\s+([\d,]+)/i,
    ];
    const listPatterns = [
        /aria-label="Appears in ([\d,]+)(?:&nbsp;|\s)/i,
        /aria-label="Appeared in ([\d,]+)(?:&nbsp;|\s)/i,
        /Appears? in\s+([\d,]+)/i,
    ];
    const fanPatterns = [
        /aria-label="Liked by ([\d,]+)(?:&nbsp;|\s)/i,
        /Liked by\s+([\d,]+)/i,
    ];

    function firstMatch(patterns: RegExp[], text: string): number | null {
        for (const p of patterns) {
            const m = text.match(p);
            if (m) {
                const n = parseNum(m[1]);
                if (n !== null) return n;
            }
        }
        return null;
    }

    return {
        watches: firstMatch(watchPatterns, body),
        lists: firstMatch(listPatterns, body),
        likes: firstMatch(fanPatterns, body),
    };
}

function scrapeRating(slug: string): number | null {
    const raw = curlGet(`https://letterboxd.com/film/${slug}/`, false);
    const body = extractBody(raw);

    const twitterMatch = body.match(/<meta\s+name="twitter:data2"\s+content="([\d.]+)\s+out\s+of\s+5"/i)
                      ?? body.match(/content="([\d.]+)\s+out\s+of\s+5"/i);
    if (twitterMatch) {
        const v = parseFloat(twitterMatch[1]);
        if (!isNaN(v) && v >= 0 && v <= 5) return v;
    }

    const jsonLdMatch = body.match(/"ratingValue"\s*:\s*([\d.]+)/);
    if (jsonLdMatch) {
        const v = parseFloat(jsonLdMatch[1]);
        if (!isNaN(v) && v >= 0 && v <= 5) return v;
    }

    const spanMatch = body.match(/class="[^"]*average-rating[^"]*"[^>]*>[\s\S]*?>([\d.]+)</);
    if (spanMatch) {
        const v = parseFloat(spanMatch[1]);
        if (!isNaN(v) && v >= 0 && v <= 5) return v;
    }

    return null;
}

async function scrapeFilm(slug: string, delay: number): Promise<FilmStats> {
    const statsRaw = scrapeStatsEndpoint(slug);
    await sleep(delay);
    const rating = scrapeRating(slug);

    return {
        watches: statsRaw.watches,
        lists: statsRaw.lists,
        likes: statsRaw.likes,
        rating,
    };
}

// ── Fórmula de popularidad ───────────────────────────────────────────
//
//   P = (0.5·log10(V+1) + 0.3·log10(L+1) + 0.2·log10(F+1)) × M(R)
//   M(R) = 0.5 + R/10
//

function calcScore(stats: FilmStats): number | null {
    const { watches, lists, likes, rating } = stats;
    if (watches === null && lists === null && likes === null) return null;

    const V = watches ?? 0;
    const L = lists ?? 0;
    const F = likes ?? 0;
    const R = rating ?? 2.5;

    const volumeScore =
        0.5 * Math.log10(V + 1) +
        0.3 * Math.log10(L + 1) +
        0.2 * Math.log10(F + 1);

    const multiplier = 0.5 + R / 10;

    return Math.round(volumeScore * multiplier * 10000) / 10000;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const options = parseArgs();
    const startTime = Date.now();
    const prisma = new PrismaClient();

    console.log('='.repeat(55));
    console.log('ACTUALIZACIÓN DIARIA DE POPULARIDAD');
    console.log('='.repeat(55));

    try {
        // 1. Contar películas con tmdb_id
        const totalWithTmdb = await prisma.movie.count({
            where: { tmdbId: { not: null } },
        });

        if (totalWithTmdb === 0) {
            console.log('No hay películas con tmdb_id.');
            return;
        }

        // 2. Calcular tamaño del lote
        const batchSize = options.limit ?? Math.ceil(totalWithTmdb / CYCLE_DAYS);

        console.log(`Películas con tmdb_id: ${totalWithTmdb.toLocaleString()}`);
        console.log(`Ciclo:                 ${CYCLE_DAYS} días`);
        console.log(`Lote de hoy:           ${batchSize.toLocaleString()} películas`);
        console.log(`Delay:                 ${options.delay}ms`);
        if (options.dryRun) console.log(`Modo:                  DRY RUN`);
        console.log('');

        // 3. Obtener las más antiguas por popularity_updated_at (NULLs primero)
        const movies = await prisma.movie.findMany({
            where: { tmdbId: { not: null } },
            select: { id: true, tmdbId: true, title: true, year: true },
            orderBy: [
                { popularityUpdatedAt: { sort: 'asc', nulls: 'first' } },
            ],
            take: batchSize,
        });

        console.log(`Películas a procesar: ${movies.length}\n`);

        // 4. Procesar cada película
        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            const label = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
            const prefix = `[${i + 1}/${movies.length}] [${elapsed(startTime)}]`;

            // Resolver slug
            let slug: string | null = null;
            try {
                slug = resolveLetterboxdSlug(movie.tmdbId!);
            } catch (err: any) {
                console.log(`${prefix}  ✗ ${label} — Error resolviendo slug: ${err.message}`);
                failed++;
                if (i < movies.length - 1) await sleep(options.delay);
                continue;
            }

            if (!slug) {
                console.log(`${prefix}  ✗ ${label} — No encontrada en Letterboxd`);
                // Marcar como procesada para no reintentar inmediatamente
                if (!options.dryRun) {
                    await prisma.movie.update({
                        where: { id: movie.id },
                        data: { popularityUpdatedAt: new Date() },
                    });
                }
                skipped++;
                if (i < movies.length - 1) await sleep(options.delay);
                continue;
            }

            await sleep(options.delay);

            // Scrapear stats
            let stats: FilmStats = { watches: null, lists: null, likes: null, rating: null };
            try {
                stats = await scrapeFilm(slug, options.delay);
            } catch (err: any) {
                console.log(`${prefix}  ✗ ${label} — Error scrapeando: ${err.message}`);
                failed++;
                if (i < movies.length - 1) await sleep(options.delay);
                continue;
            }

            if (stats.watches === null) {
                console.log(`${prefix}  ✗ ${label} — No se pudo extraer stats (slug: ${slug})`);
                failed++;
                if (i < movies.length - 1) await sleep(options.delay);
                continue;
            }

            const score = calcScore(stats);

            // Log
            const w = stats.watches?.toLocaleString() ?? '—';
            const l = stats.lists?.toLocaleString() ?? '—';
            const f = stats.likes?.toLocaleString() ?? '—';
            const r = stats.rating?.toFixed(2) ?? '—';
            const s = score?.toFixed(4) ?? '—';

            console.log(`${prefix}  ✓ ${label}`);
            console.log(`           watches=${w}  lists=${l}  likes=${f}  rating=${r}  score=${s}`);

            // 5. Actualizar DB
            if (!options.dryRun) {
                await prisma.movie.update({
                    where: { id: movie.id },
                    data: {
                        letterboxdWatches: stats.watches,
                        letterboxdLists: stats.lists,
                        letterboxdLikes: stats.likes,
                        letterboxdRating: stats.rating,
                        popularity: score,
                        popularityUpdatedAt: new Date(),
                    },
                });
            }

            success++;

            if (i < movies.length - 1) {
                await sleep(options.delay);
            }
        }

        // ── Resumen ──────────────────────────────────────────────────
        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n' + '─'.repeat(55));
        console.log(`Procesadas:         ${movies.length}`);
        console.log(`Actualizadas:       ${success}`);
        console.log(`No en Letterboxd:   ${skipped}`);
        console.log(`Fallidas:           ${failed}`);
        console.log(`Tiempo total:       ${totalElapsed}s`);
        if (options.dryRun) console.log(`\n[DRY RUN] No se actualizó la base de datos.`);

    } finally {
        await prisma.$disconnect();
    }
}

main().catch(async error => {
    console.error('\nError fatal:', error);
    process.exit(1);
});
