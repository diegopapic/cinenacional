/**
 * Test de conexión a TMDB y PostgreSQL
 */

import { testConnection, searchMovies, searchPeople } from './tmdb-client';
import { getPool, closePool, log } from './utils';

async function main() {
  console.log('\n🔌 Test de Conexiones\n');
  
  // Test TMDB
  log('Probando TMDB API...', 'info');
  const tmdbOk = await testConnection();
  if (tmdbOk) {
    log('TMDB API: OK', 'success');
    
    // Test búsqueda de película
    log('Buscando "El secreto de sus ojos"...', 'info');
    const movieSearch = await searchMovies('El secreto de sus ojos', 2009);
    log(`Encontradas ${movieSearch.total_results} películas`, 'info');
    if (movieSearch.results.length > 0) {
      const first = movieSearch.results[0];
      log(`  → ${first.title} (${first.release_date})`, 'success');
    }
    
    // Test búsqueda de persona
    log('Buscando "Ricardo Darín"...', 'info');
    const personSearch = await searchPeople('Ricardo Darín');
    log(`Encontradas ${personSearch.total_results} personas`, 'info');
    if (personSearch.results.length > 0) {
      const first = personSearch.results[0];
      log(`  → ${first.name} (${first.known_for_department})`, 'success');
    }
  } else {
    log('TMDB API: FALLO', 'error');
  }
  
  console.log('');
  
  // Test PostgreSQL
  log('Probando PostgreSQL...', 'info');
  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM movies');
    log(`PostgreSQL: OK (${result.rows[0].count} películas)`, 'success');
    
    const peopleResult = await pool.query('SELECT COUNT(*) as count FROM people');
    log(`PostgreSQL: OK (${peopleResult.rows[0].count} personas)`, 'success');
  } catch (error) {
    log(`PostgreSQL: FALLO - ${error}`, 'error');
  }
  
  await closePool();
  console.log('\n✨ Test completado\n');
}

main().catch(console.error);
