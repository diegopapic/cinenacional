import { searchMovies, getMovieDetails, testConnection } from './scripts/tmdb/tmdb-client';
import { stringSimilarity, normalizeText } from './scripts/tmdb/utils';

async function main() {
  const local = {
    title: "El verso",
    year: 1995,
    director: "Santiago Carlos Oves"
  };

  console.log("Buscando:", local.title, local.year);
  
  // Buscar con año
  let result = await searchMovies(local.title, local.year);
  console.log("\nCon año 1995:", result.total_results, "resultados");
  
  if (result.total_results === 0) {
    // Sin año
    result = await searchMovies(local.title);
    console.log("Sin año:", result.total_results, "resultados");
  }
  
  if (result.results.length > 0) {
    console.log("\nPrimer resultado:");
    const first = result.results[0];
    console.log("  TMDB ID:", first.id);
    console.log("  Título:", first.title);
    console.log("  Original:", first.original_title);
    console.log("  Fecha:", first.release_date);
    
    const titleSim = Math.max(
      stringSimilarity(local.title, first.title),
      stringSimilarity(local.title, first.original_title)
    );
    console.log("  Similitud título:", titleSim + "%");
    
    const tmdbYear = parseInt(first.release_date?.split('-')[0] || '0');
    console.log("  Diferencia año:", Math.abs(local.year - tmdbYear));
    
    // Obtener detalles con créditos
    const details = await getMovieDetails(first.id);
    const directors = details.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name) || [];
    console.log("  Directores TMDB:", directors.join(', '));
    console.log("  IMDB ID:", details.imdb_id);
    
    // Comparar director
    const localDirNorm = normalizeText(local.director);
    const hasMatch = directors.some(d => stringSimilarity(local.director, d) >= 80);
    console.log("  Director match:", hasMatch);
  }
}

main().catch(console.error);
