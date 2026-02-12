/**
 * Script para enriquecer personas con IMDB ID desde TMDB
 * 
 * Uso:
 *   npx ts-node enrich-people.ts --dry-run          # Solo genera CSV
 *   npx ts-node enrich-people.ts --apply            # Aplica cambios a la BD
 *   npx ts-node enrich-people.ts --apply-csv        # Aplica desde CSV revisado
 *   npx ts-node enrich-people.ts --limit 100        # Procesar solo 100 personas
 *   npx ts-node enrich-people.ts --offset 500       # Empezar desde la 501
 *   npx ts-node enrich-people.ts --min-movies 3     # Solo personas con 3+ películas
 *   npx ts-node enrich-people.ts --reset-apply-progress  # Borrar progreso de apply
 */

import * as fs from 'fs';
import * as path from 'path';
import { searchPeople, getPersonDetails, testConnection, TMDBPersonDetails } from './tmdb-client';
import { 
  getPool, 
  closePool, 
  normalizeText, 
  stringSimilarity,
  parseTMDBDate,
  compareDates,
  isArgentineLocation,
  saveToCSV, 
  loadFromCSV,
  formatDuration,
  progressBar,
  log 
} from './utils';
import config from './config';

// Tipos
interface LocalPerson {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  imdb_id: string | null;
  movie_count: number;
  movie_titles: string | null; // "Película1, Película2"
}

interface MatchResult {
  local_id: number;
  local_name: string;
  local_birth: string | null;
  local_death: string | null;
  local_movies: number;
  tmdb_id: number | null;
  tmdb_name: string | null;
  tmdb_birth: string | null;
  tmdb_death: string | null;
  tmdb_place: string | null;
  imdb_id: string | null;
  match_score: number;
  match_status: 'auto_accept' | 'review' | 'no_match' | 'multiple';
  match_reason: string;
}

// Archivo para guardar progreso de apply
const APPLY_PROGRESS_FILE = path.join(__dirname, 'reports', '.enrich-people-apply-progress.json');

interface ApplyProgressData {
  appliedIds: number[];
  lastRun: string;
}

/**
 * Cargar progreso de apply guardado
 */
function loadApplyProgress(): Set<number> {
  try {
    if (fs.existsSync(APPLY_PROGRESS_FILE)) {
      const data: ApplyProgressData = JSON.parse(fs.readFileSync(APPLY_PROGRESS_FILE, 'utf-8'));
      return new Set(data.appliedIds);
    }
  } catch (error) {
    // Si hay error leyendo, empezar de cero
  }
  return new Set();
}

/**
 * Guardar progreso de apply
 */
