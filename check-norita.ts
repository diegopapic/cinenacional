import { searchMovies, getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';
import config from './scripts/tmdb/config';

async function main() {
  const localTitle = "Norita, Nora Cortiñas";
  const localYear = 2018;

  console.log("=== Simulando búsqueda como el script ===\n");
  console.log("Título local:", localTitle);
  console.log("Año local:", localYear);

  const allResults: any[] = [];
  const seenIds = new Set<number>();

  const addResults = (results: any[], source: string) => {
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
        console.log(`  + ${r.id}: "${r.title}" (${r.release_date?.slice(0,4)}) [${source}]`);
      }
    }
  };

  // 1. Con año
  console.log("\n1. Búsqueda con año:");
  const s1 = await searchMovies(localTitle, localYear);
  addResults(s1.results, "con año");

  // 2. Sin año
  console.log("\n2. Búsqueda sin año:");
  const s2 = await searchMovies(localTitle);
  addResults(s2.results, "sin año");

  // 3. Título limpio
  if (allResults.length === 0) {
    console.log("\n3. Sin resultados, probando título limpio...");
  }

  // 4. Parte antes de la coma
  if (allResults.length === 0 && localTitle.includes(',')) {
    const firstPart = localTitle.split(',')[0].trim();
    console.log(`\n4. Buscando parte antes de coma: "${firstPart}"`);
    const s4 = await searchMovies(firstPart);
    addResults(s4.results, "antes de coma");
  }

  console.log(`\nTotal resultados: ${allResults.length}`);

  // Calcular scores
  if (allResults.length > 0) {
    console.log("\n=== Calculando scores ===");
    for (const r of allResults.slice(0, 3)) {
      const details = await getMovieDetails(r.id);
      const sim = Math.max(
        stringSimilarity(localTitle, details.title),
        stringSimilarity(localTitle, details.original_title)
      );

      let score = 0;
      const reasons: string[] = [];

      if (sim >= 95) { score += 40; reasons.push(`Título exacto (${sim}%)`); }
      else if (sim >= 80) { score += 30; reasons.push(`Título similar (${sim}%)`); }
      else if (sim >= 60) { score += 15; reasons.push(`Título parcial (${sim}%)`); }

      const tmdbYear = parseInt(details.release_date?.split('-')[0] || '0');
      if (localYear === tmdbYear) { score += 25; reasons.push('Año exacto'); }
      else if (Math.abs(localYear - tmdbYear) === 1) { score += 15; reasons.push('Año ±1'); }

      if (details.production_countries?.some((c: any) => c.iso_3166_1 === 'AR')) {
        score += 20;
        reasons.push('Argentina');
      }

      console.log(`\n  ${r.id}: "${details.title}" (${tmdbYear})`);
      console.log(`    Score: ${score} - ${reasons.join('; ')}`);
      console.log(`    IMDB: ${details.imdb_id || 'N/A'}`);
      console.log(`    ¿Auto-accept? ${score >= config.matching.movie.autoAcceptScore ? 'SÍ' : 'NO'}`);
    }
  }
}

main().catch(console.error);
