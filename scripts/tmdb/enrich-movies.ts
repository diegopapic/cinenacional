/**
 * Script para enriquecer películas con IMDB ID desde TMDB
 * 
 * Uso:
 *   npx ts-node enrich-movies.ts --dry-run          # Solo genera CSV
 *   npx ts-node enrich-movies.ts --apply            # Aplica cambios a la BD
 *   npx ts-node enrich-movies.ts --apply-csv        # Aplica desde CSV revisado
 *   npx ts-node enrich-movies.ts --limit 100        # Procesar solo 100 películas
 *   npx ts-node enrich-movies.ts --offset 500       # Empezar desde la 501
 */

import { searchMovies, getMovieDetails, testConnection, TMDBMovieDetails } from './tmdb-client';
import { 
  getPool, 
  closePool, 
  normalizeText, 
  stringSimilarity,
  saveToCSV, 
  loadFromCSV,
  formatDuration,
  progressBar,
  log 
} from './utils';
import config from './config';

// Tipos
interface LocalMovie {
  id: number;
  title: string;
  year: number | null;
  duration: number | null;
  imdb_id: string | null;
  director_names: string | null; // "Nombre1, Nombre2"
}

interface MatchResult {
  local_id: number;
  local_title: string;
  local_year: number | null;
  local_director: string | null;
  tmdb_id: number | null;
  tmdb_title: string | null;
  tmdb_year: number | null;
  tmdb_director: string | null;
  imdb_id: string | null;
  match_score: number;
  match_status: 'auto_accept' | 'review' | 'no_match' | 'multiple';
  match_reason: string;
}

/**
 * Obtener películas sin IMDB ID de la base de datos
 */
async function getMoviesWithoutImdbId(limit?: number, offset?: number): Promise<LocalMovie[]> {
  const pool = getPool();
  
  const query = `
    SELECT 
      m.id,
      m.title,
      m.year,
      m.duration,
      m.imdb_id,
      STRING_AGG(CONCAT(p.first_name, ' ', p.last_name), ', ') as director_names
    FROM movies m
    LEFT JOIN movie_crew mc ON m.id = mc.movie_id AND mc.role_id = $1
    LEFT JOIN people p ON mc.person_id = p.id
    WHERE m.imdb_id IS NULL OR m.imdb_id = ''
    GROUP BY m.id, m.title, m.year, m.duration, m.imdb_id
    ORDER BY m.year DESC NULLS LAST, m.id
    ${limit ? `LIMIT ${limit}` : ''}
    ${offset ? `OFFSET ${offset}` : ''}
  `;
  
  const result = await pool.query(query, [config.roles.director]);
  return result.rows;
}

/**
 * Calcular score de match entre película local y TMDB
 */