function saveApplyProgress(appliedIds: Set<number>): void {
  const data: ApplyProgressData = {
    appliedIds: Array.from(appliedIds),
    lastRun: new Date().toISOString(),
  };
  fs.writeFileSync(APPLY_PROGRESS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Borrar progreso de apply
 */
function resetApplyProgress(): void {
  if (fs.existsSync(APPLY_PROGRESS_FILE)) {
    fs.unlinkSync(APPLY_PROGRESS_FILE);
    log('Progreso de apply reiniciado', 'success');
  } else {
    log('No había progreso de apply guardado', 'info');
  }
}

/**
 * Obtener personas sin IMDB ID de la base de datos
 */
async function getPeopleWithoutImdbId(
  limit?: number, 
  offset?: number,
  minMovies: number = 1
): Promise<LocalPerson[]> {
  const pool = getPool();
  
  const query = `
    WITH person_movies AS (
      SELECT 
        person_id,
        COUNT(DISTINCT movie_id) as movie_count,
        STRING_AGG(DISTINCT m.title, ', ' ORDER BY m.title) as movie_titles
      FROM (
        SELECT person_id, movie_id FROM movie_cast
        UNION ALL
        SELECT person_id, movie_id FROM movie_crew
      ) all_roles
      JOIN movies m ON all_roles.movie_id = m.id
      GROUP BY person_id
    )
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as full_name,
      p.birth_year,
      p.birth_month,
      p.birth_day,
      p.death_year,
      p.death_month,
      p.death_day,
      p.imdb_id,
      COALESCE(pm.movie_count, 0) as movie_count,
      pm.movie_titles
    FROM people p
    LEFT JOIN person_movies pm ON p.id = pm.person_id
    WHERE (p.tmdb_id IS NULL OR p.tmdb_id = 0)
      AND COALESCE(pm.movie_count, 0) >= $1
    ORDER BY COALESCE(pm.movie_count, 0) DESC, p.id
    ${limit ? `LIMIT ${limit}` : ''}
    ${offset ? `OFFSET ${offset}` : ''}
  `;
  
  const result = await pool.query(query, [minMovies]);
  return result.rows;
}

/**
 * Obtener títulos de películas de una persona en nuestra BD
 */
async function getPersonMovieTitles(personId: number): Promise<string[]> {
  const pool = getPool();
  
  const query = `
    SELECT DISTINCT m.title, m.year
    FROM movies m
    JOIN (
      SELECT movie_id FROM movie_cast WHERE person_id = $1
      UNION
      SELECT movie_id FROM movie_crew WHERE person_id = $1
    ) roles ON m.id = roles.movie_id
    ORDER BY m.year DESC NULLS LAST
    LIMIT 20
  `;
  
  const result = await pool.query(query, [personId]);
  return result.rows.map(r => r.title);
}

/**
 * Calcular score de match entre persona local y TMDB
 */
function calculateMatchScore(
  local: LocalPerson,
  tmdb: TMDBPersonDetails,
  localMovieTitles: string[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Comparar nombres
  const nameSimilarity = stringSimilarity(local.full_name, tmdb.name);
  
  if (nameSimilarity >= 95) {
    score += 30;
    reasons.push(`Nombre exacto (${nameSimilarity}%)`);
  } else if (nameSimilarity >= 80) {
    score += 20;
    reasons.push(`Nombre similar (${nameSimilarity}%)`);
  } else if (nameSimilarity >= 60) {
    score += 10;
    reasons.push(`Nombre parcial (${nameSimilarity}%)`);
  }
  
  // También verificar nombres alternativos de TMDB
  if (tmdb.also_known_as) {
    for (const altName of tmdb.also_known_as) {
      const altSimilarity = stringSimilarity(local.full_name, altName);
      if (altSimilarity >= 90 && altSimilarity > nameSimilarity) {
        score += 10;
        reasons.push(`Nombre alternativo match`);
        break;
      }
    }
  }
  
  // 2. Comparar fecha de nacimiento
  if (local.birth_year && tmdb.birthday) {
    const tmdbBirth = parseTMDBDate(tmdb.birthday);
    const localBirth = {
      year: local.birth_year,
      month: local.birth_month,
      day: local.birth_day,
    };
    
    const birthScore = compareDates(localBirth, tmdbBirth);
    if (birthScore >= 50) {
      score += birthScore / 2; // Max 50 puntos
      reasons.push(`Nacimiento coincide (${birthScore}%)`);
    }
  }
  
  // 3. Comparar fecha de muerte
  if (local.death_year && tmdb.deathday) {
    const tmdbDeath = parseTMDBDate(tmdb.deathday);
    const localDeath = {
      year: local.death_year,
      month: local.death_month,
      day: local.death_day,
    };
    
    const deathScore = compareDates(localDeath, tmdbDeath);
    if (deathScore >= 50) {
      score += deathScore / 2; // Max 50 puntos
      reasons.push(`Fallecimiento coincide (${deathScore}%)`);
    }
  }
  
  // 4. Verificar si es argentino
  if (isArgentineLocation(tmdb.place_of_birth)) {
    score += 15;
    reasons.push('Origen argentino');
  }
  
  // 5. Comparar filmografía (muy importante para homónimos)
  if (tmdb.movie_credits && localMovieTitles.length > 0) {
    const tmdbMovies = [
      ...tmdb.movie_credits.cast.map(m => normalizeText(m.title)),
      ...tmdb.movie_credits.crew.map(m => normalizeText(m.title)),
    ];
    
    let movieMatches = 0;
    for (const localTitle of localMovieTitles) {
      const normalizedLocal = normalizeText(localTitle);
      if (tmdbMovies.some(tm => stringSimilarity(normalizedLocal, tm) >= 80)) {
        movieMatches++;
      }
    }
    
    if (movieMatches > 0) {
      const movieScore = Math.min(movieMatches * 10, 30); // Max 30 puntos
      score += movieScore;
      reasons.push(`${movieMatches} película(s) en común`);
    }
  }
  
  return { score, reasons };
}

/**
 * Buscar y matchear una persona
 */
async function findMatchForPerson(person: LocalPerson): Promise<MatchResult> {
  const result: MatchResult = {
    local_id: person.id,
    local_name: person.full_name.trim(),
    local_birth: person.birth_year ? 
      `${person.birth_year}${person.birth_month ? '-' + String(person.birth_month).padStart(2, '0') : ''}${person.birth_day ? '-' + String(person.birth_day).padStart(2, '0') : ''}` 
      : null,
    local_death: person.death_year ?
      `${person.death_year}${person.death_month ? '-' + String(person.death_month).padStart(2, '0') : ''}${person.death_day ? '-' + String(person.death_day).padStart(2, '0') : ''}`
      : null,
    local_movies: person.movie_count,
    tmdb_id: null,
    tmdb_name: null,
    tmdb_birth: null,
    tmdb_death: null,
    tmdb_place: null,
    imdb_id: null,
    match_score: 0,
    match_status: 'no_match',
    match_reason: '',
  };
  
  // Nombre vacío
  if (!person.full_name.trim()) {
    result.match_reason = 'Nombre vacío';
    return result;
  }
  
  try {
    // Obtener películas de la persona para comparar filmografía
    const localMovieTitles = await getPersonMovieTitles(person.id);
    
    // Buscar en TMDB
    const searchResult = await searchPeople(person.full_name.trim());
    
    if (searchResult.total_results === 0) {
      result.match_reason = 'Sin resultados en TMDB';
      return result;
    }
    
    // Evaluar cada candidato
    const candidates: Array<{
      tmdb: TMDBPersonDetails;
      score: number;
      reasons: string[];
    }> = [];
    
    // Limitar a los primeros 5 resultados
    for (const tmdbPerson of searchResult.results.slice(0, 5)) {
      const details = await getPersonDetails(tmdbPerson.id);
      const { score, reasons } = calculateMatchScore(person, details, localMovieTitles);
      
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
    
    result.tmdb_id = best.tmdb.id;
    result.tmdb_name = best.tmdb.name;
    result.tmdb_birth = best.tmdb.birthday;
    result.tmdb_death = best.tmdb.deathday;
    result.tmdb_place = best.tmdb.place_of_birth;
    result.imdb_id = best.tmdb.imdb_id;
    result.match_score = best.score;
    result.match_reason = best.reasons.join('; ');
    
    // Determinar status
    // Regla especial: nombre exacto + 2 películas en común = auto_accept
    const hasExactName = best.reasons.some(r => r.includes('Nombre exacto'));
    const movieMatchReason = best.reasons.find(r => r.includes('película(s) en común'));
    const movieMatchCount = movieMatchReason ? parseInt(movieMatchReason.match(/(\d+)/)?.[1] || '0') : 0;
    
    if (best.score >= config.matching.person.autoAcceptScore) {
      result.match_status = 'auto_accept';
    } else if (hasExactName && movieMatchCount >= 2) {
      // Nombre exacto + 2 películas = suficiente confianza
      result.match_status = 'auto_accept';
      result.match_reason += ' [Auto: nombre exacto + películas]';
    } else if (best.score >= config.matching.person.reviewScore) {
      // Verificar si hay múltiples candidatos con score similar
      if (candidates.length > 1 && candidates[1].score >= config.matching.person.reviewScore) {
        result.match_status = 'multiple';
        result.match_reason += ` [Alternativas: ${candidates.slice(1, 3).map(c => `${c.tmdb.name} (${c.score})`).join(', ')}]`;
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
async function applyChanges(matches: MatchResult[]): Promise<{ updated: number; errors: number; skipped: number }> {
  const pool = getPool();
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  const appliedIds = loadApplyProgress();
  if (appliedIds.size > 0) {
    log(`Retomando: ${appliedIds.size} registros ya aplicados anteriormente`, 'info');
  }

  const total = matches.length;
  let processed = 0;

  for (const match of matches) {
    processed++;
    if (!match.tmdb_id || match.match_status === 'no_match') continue;

    if (appliedIds.has(match.local_id)) {
      skipped++;
      continue;
    }

    process.stdout.write(`\r${progressBar(processed, total)} - ${match.local_name.slice(0, 25)}...`);

    try {
      await pool.query(
        'UPDATE people SET tmdb_id = $1, imdb_id = COALESCE($3, imdb_id) WHERE id = $2',
        [match.tmdb_id, match.local_id, match.imdb_id || null]
      );
      updated++;
      appliedIds.add(match.local_id);

      // Guardar progreso cada 10 registros
      if (updated % 10 === 0) {
        saveApplyProgress(appliedIds);
      }
    } catch (error) {
      log(`\nError actualizando persona ${match.local_id}: ${error}`, 'error');
      errors++;
    }
  }

  // Guardar progreso final
  saveApplyProgress(appliedIds);
  process.stdout.write('\n');

  return { updated, errors, skipped };
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
  
  const minMoviesArg = args.find(a => a.startsWith('--min-movies'));
  const minMovies = minMoviesArg ? parseInt(minMoviesArg.split('=')[1] || args[args.indexOf('--min-movies') + 1]) : 1;

  if (args.includes('--reset-apply-progress')) {
    resetApplyProgress();
  }

  console.log('\n👤 TMDB People Enrichment Script');
  console.log('=================================\n');
  
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
    const matches = loadFromCSV('people-matches.csv') as MatchResult[];
    
    if (matches.length === 0) {
      log('No se encontró el archivo people-matches.csv', 'error');
      process.exit(1);
    }
    
    const toApply = matches.filter(m =>
      m.match_status === 'auto_accept'
    );
    
    log(`Aplicando ${toApply.length} matches a la base de datos...`, 'info');
    const { updated, errors, skipped } = await applyChanges(toApply);

    log(`Actualizadas: ${updated} | Salteadas: ${skipped} | Errores: ${errors}`, updated > 0 ? 'success' : 'warn');
    
  } else {
    // Modo: Procesar personas
    log(`Obteniendo personas sin IMDB ID (min ${minMovies} película(s))...`, 'info');
    const people = await getPeopleWithoutImdbId(limit, offset, minMovies);
    log(`Encontradas ${people.length} personas para procesar`, 'info');
    
    if (people.length === 0) {
      log('No hay personas para procesar', 'success');
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
    
    for (const person of people) {
      processed++;
      process.stdout.write(`\r${progressBar(processed, people.length)} - ${person.full_name.slice(0, 25)}...`);
      
      const match = await findMatchForPerson(person);
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
    saveToCSV(results, `people-matches-${timestamp}.csv`, [
      'local_id', 'local_name', 'local_birth', 'local_death', 'local_movies',
      'tmdb_id', 'tmdb_name', 'tmdb_birth', 'tmdb_death', 'tmdb_place',
      'imdb_id', 'match_score', 'match_status', 'match_reason'
    ]);
    
    // También guardar versión "latest" para aplicar después
    saveToCSV(results, 'people-matches.csv', [
      'local_id', 'local_name', 'local_birth', 'local_death', 'local_movies',
      'tmdb_id', 'tmdb_name', 'tmdb_birth', 'tmdb_death', 'tmdb_place',
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
    
    // Estimación para todo el dataset
    if (limit && processed > 0) {
      const avgTimePerPerson = elapsed / processed;
      const totalPeople = 63950; // De los datos que me diste
      const estimatedTotal = avgTimePerPerson * totalPeople;
      console.log(`\n⏱️  Tiempo estimado para ${totalPeople} personas: ${formatDuration(estimatedTotal)}`);
    }
    
    if (!isDryRun) {
      const toApply = results.filter(r => r.match_status === 'auto_accept');
      log(`\nAplicando ${toApply.length} matches automáticos a la BD...`, 'info');
      const { updated, errors, skipped } = await applyChanges(toApply);
      log(`Actualizadas: ${updated} | Salteadas: ${skipped} | Errores: ${errors}`, 'success');
    } else {
      console.log('\n💡 Modo dry-run: No se aplicaron cambios.');
      console.log('   Para aplicar auto-aceptados: npx ts-node enrich-people.ts --apply');
      console.log('   Para aplicar desde CSV:      npx ts-node enrich-people.ts --apply-csv');
    }
  }
  
  await closePool();
  console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});