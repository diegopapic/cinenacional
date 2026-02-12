import { searchMovies, getMovieDetails, TMDBMovie, TMDBMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity, normalizeText } from './scripts/tmdb/utils';

interface LocalMovie {
  id: number;
  title: string;
  year: number | null;
  director_names: string | null;
}

function calculateMatchScore(local: LocalMovie, tmdb: TMDBMovieDetails) {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Comparar títulos
  const titleSimilarity = Math.max(
    stringSimilarity(local.title, tmdb.title),
    stringSimilarity(local.title, tmdb.original_title)
  );
  
  if (titleSimilarity >= 95) {
    score += 40;
    reasons.push('Título exacto (' + titleSimilarity + '%)');
  } else if (titleSimilarity >= 80) {
    score += 30;
    reasons.push('Título similar (' + titleSimilarity + '%)');
  } else if (titleSimilarity >= 60) {
    score += 15;
    reasons.push('Título parcial (' + titleSimilarity + '%)');
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
  
  // 3. Comparar director
  if (local.director_names && tmdb.credits?.crew) {
    const tmdbDirectors = tmdb.credits.crew
      .filter(c => c.job === 'Director')
      .map(c => normalizeText(c.name));
    
    const localDirectors = local.director_names
      .split(',')
      .map(d => normalizeText(d.trim()));
    
    const hasDirectorMatch = localDirectors.some(ld => 
      tmdbDirectors.some(td => stringSimilarity(ld, td) >= 80)
    );
    
    if (hasDirectorMatch) {
      score += 20; // directorMatchBonus
      reasons.push('Director coincide');
    }
  }
  
  // 4. País Argentina
  if (tmdb.production_countries?.some(c => c.iso_3166_1 === 'AR')) {
    score += 10; // argentinaCountryBonus
    reasons.push('Producción Argentina');
  }
  
  return { score, reasons };
}

async function main() {
  const movie: LocalMovie = {
    id: 2113,
    title: "El verso",
    year: 1995,
    director_names: "Santiago Carlos Oves"
  };

  console.log("=== Probando enrich-movies con El verso ===\n");
  console.log("Local:", movie.title, "(" + movie.year + ")");
  console.log("Director:", movie.director_names);
  console.log("");

  // Nueva lógica: combinar búsquedas
  const allResults: TMDBMovie[] = [];
  const seenIds = new Set<number>();

  if (movie.year) {
    const searchWithYear = await searchMovies(movie.title, movie.year);
    console.log("Búsqueda con año " + movie.year + ":", searchWithYear.total_results, "resultados");
    for (const r of searchWithYear.results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
      }
    }
  }

  const searchWithoutYear = await searchMovies(movie.title);
  console.log("Búsqueda sin año:", searchWithoutYear.total_results, "resultados");
  for (const r of searchWithoutYear.results) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      allResults.push(r);
    }
  }

  console.log("Total combinados:", allResults.length);
  console.log("\nEvaluando primeros 5 candidatos...\n");

  const candidates: Array<{tmdb: TMDBMovieDetails; score: number; reasons: string[]}> = [];

  for (const tmdbMovie of allResults.slice(0, 5)) {
    const details = await getMovieDetails(tmdbMovie.id);
    const { score, reasons } = calculateMatchScore(movie, details);
    
    if (score > 0) {
      candidates.push({ tmdb: details, score, reasons });
    }
    
    const year = details.release_date ? details.release_date.slice(0,4) : '????';
    console.log("  " + details.id + ": " + details.title + " (" + year + ") - Score: " + score);
    console.log("     Razones:", reasons.join('; '));
  }

  // Ordenar
  candidates.sort((a, b) => b.score - a.score);
  
  console.log("\n=== RESULTADO ===\n");
  if (candidates.length > 0) {
    const best = candidates[0];
    console.log("Mejor match:");
    console.log("  TMDB ID:", best.tmdb.id);
    console.log("  Título:", best.tmdb.title);
    console.log("  Año:", best.tmdb.release_date?.slice(0,4));
    console.log("  IMDB ID:", best.tmdb.imdb_id);
    console.log("  Score:", best.score);
    console.log("  Razones:", best.reasons.join('; '));
    
    // Verificar auto_accept
    const hasExactTitle = best.reasons.some(r => r.includes('Título exacto'));
    const hasDirectorMatch = best.reasons.some(r => r.includes('Director coincide'));
    
    if (best.score >= 80) {
      console.log("  Status: auto_accept (score >= 80)");
    } else if (hasExactTitle && hasDirectorMatch) {
      console.log("  Status: auto_accept (título exacto + director)");
    } else if (best.score >= 50) {
      console.log("  Status: review");
    } else {
      console.log("  Status: no_match");
    }
  } else {
    console.log("Sin match");
  }
}

main().catch(console.error);