function calculateMatchScore(
  local: LocalMovie,
  tmdb: TMDBMovieDetails
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Comparar títulos
  const titleSimilarity = Math.max(
    stringSimilarity(local.title, tmdb.title),
    stringSimilarity(local.title, tmdb.original_title)
  );
  
  if (titleSimilarity >= 95) {
    score += 40;
    reasons.push(`Título exacto (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 80) {
    score += 30;
    reasons.push(`Título similar (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 60) {
    score += 15;
    reasons.push(`Título parcial (${titleSimilarity}%)`);
  }
  
  // 2. Comparar año
  if (local.year && tmdb.release_date) {
    const tmdbYear = parseInt(tmdb.release_date.split('-')[0]);
    if (local.year === tmdbYear) {
      score += 25;
      reasons.push('Año exacto');
    } else if (Math.abs(local.year - tmdbYear) === 1) {
      score += 15;
      reasons.push('Año ±1');
    }
  }
  
  // 3. Comparar director
  if (local.director_names && tmdb.credits?.crew) {
    const tmdbDirectors = tmdb.credits.crew
      .filter(c => c.job === 'Director')
      .map(c => normalizeText(c.name));
    
    const localDirectors = local.director_names
      .split(',')
      .map(d => normalizeText(d.trim()));
    
    const hasDirectorMatch = localDirectors.some(ld => 
      tmdbDirectors.some(td => stringSimilarity(ld, td) >= 80)
    );
    
    if (hasDirectorMatch) {
      score += config.matching.movie.directorMatchBonus;
      reasons.push('Director coincide');
    }
  }
  
  // 4. País Argentina
  if (tmdb.production_countries?.some(c => c.iso_3166_1 === 'AR')) {
    score += config.matching.movie.argentinaCountryBonus;
    reasons.push('Producción Argentina');
  }
  
  // 5. Comparar duración
  if (local.duration && tmdb.runtime) {
    const diff = Math.abs(local.duration - tmdb.runtime);
    if (diff <= config.matching.movie.durationToleranceMinutes) {
      score += config.matching.movie.durationMatchBonus;
      reasons.push(`Duración similar (±${diff}min)`);
    }
  }
  
  return { score, reasons };
}

/**
 * Buscar y matchear una película
 */
async function findMatchForMovie(movie: LocalMovie): Promise<MatchResult> {
  const result: MatchResult = {
    local_id: movie.id,
    local_title: movie.title,
    local_year: movie.year,
    local_director: movie.director_names,
    tmdb_id: null,
    tmdb_title: null,
    tmdb_year: null,
    tmdb_director: null,
    imdb_id: null,
    match_score: 0,
    match_status: 'no_match',
    match_reason: '',
  };
  
  try {
    // Buscar por título y año
    const searchResult = await searchMovies(movie.title, movie.year || undefined);
    
    if (searchResult.total_results === 0) {
      // Intentar sin año
      const searchWithoutYear = await searchMovies(movie.title);
      if (searchWithoutYear.total_results === 0) {
        result.match_reason = 'Sin resultados en TMDB';
        return result;
      }
      searchResult.results = searchWithoutYear.results;
    }
    
    // Evaluar cada candidato
    const candidates: Array<{
      tmdb: TMDBMovieDetails;
      score: number;
      reasons: string[];
    }> = [];
    
    // Limitar a los primeros 5 resultados para no hacer demasiadas requests
    for (const tmdbMovie of searchResult.results.slice(0, 5)) {
      const details = await getMovieDetails(tmdbMovie.id);
      const { score, reasons } = calculateMatchScore(movie, details);
      
      if (score > 0) {
        candidates.push({ tmdb: details, score, reasons });
      }
    }
    
    if (candidates.length === 0) {
      result.match_reason = 'Ningún candidato supera umbral mínimo';
      return result;
    }
    
    // Ordenar por score descendente
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    
    // Obtener director de TMDB
    const tmdbDirector = best.tmdb.credits?.crew
      ?.filter(c => c.job === 'Director')
      .map(c => c.name)
      .join(', ') || null;
    
    result.tmdb_id = best.tmdb.id;
    result.tmdb_title = best.tmdb.title;
    result.tmdb_year = best.tmdb.release_date ? parseInt(best.tmdb.release_date.split('-')[0]) : null;
    result.tmdb_director = tmdbDirector;
    result.imdb_id = best.tmdb.imdb_id;
    result.match_score = best.score;
    result.match_reason = best.reasons.join('; ');
    
    // Determinar status
    if (best.score >= config.matching.person.autoAcceptScore) {
      result.match_status = 'auto_accept';
    } else if (best.score >= config.matching.person.reviewScore) {
      if (candidates.length > 1 && candidates[1].score >= config.matching.person.reviewScore) {
        result.match_status = 'multiple';
        result.match_reason += ` [Alternativas: ${candidates.slice(1, 3).map(c => c.tmdb.title).join(', ')}]`;
      } else {
        result.match_status = 'review';
      }
    }
    
  } catch (error) {
    result.match_reason = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
  
  return result;
}

/**
 * Aplicar cambios a la base de datos
 */
async function applyChanges(matches: MatchResult[]): Promise<{ updated: number; errors: number }> {
  const pool = getPool();
  let updated = 0;
  let errors = 0;
  
  for (const match of matches) {
    if (!match.imdb_id || match.match_status === 'no_match') continue;
    
    try {
      await pool.query(
        'UPDATE movies SET imdb_id = $1 WHERE id = $2',
        [match.imdb_id, match.local_id]
      );
      updated++;
    } catch (error) {
      log(`Error actualizando película ${match.local_id}: ${error}`, 'error');
      errors++;
    }
  }
  
  return { updated, errors };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
  const applyFromCSV = args.includes('--apply-csv');
  
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : undefined;
  
  const offsetArg = args.find(a => a.startsWith('--offset'));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1] || args[args.indexOf('--offset') + 1]) : undefined;
  
  console.log('\n🎬 TMDB Movie Enrichment Script');
  console.log('================================\n');
  
  // Test conexión a TMDB
  log('Probando conexión a TMDB...', 'info');
  const connected = await testConnection();
  if (!connected) {
    log('No se pudo conectar a TMDB', 'error');
    process.exit(1);
  }
  log('Conexión a TMDB exitosa', 'success');
  
  if (applyFromCSV) {
    // Modo: Aplicar desde CSV revisado
    log('Cargando matches desde CSV...', 'info');
    const matches = loadFromCSV('movies-matches.csv') as MatchResult[];
    
    if (matches.length === 0) {
      log('No se encontró el archivo movies-matches.csv', 'error');
      process.exit(1);
    }
    
    const toApply = matches.filter(m => 
      m.match_status === 'auto_accept' || m.match_status === 'review'
    );
    
    log(`Aplicando ${toApply.length} matches a la base de datos...`, 'info');
    const { updated, errors } = await applyChanges(toApply);
    
    log(`Actualizadas: ${updated} | Errores: ${errors}`, updated > 0 ? 'success' : 'warn');
    
  } else {
    // Modo: Procesar películas
    log('Obteniendo películas sin IMDB ID...', 'info');
    const movies = await getMoviesWithoutImdbId(limit, offset);
    log(`Encontradas ${movies.length} películas para procesar`, 'info');
    
    if (movies.length === 0) {
      log('No hay películas para procesar', 'success');
      await closePool();
      return;
    }
    
    const startTime = Date.now();
    const results: MatchResult[] = [];
    
    // Stats
    let processed = 0;
    let autoAccepted = 0;
    let needsReview = 0;
    let noMatch = 0;
    let multiple = 0;
    
    for (const movie of movies) {
      processed++;
      process.stdout.write(`\r${progressBar(processed, movies.length)} - ${movie.title.slice(0, 30)}...`);
      
      const match = await findMatchForMovie(movie);
      results.push(match);
      
      switch (match.match_status) {
        case 'auto_accept': autoAccepted++; break;
        case 'review': needsReview++; break;
        case 'no_match': noMatch++; break;
        case 'multiple': multiple++; break;
      }
    }
    
    console.log('\n');
    
    const elapsed = Date.now() - startTime;
    
    // Guardar CSV
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    saveToCSV(results, `movies-matches-${timestamp}.csv`, [
      'local_id', 'local_title', 'local_year', 'local_director',
      'tmdb_id', 'tmdb_title', 'tmdb_year', 'tmdb_director',
      'imdb_id', 'match_score', 'match_status', 'match_reason'
    ]);
    
    // También guardar versión "latest" para aplicar después
    saveToCSV(results, 'movies-matches.csv', [
      'local_id', 'local_title', 'local_year', 'local_director',
      'tmdb_id', 'tmdb_title', 'tmdb_year', 'tmdb_director',
      'imdb_id', 'match_score', 'match_status', 'match_reason'
    ]);
    
    // Resumen
    console.log('\n📊 Resumen:');
    console.log(`   Procesadas:      ${processed}`);
    console.log(`   Auto-aceptadas:  ${autoAccepted} (score >= ${config.matching.person.autoAcceptScore})`);
    console.log(`   Para revisar:    ${needsReview} (score ${config.matching.person.reviewScore}-${config.matching.person.autoAcceptScore - 1})`);
    console.log(`   Múltiples:       ${multiple}`);
    console.log(`   Sin match:       ${noMatch}`);
    console.log(`   Tiempo:          ${formatDuration(elapsed)}`);
    
    if (!isDryRun) {
      const toApply = results.filter(r => r.match_status === 'auto_accept');
      log(`\nAplicando ${toApply.length} matches automáticos a la BD...`, 'info');
      const { updated, errors } = await applyChanges(toApply);
      log(`Actualizadas: ${updated} | Errores: ${errors}`, 'success');
    } else {
      console.log('\n💡 Modo dry-run: No se aplicaron cambios.');
      console.log('   Para aplicar auto-aceptados: npx ts-node enrich-movies.ts --apply');
      console.log('   Para aplicar desde CSV:      npx ts-node enrich-movies.ts --apply-csv');
    }
  }
  
  await closePool();
  console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
