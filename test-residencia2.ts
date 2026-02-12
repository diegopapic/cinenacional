import { getMovieDetails } from './scripts/tmdb/tmdb-client';
import { stringSimilarity } from './scripts/tmdb/utils';
import config from './scripts/tmdb/config';

async function main() {
  const local = {
    title: "La residencia",
    year: 2022,
  };

  // Analizar las películas con título exacto
  const ids = [64624, 1395377, 976740];

  for (const id of ids) {
    console.log(`\n=== TMDB ID ${id} ===`);
    const details = await getMovieDetails(id);
    console.log("Título:", details.title);
    console.log("Original:", details.original_title);
    console.log("Año:", details.release_date?.slice(0, 4) || 'sin fecha');
    console.log("Países:", details.production_countries?.map(c => c.iso_3166_1));
    console.log("IMDB:", details.imdb_id);

    const sim = Math.max(
      stringSimilarity(local.title, details.title),
      stringSimilarity(local.title, details.original_title)
    );

    let score = 0;
    const reasons: string[] = [];

    // Título
    if (sim >= 95) {
      score += 40;
      reasons.push(`Título exacto (${sim}%): +40`);
    } else if (sim >= 80) {
      score += 30;
      reasons.push(`Título similar (${sim}%): +30`);
    } else if (sim >= 60) {
      score += 15;
      reasons.push(`Título parcial (${sim}%): +15`);
    } else {
      reasons.push(`Título bajo (${sim}%): +0`);
    }

    // Año
    const tmdbYear = parseInt(details.release_date?.split('-')[0] || '0');
    if (local.year === tmdbYear) {
      score += 25;
      reasons.push("Año exacto: +25");
    } else if (tmdbYear && Math.abs(local.year - tmdbYear) === 1) {
      score += 15;
      reasons.push("Año ±1: +15");
    } else {
      reasons.push(`Año diferente (${tmdbYear || 'N/A'}): +0`);
    }

    // Argentina
    if (details.production_countries?.some(c => c.iso_3166_1 === 'AR')) {
      score += config.matching.movie.argentinaCountryBonus;
      reasons.push("Argentina: +20");
    }

    console.log("\nCálculo:");
    reasons.forEach(r => console.log("  " + r));
    console.log("  TOTAL:", score);
    console.log("  ¿Auto-accept?", score >= config.matching.movie.autoAcceptScore ? "SÍ" : "NO");
  }
}

main().catch(console.error);
