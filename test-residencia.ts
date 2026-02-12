import { searchMovies, getMovieDetails } from './scripts/tmdb/tmdb-client';
import { normalizeText, stringSimilarity } from './scripts/tmdb/utils';
import config from './scripts/tmdb/config';

async function main() {
  const local = {
    title: "La residencia",
    year: 2022,
    duration: null,
    director_names: null
  };

  console.log("=== Investigando match de La residencia ===\n");
  console.log("Local:", local);

  // Buscar en TMDB
  const results1 = await searchMovies(local.title, local.year);
  const results2 = await searchMovies(local.title);

  console.log("\nResultados con año:", results1.total_results);
  console.log("Resultados sin año:", results2.total_results);

  // Combinar resultados
  const allResults = [...results1.results];
  const seenIds = new Set(results1.results.map(r => r.id));
  for (const r of results2.results) {
    if (!seenIds.has(r.id)) {
      allResults.push(r);
    }
  }

  console.log("\nPrimeros 5 resultados combinados:");
  for (const r of allResults.slice(0, 5)) {
    const sim = Math.max(
      stringSimilarity(local.title, r.title),
      stringSimilarity(local.title, r.original_title)
    );
    console.log(`  - ${r.id}: "${r.title}" / "${r.original_title}" (${r.release_date?.slice(0,4)}) - Sim: ${sim}%`);
  }

  // Analizar el match incorrecto (¡Bienvenida, Violeta!)
  console.log("\n=== Buscando ¡Bienvenida, Violeta! ===");
  const violetaSearch = await searchMovies("Bienvenida Violeta");
  if (violetaSearch.results.length > 0) {
    const violeta = violetaSearch.results[0];
    console.log("Encontrado:", violeta.id, violeta.title, violeta.release_date);

    const details = await getMovieDetails(violeta.id);
    console.log("Países:", details.production_countries?.map(c => c.iso_3166_1));
    console.log("Directores:", details.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name));

    // Calcular score
    const sim = Math.max(
      stringSimilarity(local.title, details.title),
      stringSimilarity(local.title, details.original_title)
    );
    console.log("\nSimilitud título:", sim + "%");

    let score = 0;
    if (sim >= 95) score += 40;
    else if (sim >= 80) score += 30;
    else if (sim >= 60) score += 15;

    const tmdbYear = parseInt(details.release_date?.split('-')[0] || '0');
    if (local.year === tmdbYear) {
      score += 25;
      console.log("Año exacto: +25");
    } else if (Math.abs(local.year - tmdbYear) === 1) {
      score += 15;
      console.log("Año ±1: +15");
    }

    if (details.production_countries?.some(c => c.iso_3166_1 === 'AR')) {
      score += config.matching.movie.argentinaCountryBonus;
      console.log("Argentina: +" + config.matching.movie.argentinaCountryBonus);
    }

    console.log("\nScore total:", score);
    console.log("autoAcceptScore:", config.matching.movie.autoAcceptScore);
  }
}

main().catch(console.error);
