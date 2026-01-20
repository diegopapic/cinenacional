#!/usr/bin/env node

/**
 * 🎬 TMDB Movie Info & Creation Date
 * 
 * Intenta obtener toda la info posible sobre cuándo se agregó una película
 */

const TMDB_API_KEY = 'dee8661be8478c4689c9ffa5f1038f8f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MOVIE_ID = process.argv[2] || 1619544; // Felicidades! por defecto

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function getMovieInfo() {
  console.log(`🎬 TMDB Movie Info - ID: ${MOVIE_ID}`);
  console.log('═'.repeat(50) + '\n');

  try {
    // 1. Info básica de la película
    console.log('📡 Obteniendo información básica...\n');
    const movieUrl = `${TMDB_BASE_URL}/movie/${MOVIE_ID}?api_key=${TMDB_API_KEY}&language=es-AR`;
    const movie = await fetchJSON(movieUrl);
    
    console.log('🎬 Película:');
    console.log('─'.repeat(50));
    console.log(`   Título: ${movie.title}`);
    console.log(`   Título original: ${movie.original_title}`);
    console.log(`   ID: ${movie.id}`);
    console.log(`   IMDB: ${movie.imdb_id || '(no tiene)'}`);
    console.log(`   Fecha estreno: ${movie.release_date || '(sin fecha)'}`);
    console.log(`   Países: ${movie.production_countries?.map(c => c.name).join(', ') || '(sin país)'}`);
    console.log(`   Rating: ${movie.vote_average}/10 (${movie.vote_count} votos)`);
    console.log(`   Estado: ${movie.status}`);
    console.log('─'.repeat(50));

    // 2. Historial de cambios (últimos 14 días)
    console.log('\n📅 Historial de cambios (últimos 14 días)...\n');
    const changesUrl = `${TMDB_BASE_URL}/movie/${MOVIE_ID}/changes?api_key=${TMDB_API_KEY}`;
    const changesData = await fetchJSON(changesUrl);
    
    if (changesData.changes && changesData.changes.length > 0) {
      let allTimestamps = [];
      
      for (const change of changesData.changes) {
        console.log(`   📝 Campo: ${change.key}`);
        for (const item of change.items || []) {
          if (item.time) {
            const ts = new Date(item.time);
            allTimestamps.push({ time: ts, field: change.key, action: item.action });
            console.log(`      - ${item.action || 'updated'}: ${ts.toISOString()}`);
            console.log(`        (${ts.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} ARG)`);
          }
        }
      }
      
      // Encontrar el más antiguo
      if (allTimestamps.length > 0) {
        allTimestamps.sort((a, b) => a.time - b.time);
        const oldest = allTimestamps[0];
        const newest = allTimestamps[allTimestamps.length - 1];
        
        console.log('\n' + '═'.repeat(50));
        console.log('📌 RESUMEN DE FECHAS:');
        console.log('═'.repeat(50));
        console.log(`   🕐 Primer cambio registrado: ${oldest.time.toISOString()}`);
        console.log(`      Campo: ${oldest.field}`);
        console.log(`      Fecha ARG: ${oldest.time.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
        console.log(`\n   🕐 Último cambio: ${newest.time.toISOString()}`);
        console.log(`      Campo: ${newest.field}`);
        console.log(`      Fecha ARG: ${newest.time.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
      }
    } else {
      console.log('   ⚠️ No hay historial de cambios disponible');
      console.log('   (TMDB solo guarda 14 días, o la película es muy nueva)');
    }

    // 3. Créditos (para ver director)
    console.log('\n\n👥 Créditos...\n');
    const creditsUrl = `${TMDB_BASE_URL}/movie/${MOVIE_ID}/credits?api_key=${TMDB_API_KEY}`;
    const credits = await fetchJSON(creditsUrl);
    
    const directors = credits.crew?.filter(c => c.job === 'Director') || [];
    if (directors.length > 0) {
      console.log('   🎬 Director(es):');
      for (const dir of directors) {
        console.log(`      - ${dir.name} (TMDB ID: ${dir.id})`);
      }
    }

    // 4. Release dates por país
    console.log('\n\n📅 Fechas de estreno por país...\n');
    const releasesUrl = `${TMDB_BASE_URL}/movie/${MOVIE_ID}/release_dates?api_key=${TMDB_API_KEY}`;
    const releases = await fetchJSON(releasesUrl);
    
    if (releases.results && releases.results.length > 0) {
      for (const country of releases.results.slice(0, 10)) {
        console.log(`   ${country.iso_3166_1}:`);
        for (const rel of country.release_dates) {
          console.log(`      - ${rel.release_date?.split('T')[0]} (tipo: ${rel.type})`);
        }
      }
    }

    console.log('\n\n🔗 Ver en TMDB: https://www.themoviedb.org/movie/' + MOVIE_ID);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getMovieInfo();