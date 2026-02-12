import { searchMovies, getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';

async function main() {
  // Buscar SIN año
  const result = await searchMovies("El verso");
  console.log("Sin año:", result.total_results, "resultados\n");
  
  for (const movie of result.results.slice(0, 5)) {
    const titleSim = Math.max(
      stringSimilarity("El verso", movie.title),
      stringSimilarity("El verso", movie.original_title)
    );
    const year = movie.release_date ? movie.release_date.slice(0,4) : '????';
    console.log(movie.id + ': "' + movie.title + '" (' + year + ') - Sim: ' + titleSim + '%');
  }
}

main().catch(console.error);
