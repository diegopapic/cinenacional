import { searchMovies, getMovieDetails, TMDBMovie } from './scripts/tmdb/tmdb-client';
import { stringSimilarity, normalizeText } from './scripts/tmdb/utils';

async function main() {
  const movie = {
    title: "El verso",
    year: 1995,
    director_names: "Santiago Carlos Oves"
  };

  console.log("Buscando:", movie.title, "(" + movie.year + ")");
  console.log("Director local:", movie.director_names);
  console.log("");

  // Nueva lógica: combinar búsquedas
  const allResults: TMDBMovie[] = [];
  const seenIds = new Set<number>();

  // Con año
  const searchWithYear = await searchMovies(movie.title, movie.year);
  console.log("Con año:", searchWithYear.total_results, "resultados");
  for (const r of searchWithYear.results) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      allResults.push(r);
    }
  }

  // Sin año
  const searchWithoutYear = await searchMovies(movie.title);
  console.log("Sin año:", searchWithoutYear.total_results, "resultados");
  for (const r of searchWithoutYear.results) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      allResults.push(r);
    }
  }

  console.log("Total únicos:", allResults.length);
  console.log("\nPrimeros 5 candidatos:");

  for (const tmdb of allResults.slice(0, 5)) {
    const titleSim = Math.max(
      stringSimilarity(movie.title, tmdb.title),
      stringSimilarity(movie.title, tmdb.original_title)
    );
    const year = tmdb.release_date ? tmdb.release_date.slice(0,4) : '????';
    
    // Obtener detalles
    const details = await getMovieDetails(tmdb.id);
    const directors = details.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name) || [];
    
    // Verificar director
    const localDirs = movie.director_names.split(',').map(d => d.trim());
    const hasDirectorMatch = localDirs.some(ld => 
      directors.some(td => stringSimilarity(ld, td) >= 80)
    );
    
    console.log("");
    console.log("  ID:", tmdb.id);
    console.log("  Título:", tmdb.title, "(" + year + ")");
    console.log("  Similitud:", titleSim + "%");
    console.log("  Director TMDB:", directors.join(', '));
    console.log("  Director match:", hasDirectorMatch);
    console.log("  IMDB:", details.imdb_id);
  }
}

main().catch(console.error);
