import { getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';

async function main() {
  const localTitle = "Perceptio";
  const localYear = 2009;

  // El match incorrecto
  console.log("=== Match incorrecto (tt1047514) ===");
  const wrong = await getMovieDetails(21474); // Perception (2009) - tt1047514
  console.log("Título:", wrong.title);
  console.log("Año:", wrong.release_date?.slice(0,4));
  console.log("Países:", wrong.production_countries?.map(c => c.iso_3166_1));
  console.log("Director:", wrong.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name));

  const simWrong = stringSimilarity(localTitle, wrong.title);
  console.log("Similitud:", simWrong + "%");

  // El match correcto
  console.log("\n=== Match correcto (408148) ===");
  const correct = await getMovieDetails(408148);
  console.log("Título:", correct.title);
  console.log("Año:", correct.release_date?.slice(0,4));
  console.log("Países:", correct.production_countries?.map(c => c.iso_3166_1));
  console.log("Director:", correct.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name));

  const simCorrect = stringSimilarity(localTitle, correct.title);
  console.log("Similitud:", simCorrect + "%");
}

main().catch(console.error);
