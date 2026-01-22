/**
 * Script para descubrir películas argentinas en TMDB que no están en CineNacional
 * 
 * Uso:
 *   npx tsx discover-argentina.ts                # Genera reporte completo
 *   npx tsx discover-argentina.ts --year 2024   # Solo películas de un año
 *   npx tsx discover-argentina.ts --from 2020   # Desde un año en adelante
 */

import { getMovieDetails, testConnection } from './tmdb-client';
import { 
  getPool, 
  closePool, 
  normalizeText,
  stringSimilarity,
  saveToCSV, 
  formatDuration,
  progressBar,
  log 
} from './utils';
import config from './config';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBDiscoverMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

interface DiscoverResult {
  page: number;
  results: TMDBDiscoverMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBReleaseDate {
  certification: string;
  iso_639_1: string;
  note: string;
  release_date: string;
  type: number; // 1=Premiere, 2=Theatrical limited, 3=Theatrical, 4=Digital, 5=Physical, 6=TV
}

interface TMDBReleaseDatesResult {
  iso_3166_1: string;
  release_dates: TMDBReleaseDate[];
}

interface PremiereInfo {
  date: string;
  country: string;
  note: string;
}

/**
 * Obtener información de la primera release de una película
 */
async function getPremiereInfo(tmdbId: number): Promise<PremiereInfo> {
  const url = `${TMDB_BASE_URL}/movie/${tmdbId}/release_dates`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.tmdbAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return { date: '', country: '', note: '' };
    }
    
    const data: { results: TMDBReleaseDatesResult[] } = await response.json();
    
    // Recolectar todas las releases
    const allReleases: Array<{ date: string; country: string; note: string }> = [];
    
    for (const countryResult of data.results) {
      for (const release of countryResult.release_dates) {
        if (release.release_date) {
          allReleases.push({
            date: release.release_date.split('T')[0],
            country: countryResult.iso_3166_1,
            note: release.note || '',
          });
        }
      }
    }
    
    if (allReleases.length === 0) {
      return { date: '', country: '', note: '' };
    }
    
    // Ordenar por fecha
    allReleases.sort((a, b) => a.date.localeCompare(b.date));
    
    // Buscar la primera release con nota
    const firstWithNote = allReleases.find(r => r.note);
    if (firstWithNote) {
      return firstWithNote;
    }
    
    // Si ninguna tiene nota, devolver la primera
    return allReleases[0];
    
  } catch (error) {
    return { date: '', country: '', note: '' };
  }
}

interface MovieComparison {
  tmdb_id: number;
  tmdb_title: string;
  tmdb_original_title: string;
  tmdb_year: number | null;
  tmdb_release_date: string;
  premiere_date: string;
  premiere_country: string;
  premiere_note: string;
  tmdb_overview: string;
  tmdb_popularity: number;
  tmdb_vote_average: number;
  tmdb_vote_count: number;
  status: 'missing' | 'exists_by_tmdb' | 'exists_by_title' | 'possible_match';
  local_id: number | null;
  local_title: string | null;
  local_year: number | null;
  match_reason: string;
}

/**
 * Descubrir películas argentinas en TMDB
 */
async function discoverArgentineMovies(year?: number, fromYear?: number): Promise<TMDBDiscoverMovie[]> {
  const allMovies: TMDBDiscoverMovie[] = [];
  let page = 1;
  let totalPages = 1;
  
  log('Descubriendo películas argentinas en TMDB...', 'info');
  
  while (page <= totalPages && page <= 500) { // TMDB limita a 500 páginas
    const params = new URLSearchParams({
      with_origin_country: 'AR',
      language: 'es-AR',
      sort_by: 'primary_release_date.desc',
      page: page.toString(),
      include_adult: 'true',
      include_video: 'false',
    });

    // Filtros de año
    if (year) {
      params.set('primary_release_year', year.toString());
    } else if (fromYear) {
      params.set('primary_release_date.gte', `${fromYear}-01-01`);
    }

    const url = `${TMDB_BASE_URL}/discover/movie?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.tmdbAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`TMDB error: ${response.status}`);
      }
      
      const data: DiscoverResult = await response.json();
      
      if (page === 1) {
        totalPages = Math.min(data.total_pages, 500);
        log(`Total en TMDB: ${data.total_results} películas (${totalPages} páginas)`, 'info');
      }
      
      allMovies.push(...data.results);
      
      process.stdout.write(`\r${progressBar(page, totalPages)} - ${allMovies.length} películas...`);
      
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      log(`Error en página ${page}: ${error}`, 'error');
      break;
    }
  }
  
  console.log('\n');
  return allMovies;
}

/**
 * Obtener películas locales para comparación
 */
async function getLocalMovies(): Promise<Map<number, { id: number; title: string; year: number | null; tmdb_id: number | null }>> {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT id, title, year, tmdb_id
    FROM movies
    ORDER BY year DESC NULLS LAST
  `);
  
  // Crear mapa por tmdb_id para búsqueda rápida
  const moviesByTmdbId = new Map<number, { id: number; title: string; year: number | null; tmdb_id: number | null }>();
  
  for (const row of result.rows) {
    if (row.tmdb_id) {
      moviesByTmdbId.set(row.tmdb_id, row);
    }
  }
  
  return moviesByTmdbId;
}

