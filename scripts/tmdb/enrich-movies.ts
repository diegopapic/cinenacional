/**
 * Script para enriquecer películas con TMDB ID desde TMDB
 *
 * Uso:
 *   npx tsx enrich-movies.ts --dry-run          # Solo genera CSV
 *   npx tsx enrich-movies.ts --apply            # Aplica cambios a la BD
 *   npx tsx enrich-movies.ts --apply-csv        # Aplica desde CSV revisado
 *   npx tsx enrich-movies.ts --reprocess-csv    # Reprocesa review/multiple del CSV
 *   npx tsx enrich-movies.ts --limit 100        # Procesar solo 100 películas
 *   npx tsx enrich-movies.ts --offset 500       # Empezar desde la 501
 *   npx tsx enrich-movies.ts --reset            # Reiniciar progreso (borrar cache)
 */

import { searchMovies, getMovieDetails, testConnection, TMDBMovie, TMDBMovieDetails } from './tmdb-client';
import * as fs from 'fs';
import * as path from 'path';
import { 
  getPool, 
  closePool, 
  normalizeText, 
  stringSimilarity,
  compareTitles,
  comparePersonNames,
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

// Archivo para guardar progreso
const PROGRESS_FILE = path.join(__dirname, 'reports', '.enrich-progress.json');

interface ProgressData {
  processedIds: number[];  // IDs de películas ya procesadas
  lastRun: string;         // Fecha de última ejecución
}

/**
 * Cargar progreso guardado
 */
function loadProgress(): Set<number> {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data: ProgressData = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return new Set(data.processedIds);
    }
  } catch (error) {
    // Si hay error leyendo, empezar de cero
  }
  return new Set();
}

/**
 * Guardar progreso
 */
