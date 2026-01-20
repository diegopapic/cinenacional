#!/usr/bin/env node

/**
 * 🎬 TMDB Latest Argentine Movie Checker
 * 
 * Busca las películas argentinas más recientes en TMDB
 */

const TMDB_API_KEY = 'dee8661be8478c4689c9ffa5f1038f8f';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function getLatestArgentineMovies() {
  console.log('🇦🇷 TMDB Latest Argentine Movies');
  console.log('=================================\n');

  try {
    // Método 1: Discover con filtro de país, ordenado por fecha de estreno
    console.log('📡 Método 1: Películas argentinas por fecha de estreno...\n');
    
    const discoverUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=AR&sort_by=primary_release_date.desc&page=1`;
    const discoverData = await fetchJSON(discoverUrl);
    
    console.log(`📊 Total películas argentinas en TMDB: ${discoverData.total_results}\n`);
    
    if (discoverData.results && discoverData.results.length > 0) {
      console.log('🎬 Últimas 10 películas argentinas (por fecha de estreno):');
      console.log('─'.repeat(60));
      
      for (let i = 0; i < Math.min(10, discoverData.results.length); i++) {
        const movie = discoverData.results[i];
        console.log(`\n${i + 1}. ${movie.title}`);
        console.log(`   ID: ${movie.id}`);
        console.log(`   Fecha estreno: ${movie.release_date || '(sin fecha)'}`);
        console.log(`   Rating: ${movie.vote_average}/10 (${movie.vote_count} votos)`);
        console.log(`   🔗 https://www.themoviedb.org/movie/${movie.id}`);
      }
    }

    // Método 2: Películas agregadas recientemente (por ID más alto)
    console.log('\n\n📡 Método 2: Buscando argentinas por ID reciente...\n');
    
    // Obtener el último ID global
    const latestUrl = `${TMDB_BASE_URL}/movie/latest?api_key=${TMDB_API_KEY}`;
    const latestMovie = await fetchJSON(latestUrl);
    const latestId = latestMovie.id;
    
    console.log(`📌 Último ID global en TMDB: ${latestId}`);
    console.log('🔍 Buscando hacia atrás las últimas argentinas agregadas...\n');
    
    const argentineMovies = [];
    let checked = 0;
    let errors = 0;
    const maxCheck = 500; // Revisar últimas 500 películas
    
    for (let id = latestId; id > latestId - maxCheck && argentineMovies.length < 5; id--) {
      try {
        const movieUrl = `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`;
        const movie = await fetchJSON(movieUrl);
        checked++;
        
        // Verificar si es argentina
        const isArgentine = movie.production_countries?.some(c => c.iso_3166_1 === 'AR') ||
                          movie.origin_country?.includes('AR');
        
        if (isArgentine) {
          argentineMovies.push({
            id: movie.id,
            title: movie.title,
            original_title: movie.original_title,
            release_date: movie.release_date,
            overview: movie.overview,
            countries: movie.production_countries?.map(c => c.name).join(', ')
          });
          console.log(`   ✅ Encontrada: ${movie.title} (ID: ${movie.id})`);
        }
        
        // Rate limiting - pequeña pausa
        if (checked % 50 === 0) {
          console.log(`   📊 Revisadas ${checked} películas...`);
          await new Promise(r => setTimeout(r, 100));
        }
        
      } catch (e) {
        errors++;
        // ID no existe, continuar
      }
    }
    
    console.log(`\n📊 Resumen búsqueda por ID:`);
    console.log(`   - IDs revisados: ${checked}`);
    console.log(`   - Errores (IDs inexistentes): ${errors}`);
    console.log(`   - Películas argentinas encontradas: ${argentineMovies.length}`);
    
    if (argentineMovies.length > 0) {
      console.log('\n🇦🇷 Últimas películas argentinas agregadas a TMDB:');
      console.log('═'.repeat(60));
      
      for (const movie of argentineMovies) {
        console.log(`\n🎬 ${movie.title}`);
        if (movie.original_title !== movie.title) {
          console.log(`   Título original: ${movie.original_title}`);
        }
        console.log(`   ID: ${movie.id}`);
        console.log(`   Fecha estreno: ${movie.release_date || '(sin fecha)'}`);
        console.log(`   Países: ${movie.countries}`);
        if (movie.overview) {
          const overview = movie.overview.length > 150 
            ? movie.overview.substring(0, 150) + '...' 
            : movie.overview;
          console.log(`   Sinopsis: ${overview}`);
        }
        console.log(`   🔗 https://www.themoviedb.org/movie/${movie.id}`);
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getLatestArgentineMovies();