/**
 * Obtener todas las películas locales para búsqueda por título
 */
async function getAllLocalMovies(): Promise<Array<{ id: number; title: string; year: number | null; tmdb_id: number | null }>> {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT id, title, year, tmdb_id
    FROM movies
    ORDER BY year DESC NULLS LAST
  `);
  
  return result.rows;
}

/**
 * Buscar película local por título y año
 */
function findLocalByTitleYear(
  tmdbTitle: string, 
  tmdbOriginalTitle: string,
  tmdbYear: number | null,
  localMovies: Array<{ id: number; title: string; year: number | null; tmdb_id: number | null }>
): { movie: typeof localMovies[0] | null; similarity: number } {
  
  let bestMatch: typeof localMovies[0] | null = null;
  let bestSimilarity = 0;
  
  for (const local of localMovies) {
    // Comparar títulos
    const sim1 = stringSimilarity(tmdbTitle, local.title);
    const sim2 = stringSimilarity(tmdbOriginalTitle, local.title);
    const titleSimilarity = Math.max(sim1, sim2);
    
    if (titleSimilarity < 80) continue;
    
    // Verificar año si ambos tienen
    if (tmdbYear && local.year) {
      const yearDiff = Math.abs(tmdbYear - local.year);
      if (yearDiff > 1) continue; // Más de 1 año de diferencia, descartar
    }
    
    if (titleSimilarity > bestSimilarity) {
      bestSimilarity = titleSimilarity;
      bestMatch = local;
    }
  }
  
  return { movie: bestMatch, similarity: bestSimilarity };
}

/**
 * Comparar películas de TMDB con locales
 */
async function compareMovies(tmdbMovies: TMDBDiscoverMovie[]): Promise<MovieComparison[]> {
  log('Comparando con base de datos local...', 'info');
  
  const localByTmdbId = await getLocalMovies();
  const allLocalMovies = await getAllLocalMovies();
  
  log(`Películas locales: ${allLocalMovies.length}`, 'info');
  log(`Películas locales con tmdb_id: ${localByTmdbId.size}`, 'info');
  
  const results: MovieComparison[] = [];
  
  for (let i = 0; i < tmdbMovies.length; i++) {
    const tmdb = tmdbMovies[i];
    
    process.stdout.write(`\r${progressBar(i + 1, tmdbMovies.length)} - ${tmdb.title.slice(0, 30)}...`);
    
    const tmdbYear = tmdb.release_date ? parseInt(tmdb.release_date.split('-')[0]) : null;
    
    // Obtener info de premiere
    const premiere = await getPremiereInfo(tmdb.id);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const comparison: MovieComparison = {
      tmdb_id: tmdb.id,
      tmdb_title: tmdb.title,
      tmdb_original_title: tmdb.original_title,
      tmdb_year: tmdbYear,
      tmdb_release_date: tmdb.release_date || '',
      premiere_date: premiere.date,
      premiere_country: premiere.country,
      premiere_note: premiere.note,
      tmdb_overview: tmdb.overview?.slice(0, 200) || '',
      tmdb_popularity: tmdb.popularity,
      tmdb_vote_average: tmdb.vote_average,
      tmdb_vote_count: tmdb.vote_count,
      status: 'missing',
      local_id: null,
      local_title: null,
      local_year: null,
      match_reason: '',
    };
    
    // 1. Buscar por tmdb_id
    const localByTmdb = localByTmdbId.get(tmdb.id);
    if (localByTmdb) {
      comparison.status = 'exists_by_tmdb';
      comparison.local_id = localByTmdb.id;
      comparison.local_title = localByTmdb.title;
      comparison.local_year = localByTmdb.year;
      comparison.match_reason = 'Match por tmdb_id';
      results.push(comparison);
      continue;
    }
    
    // 2. Buscar por título + año
    const { movie: localByTitle, similarity } = findLocalByTitleYear(
      tmdb.title,
      tmdb.original_title,
      tmdbYear,
      allLocalMovies
    );
    
    if (localByTitle) {
      if (similarity >= 95) {
        comparison.status = 'exists_by_title';
        comparison.match_reason = `Match por título (${similarity}%)`;
      } else {
        comparison.status = 'possible_match';
        comparison.match_reason = `Posible match (${similarity}%)`;
      }
      comparison.local_id = localByTitle.id;
      comparison.local_title = localByTitle.title;
      comparison.local_year = localByTitle.year;
    } else {
      comparison.match_reason = 'No encontrada en CineNacional';
    }
    
    results.push(comparison);
  }
  
  console.log('\n');
  return results;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  const yearArg = args.find(a => a.startsWith('--year'));
  const year = yearArg ? parseInt(yearArg.split('=')[1] || args[args.indexOf('--year') + 1]) : undefined;
  
  const fromArg = args.find(a => a.startsWith('--from'));
  const fromYear = fromArg ? parseInt(fromArg.split('=')[1] || args[args.indexOf('--from') + 1]) : undefined;
  
  console.log('\n🇦🇷 TMDB Argentina Discovery Script');
  console.log('====================================\n');
  
  if (year) {
    log(`Filtrando por año: ${year}`, 'info');
  } else if (fromYear) {
    log(`Filtrando desde año: ${fromYear}`, 'info');
  }
  
  // Test conexión a TMDB
  log('Probando conexión a TMDB...', 'info');
  const connected = await testConnection();
  if (!connected) {
    log('No se pudo conectar a TMDB', 'error');
    process.exit(1);
  }
  log('Conexión a TMDB exitosa', 'success');
  
  const startTime = Date.now();
  
  // Descubrir películas argentinas
  const tmdbMovies = await discoverArgentineMovies(year, fromYear);
  log(`Encontradas ${tmdbMovies.length} películas argentinas en TMDB`, 'success');
  
  // Comparar con BD local
  const comparisons = await compareMovies(tmdbMovies);
  
  // Estadísticas
  const stats = {
    total: comparisons.length,
    existsByTmdb: comparisons.filter(c => c.status === 'exists_by_tmdb').length,
    existsByTitle: comparisons.filter(c => c.status === 'exists_by_title').length,
    possibleMatch: comparisons.filter(c => c.status === 'possible_match').length,
    missing: comparisons.filter(c => c.status === 'missing').length,
    missingWithNote: comparisons.filter(c => c.status === 'missing' && c.premiere_note).length,
  };
  
  const elapsed = Date.now() - startTime;
  
  // Guardar CSVs
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  
  // CSV completo
  saveToCSV(comparisons, `argentina-discovery-${timestamp}.csv`, [
    'tmdb_id', 'tmdb_title', 'tmdb_original_title', 'tmdb_year', 'tmdb_release_date',
    'premiere_date', 'premiere_country', 'premiere_note',
    'tmdb_overview', 'tmdb_popularity', 'tmdb_vote_average', 'tmdb_vote_count',
    'status', 'local_id', 'local_title', 'local_year', 'match_reason'
  ]);
  
  // CSV solo faltantes (con premiere_note)
  const missing = comparisons.filter(c => c.status === 'missing' && c.premiere_note);
  if (missing.length > 0) {
    saveToCSV(missing, `argentina-missing-${timestamp}.csv`, [
      'tmdb_id', 'tmdb_title', 'tmdb_original_title', 'tmdb_year', 'tmdb_release_date',
      'premiere_date', 'premiere_country', 'premiere_note',
      'tmdb_overview', 'tmdb_popularity', 'tmdb_vote_average', 'tmdb_vote_count'
    ]);
  }
  
  // CSV posibles matches (para revisar)
  const possibleMatches = comparisons.filter(c => c.status === 'possible_match');
  if (possibleMatches.length > 0) {
    saveToCSV(possibleMatches, `argentina-possible-matches-${timestamp}.csv`, [
      'tmdb_id', 'tmdb_title', 'tmdb_year', 'tmdb_release_date', 'premiere_date', 'premiere_country', 'premiere_note',
      'local_id', 'local_title', 'local_year', 'match_reason'
    ]);
  }
  
  // Resumen
  console.log('\n📊 Resumen:');
  console.log(`   Total en TMDB:         ${stats.total}`);
  console.log(`   Ya existen (tmdb_id):  ${stats.existsByTmdb}`);
  console.log(`   Ya existen (título):   ${stats.existsByTitle}`);
  console.log(`   Posibles matches:      ${stats.possibleMatch}`);
  console.log(`   Faltan en CineNacional: ${stats.missing}`);
  console.log(`   ❌ Faltan (con festival): ${stats.missingWithNote}`);
  console.log(`   Tiempo:                ${formatDuration(elapsed)}`);
  
  await closePool();
  console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});