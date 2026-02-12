import { searchMovies, getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';

async function main() {
  const localTitle = "Black is Beltza 2: Ainhoa";
  const year = 2022;

  console.log("=== Test búsqueda: Black Is Beltza ===\n");
  console.log("Título local:", localTitle);
  console.log("Año local:", year);

  // Simular la lógica del script
  const allResults: any[] = [];
  const seenIds = new Set<number>();

  const addResults = (results: any[], source: string) => {
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
        console.log(`  + ${r.id}: ${r.title} (${r.release_date?.slice(0,4)}) [desde ${source}]`);
      }
    }
  };

  // 1. Con año
  console.log("\n1. Búsqueda CON año:");
  const s1 = await searchMovies(localTitle, year);
  console.log(`   Resultados: ${s1.total_results}`);
  addResults(s1.results, "con año");

  // 2. Sin año
  console.log("\n2. Búsqueda SIN año:");
  const s2 = await searchMovies(localTitle);
  console.log(`   Resultados: ${s2.total_results}`);
  addResults(s2.results, "sin año");

  // 3. Título limpio (sin números de secuela)
  if (allResults.length === 0) {
    console.log("\n3. Sin resultados, intentando con título limpio...");

    const cleanTitle = localTitle
      .replace(/\b[IVX]{2,}\b\s*[:.-]?\s*/g, ' ')  // Romanos: II, III, IV, VI, etc.
      .replace(/\b\d+\s*[:.-]\s*/g, ' ')            // Arábigos seguidos de : o -
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`   Título limpio: "${cleanTitle}"`);

    if (cleanTitle !== localTitle && cleanTitle.length > 3) {
      const s3 = await searchMovies(cleanTitle);
      console.log(`   Resultados: ${s3.total_results}`);
      addResults(s3.results, "título limpio");
    }
  }

  console.log(`\nTotal combinados: ${allResults.length}`);

  // Verificar similitud con el resultado esperado
  if (allResults.length > 0) {
    console.log("\n=== Verificando matches ===");
    for (const r of allResults.slice(0, 5)) {
      const simTitle = stringSimilarity(localTitle, r.title);
      const simOriginal = stringSimilarity(localTitle, r.original_title);
      console.log(`  ${r.id}: "${r.title}" (${r.release_date?.slice(0,4)})`);
      console.log(`      Sim título: ${simTitle}%, Sim original: ${simOriginal}%`);

      // Obtener detalles para ver imdb_id
      if (r.id === 814773) {
        const details = await getMovieDetails(r.id);
        console.log(`      IMDB: ${details.imdb_id || 'N/A'}`);
        console.log(`      ** Este es el ID correcto (814773) **`);
      }
    }
  }
}

main().catch(console.error);