function saveProgress(processedIds: Set<number>): void {
  const data: ProgressData = {
    processedIds: Array.from(processedIds),
    lastRun: new Date().toISOString(),
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Borrar progreso guardado
 */
function resetProgress(): void {
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
    log('Progreso reiniciado', 'success');
  } else {
    log('No había progreso guardado', 'info');
  }
}

/**
 * Obtener películas sin TMDB ID de la base de datos
 */
async function getMoviesWithoutTmdbId(limit?: number, offset?: number): Promise<LocalMovie[]> {
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
    WHERE m.tmdb_id IS NULL OR m.tmdb_id = 0
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
  
  // 1. Comparar títulos (usando compareTitles que maneja subtítulos)
  const titleSimilarity = Math.max(
    compareTitles(local.title, tmdb.title),
    compareTitles(local.title, tmdb.original_title)
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
  
  // 3. Comparar director (usando la nueva función inteligente)
  if (local.director_names && tmdb.credits?.crew) {
    const tmdbDirectors = tmdb.credits.crew
      .filter(c => c.job === 'Director')
      .map(c => c.name);

    const localDirectors = local.director_names
      .split(',')
      .map(d => d.trim());

    // Buscar match usando la función inteligente de comparación de nombres
    let directorMatch: { isMatch: boolean; confidence: string; reason: string } | null = null;
    
    for (const ld of localDirectors) {
      for (const td of tmdbDirectors) {
        const comparison = comparePersonNames(ld, td);
        if (comparison.isMatch) {
          directorMatch = comparison;
          break;
        }
      }
      if (directorMatch) break;
    }

    if (directorMatch) {
      score += config.matching.movie.directorMatchBonus;
      reasons.push(`Director coincide (${directorMatch.confidence}: ${directorMatch.reason})`);
    } else if (tmdbDirectors.length > 0 && localDirectors.length > 0) {
      // Tenemos director local y director TMDB, pero NO coinciden
      // Esto es una señal de alerta - marcar para revisión
      reasons.push(`Director NO coincide (${localDirectors[0]} vs ${tmdbDirectors[0]})`);
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
    // Buscar por título CON año y SIN año, combinar resultados únicos
    const allResults: TMDBMovie[] = [];
    const seenIds = new Set<number>();

    // Función auxiliar para agregar resultados sin duplicar
    const addResults = (results: TMDBMovie[]) => {
      for (const r of results) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          allResults.push(r);
        }
      }
    };

    // 1. Buscar con título original + año
    if (movie.year) {
      const searchWithYear = await searchMovies(movie.title, movie.year);
      addResults(searchWithYear.results);
    }

    // 2. Buscar con título original sin año
    const searchWithoutYear = await searchMovies(movie.title);
    addResults(searchWithoutYear.results);

    // 3. Si no hay resultados, intentar con título limpio (sin números de secuela)
    if (allResults.length === 0) {
      // Quitar números arábigos y romanos comunes de secuelas (ej: "2:", "II:", "3", "III")
      // Solo si están rodeados de espacios o seguidos de : o -
      const cleanTitle = movie.title
        .replace(/\b[IVX]{2,}\b\s*[:.-]?\s*/g, ' ')  // Romanos: II, III, IV, VI, etc. (2+ caracteres para no confundir con palabras)
        .replace(/\b\d+\s*[:.-]\s*/g, ' ')            // Arábigos seguidos de : o - (ej: "2:", "3-")
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanTitle !== movie.title && cleanTitle.length > 3) {
        const searchClean = await searchMovies(cleanTitle);
        addResults(searchClean.results);
      }
    }

    // 4. Si no hay resultados y el título tiene coma, buscar solo la parte antes de la coma
    // Ej: "Norita, Nora Cortiñas" → buscar "Norita"
    if (allResults.length === 0 && movie.title.includes(',')) {
      const firstPart = movie.title.split(',')[0].trim();
      if (firstPart.length >= 3) {
        const searchFirstPart = await searchMovies(firstPart);
        addResults(searchFirstPart.results);
      }
    }

    // 5. Si no hay resultados y el título tiene ":", buscar solo la parte antes
    // Ej: "Mujeres de la mina: De Piura al mundo" → buscar "Mujeres de la mina"
    if (allResults.length === 0 && movie.title.includes(':')) {
      const firstPart = movie.title.split(':')[0].trim();
      if (firstPart.length >= 3) {
        const searchFirstPart = await searchMovies(firstPart);
        addResults(searchFirstPart.results);
      }
    }

    if (allResults.length === 0) {
      result.match_reason = 'Sin resultados en TMDB';
      return result;
    }

    // Evaluar cada candidato
    const candidates: Array<{
      tmdb: TMDBMovieDetails;
      score: number;
      reasons: string[];
    }> = [];

    // Limitar a los primeros 5 resultados para no hacer demasiadas requests
    for (const tmdbMovie of allResults.slice(0, 5)) {
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
    const hasExactTitle = best.reasons.some(r => r.includes('Título exacto'));
    const hasSimilarTitle = best.reasons.some(r => r.includes('Título similar'));
    const hasPartialTitle = best.reasons.some(r => r.includes('Título parcial'));
    const hasAnyTitleMatch = hasExactTitle || hasSimilarTitle || hasPartialTitle;
    const hasDirectorMatch = best.reasons.some(r => r.includes('Director coincide'));
    const hasDirectorMismatch = best.reasons.some(r => r.includes('Director NO coincide'));

    // REGLA DE SEGURIDAD 1: Si el director local existe y NO coincide con TMDB,
    // nunca auto_accept. Esto previene falsos positivos como "Perceptio" vs "Perception"
    // donde título y año coinciden pero son películas de directores diferentes.
    if (hasDirectorMismatch) {
      if (best.score >= config.matching.movie.reviewScore) {
        result.match_status = 'review';
        result.match_reason += ' [Review: director no coincide]';
      }
    // REGLA DE SEGURIDAD 2: Si el título no tiene al menos similitud parcial (60%+),
    // nunca auto_accept. Esto previene falsos positivos cuando solo coincide
    // director + país + año pero son películas diferentes.
    } else if (!hasAnyTitleMatch) {
      // Sin match de título: máximo review, nunca auto_accept
      if (best.score >= config.matching.movie.reviewScore) {
        result.match_status = 'review';
        result.match_reason += ' [Review: título muy diferente]';
      }
    } else if (best.score >= config.matching.movie.autoAcceptScore) {
      result.match_status = 'auto_accept';
    } else if (hasExactTitle && hasDirectorMatch) {
      // Título exacto + director = suficiente confianza
      result.match_status = 'auto_accept';
      result.match_reason += ' [Auto: título exacto + director]';
    } else if (best.score >= config.matching.movie.reviewScore) {
      if (candidates.length > 1 && candidates[1].score >= config.matching.movie.reviewScore) {
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
 * Aplicar cambios a la base de datos (guarda tmdb_id e imdb_id si está disponible)
 */
async function applyChanges(matches: MatchResult[]): Promise<{ updated: number; errors: number }> {
  const pool = getPool();
  let updated = 0;
  let errors = 0;

  for (const match of matches) {
    if (!match.tmdb_id || match.match_status === 'no_match') continue;

    try {
      // Actualizar tmdb_id y también imdb_id si está disponible
      if (match.imdb_id) {
        await pool.query(
          'UPDATE movies SET tmdb_id = $1, imdb_id = $2 WHERE id = $3',
          [match.tmdb_id, match.imdb_id, match.local_id]
        );
      } else {
        await pool.query(
          'UPDATE movies SET tmdb_id = $1 WHERE id = $2',
          [match.tmdb_id, match.local_id]
        );
      }
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
  const reprocessCSV = args.includes('--reprocess-csv');
  const shouldReset = args.includes('--reset');

  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : undefined;

  const offsetArg = args.find(a => a.startsWith('--offset'));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1] || args[args.indexOf('--offset') + 1]) : undefined;

  console.log('\n🎬 TMDB Movie Enrichment Script');
  console.log('================================\n');

  // Modo reset: borrar progreso y salir
  if (shouldReset) {
    resetProgress();
    return;
  }

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

  } else if (reprocessCSV) {
    // Modo: Reprocesar películas review/multiple del CSV con la nueva lógica
    log('Cargando matches desde CSV para reprocesar...', 'info');
    const allMatches = loadFromCSV('movies-matches.csv') as MatchResult[];

    if (allMatches.length === 0) {
      log('No se encontró el archivo movies-matches.csv', 'error');
      process.exit(1);
    }

    // Filtrar solo los que necesitan revisión
    const toReprocess = allMatches.filter(m =>
      m.match_status === 'review' || m.match_status === 'multiple'
    );

    const alreadyGood = allMatches.filter(m =>
      m.match_status === 'auto_accept' || m.match_status === 'no_match'
    );

    log(`Total en CSV: ${allMatches.length}`, 'info');
    log(`Ya resueltos (auto_accept/no_match): ${alreadyGood.length}`, 'info');
    log(`Para reprocesar (review/multiple): ${toReprocess.length}`, 'info');

    if (toReprocess.length === 0) {
      log('No hay películas para reprocesar', 'success');
      await closePool();
      return;
    }

    const startTime = Date.now();
    const newResults: MatchResult[] = [...alreadyGood]; // Mantener los que ya estaban bien

    // Stats
    let processed = 0;
    let nowAutoAccept = 0;
    let stillReview = 0;
    let stillMultiple = 0;

    console.log('');
    console.log('Reprocesando con nueva lógica de comparación de nombres...');
    console.log('');

    for (const oldMatch of toReprocess) {
      processed++;

      // Crear LocalMovie desde el CSV
      const movie: LocalMovie = {
        id: Number(oldMatch.local_id),
        title: oldMatch.local_title,
        year: oldMatch.local_year ? Number(oldMatch.local_year) : null,
        duration: null, // No tenemos esta info en el CSV
        imdb_id: null,
        director_names: oldMatch.local_director,
      };

      // Reprocesar
      const newMatch = await findMatchForMovie(movie);
      newResults.push(newMatch);

      // Determinar si cambió
      const oldStatus = oldMatch.match_status;
      const newStatus = newMatch.match_status;
      
      let icon = '🔍';
      let statusChange = '';
      
      if (newStatus === 'auto_accept') {
        nowAutoAccept++;
        icon = '✅';
        if (oldStatus !== 'auto_accept') {
          statusChange = ` (era ${oldStatus})`;
        }
      } else if (newStatus === 'review') {
        stillReview++;
        icon = '🔍';
      } else if (newStatus === 'multiple') {
        stillMultiple++;
        icon = '🔄';
      }

      // Mostrar progreso
      console.log(`${icon} [${processed}/${toReprocess.length}] ${movie.title} (${movie.year || '?'}) → ${newStatus}${statusChange}`);
    }

    const elapsed = Date.now() - startTime;

    // Guardar nuevo CSV
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    saveToCSV(newResults, `movies-matches-reprocessed-${timestamp}.csv`, [
      'local_id', 'local_title', 'local_year', 'local_director',
      'tmdb_id', 'tmdb_title', 'tmdb_year', 'tmdb_director',
      'imdb_id', 'match_score', 'match_status', 'match_reason'
    ]);

    // También actualizar el "latest"
    saveToCSV(newResults, 'movies-matches.csv', [
      'local_id', 'local_title', 'local_year', 'local_director',
      'tmdb_id', 'tmdb_title', 'tmdb_year', 'tmdb_director',
      'imdb_id', 'match_score', 'match_status', 'match_reason'
    ]);

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN REPROCESAMIENTO');
    console.log('='.repeat(60));
    console.log(`   Reprocesadas:        ${processed}`);
    console.log(`   ✅ Ahora auto_accept: ${nowAutoAccept}`);
    console.log(`   🔍 Siguen en review:  ${stillReview}`);
    console.log(`   🔄 Siguen multiple:   ${stillMultiple}`);
    console.log(`   ⏱️  Tiempo:            ${formatDuration(elapsed)}`);
    console.log('='.repeat(60));

    if (nowAutoAccept > 0) {
      log(`¡${nowAutoAccept} películas ahora pasan automáticamente!`, 'success');
    }

  } else {
    // Modo: Procesar películas
    log('Obteniendo películas sin TMDB ID...', 'info');
    const allMovies = await getMoviesWithoutTmdbId(limit, offset);

    // Cargar progreso y filtrar películas ya procesadas
    const processedIds = loadProgress();
    const movies = allMovies.filter(m => !processedIds.has(m.id));

    const skipped = allMovies.length - movies.length;
    if (skipped > 0) {
      log(`Saltando ${skipped} películas ya procesadas (usar --reset para reiniciar)`, 'info');
    }

    log(`Películas a procesar: ${movies.length}`, 'info');
    log(`Modo: ${isDryRun ? 'dry-run (no aplica cambios)' : 'apply (aplica cambios en tiempo real)'}`, 'info');

    if (movies.length === 0) {
      log('No hay películas nuevas para procesar', 'success');
      await closePool();
      return;
    }

    const startTime = Date.now();
    const results: MatchResult[] = [];
    const pool = getPool();

    // Stats
    let processed = 0;
    let autoAccepted = 0;
    let applied = 0;
    let needsReview = 0;
    let noMatch = 0;
    let multiple = 0;
    let errors = 0;

    console.log('');

    for (const movie of movies) {
      processed++;

      const match = await findMatchForMovie(movie);
      results.push(match);

      // Marcar como procesada (independientemente del resultado)
      processedIds.add(movie.id);

      // Determinar icono y actualizar stats
      let icon = '➖';
      switch (match.match_status) {
        case 'auto_accept':
          autoAccepted++;
          icon = '✅';
          // Aplicar inmediatamente si no es dry-run
          if (!isDryRun && match.tmdb_id) {
            try {
              if (match.imdb_id) {
                await pool.query(
                  'UPDATE movies SET tmdb_id = $1, imdb_id = $2 WHERE id = $3',
                  [match.tmdb_id, match.imdb_id, match.local_id]
                );
              } else {
                await pool.query(
                  'UPDATE movies SET tmdb_id = $1 WHERE id = $2',
                  [match.tmdb_id, match.local_id]
                );
              }
              applied++;
            } catch (err) {
              errors++;
              icon = '❌';
            }
          }
          break;
        case 'review':
          needsReview++;
          icon = '🔍';
          break;
        case 'no_match':
          noMatch++;
          icon = '➖';
          break;
        case 'multiple':
          multiple++;
          icon = '🔄';
          break;
      }

      // Mostrar progreso en tiempo real
      let tmdbInfo: string;
      if (match.match_status === 'no_match') {
        // Para no_match, mostrar el motivo (no el candidato rechazado)
        tmdbInfo = match.match_reason || 'Sin match';
      } else if (match.tmdb_id) {
        // Para auto_accept, review, multiple: mostrar el candidato
        tmdbInfo = `→ ${match.tmdb_title} (${match.tmdb_year}) [${match.imdb_id || 'sin imdb'}]`;
      } else {
        tmdbInfo = match.match_reason;
      }
      console.log(`${icon} [${processed}/${movies.length}] ${movie.title} (${movie.year || '?'}) ${tmdbInfo}`);

      // Guardar progreso cada 10 películas
      if (processed % 10 === 0) {
        saveProgress(processedIds);
      }
    }

    // Guardar progreso final
    saveProgress(processedIds);

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
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`   Procesadas:      ${processed}`);
    console.log(`   ✅ Auto-accept:  ${autoAccepted}`);
    if (!isDryRun) {
      console.log(`   💾 Aplicadas:    ${applied}`);
      if (errors > 0) console.log(`   ❌ Errores:      ${errors}`);
    }
    console.log(`   🔍 Para revisar: ${needsReview}`);
    console.log(`   🔄 Múltiples:    ${multiple}`);
    console.log(`   ➖ Sin match:    ${noMatch}`);
    console.log(`   ⏱️  Tiempo:       ${formatDuration(elapsed)}`);
    console.log(`   📁 Progreso:     ${processedIds.size} películas en cache`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n💡 Modo dry-run: No se aplicaron cambios.');
      console.log('   Para aplicar: npx tsx scripts/tmdb/enrich-movies.ts --apply');
    }
    console.log('   Para reiniciar: npx tsx scripts/tmdb/enrich-movies.ts --reset');
  }

  await closePool();
  console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});