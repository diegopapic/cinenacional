import { searchMovies, getMovieDetails, TMDBMovie } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';

async function main() {
  const title = "Black is Beltza 2: Ainhoa";
  const year = 2022;
  
  console.log("Título original:", title);
  
  const allResults: TMDBMovie[] = [];
  const seenIds = new Set<number>();
  
  const addResults = (results: TMDBMovie[]) => {
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
      }
    }
  };

  // 1. Con año
  const s1 = await searchMovies(title, year);
  console.log("1. Con año:", s1.total_results, "resultados");
  addResults(s1.results);

  // 2. Sin año
  const s2 = await searchMovies(title);
  console.log("2. Sin año:", s2.total_results, "resultados");
  addResults(s2.results);

  // 3. Título limpio
  if (allResults.length === 0) {
    const cleanTitle = title
      .replace(/\s+[IVX]+\s*[:.-]?\s*/gi, ' ')
      .replace(/\s+\d+\s*[:.-]?\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log("3. Título limpio:", cleanTitle);
    const s3 = await searchMovies(cleanTitle);
    console.log("   Resultados:", s3.total_results);
    addResults(s3.results);
  }

  console.log("\nTotal combinados:", allResults.length);
  
  for (const r of allResults.slice(0, 3)) {
    const sim = stringSimilarity(title, r.title);
    console.log("  -", r.id, r.title, "(" + r.release_date?.slice(0,4) + ") - Sim:", sim + "%");
  }
}

main().catch(console.error);
