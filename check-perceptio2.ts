import { searchMovies, getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';

async function main() {
  const localTitle = "Perceptio";
  const localYear = 2009;
  const localDirector = "Nicolás Giarrusso";

  console.log("=== Buscando Perceptio ===\n");

  const results = await searchMovies("Perceptio");
  console.log("Resultados para 'Perceptio':", results.total_results);

  for (const r of results.results) {
    const details = await getMovieDetails(r.id);
    const sim = stringSimilarity(localTitle, details.title);
    const directors = details.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name) || [];

    console.log(`\n  ${r.id}: "${details.title}" (${details.release_date?.slice(0,4)})`);
    console.log(`    Similitud: ${sim}%`);
    console.log(`    Países: ${details.production_countries?.map(c => c.iso_3166_1).join(', ')}`);
    console.log(`    Director: ${directors.join(', ') || 'N/A'}`);

    // Verificar si el director local coincide
    const dirMatch = directors.some(d => stringSimilarity(localDirector, d) >= 80);
    console.log(`    ¿Director coincide? ${dirMatch ? 'SÍ' : 'NO'}`);
  }

  // Buscar también "Perception"
  console.log("\n=== Buscando Perception ===\n");
  const results2 = await searchMovies("Perception", 2009);
  console.log("Resultados para 'Perception' (2009):", results2.total_results);

  for (const r of results2.results.slice(0, 5)) {
    const details = await getMovieDetails(r.id);
    const sim = stringSimilarity(localTitle, details.title);
    const directors = details.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name) || [];

    console.log(`\n  ${r.id}: "${details.title}" (${details.release_date?.slice(0,4)})`);
    console.log(`    Similitud: ${sim}%`);
    console.log(`    Director: ${directors.join(', ') || 'N/A'}`);

    const dirMatch = directors.some(d => stringSimilarity(localDirector, d) >= 80);
    console.log(`    ¿Director coincide? ${dirMatch ? 'SÍ' : 'NO'}`);
  }
}

main().catch(console.error);
