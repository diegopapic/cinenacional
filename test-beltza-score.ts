import { getMovieDetails } from './scripts/tmdb/tmdb-client';
import { normalizeText, stringSimilarity } from './scripts/tmdb/utils';
import config from './scripts/tmdb/config';

async function main() {
  // Datos locales
  const local = {
    title: "Black is Beltza 2: Ainhoa",
    year: 2022,
    duration: null,
    director_names: null // ¿Tiene director en la BD local?
  };

  // TMDB ID correcto
  const tmdbId = 814773;

  console.log("=== Calculando score para Black is Beltza ===\n");
  console.log("Local:", local);

  const tmdb = await getMovieDetails(tmdbId);
  console.log("\nTMDB:", {
    id: tmdb.id,
    title: tmdb.title,
    original_title: tmdb.original_title,
    release_date: tmdb.release_date,
    runtime: tmdb.runtime,
    countries: tmdb.production_countries?.map(c => c.iso_3166_1),
    directors: tmdb.credits?.crew?.filter(c => c.job === 'Director').map(c => c.name)
  });

  // Calcular score manualmente
  let score = 0;
  const reasons: string[] = [];

  // 1. Comparar títulos
  const titleSimilarity = Math.max(
    stringSimilarity(local.title, tmdb.title),
    stringSimilarity(local.title, tmdb.original_title)
  );

  console.log(`\nSimilitud título: ${titleSimilarity}%`);

  if (titleSimilarity >= 95) {
    score += 40;
    reasons.push(`Título exacto (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 80) {
    score += 30;
    reasons.push(`Título similar (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 60) {
    score += 15;
    reasons.push(`Título parcial (${titleSimilarity}%)`);
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

  // 3. Director (no hay en local)
  if (local.director_names && tmdb.credits?.crew) {
    const tmdbDirectors = tmdb.credits.crew
      .filter(c => c.job === 'Director')
      .map(c => normalizeText(c.name));

    const localDirectors = local.director_names
      .split(',')
      .map((d: string) => normalizeText(d.trim()));

    const hasDirectorMatch = localDirectors.some((ld: string) =>
      tmdbDirectors.some(td => stringSimilarity(ld, td) >= 80)
    );

    if (hasDirectorMatch) {
      score += config.matching.movie.directorMatchBonus;
      reasons.push('Director coincide');
    }
  }

  // 4. País Argentina
  if (tmdb.production_countries?.some(c => c.iso_3166_1 === 'AR')) {
    score += config.matching.movie.argentinaCountryBonus;
    reasons.push('Producción Argentina');
  }

  // 5. Duración
  if (local.duration && tmdb.runtime) {
    const diff = Math.abs(local.duration - tmdb.runtime);
    if (diff <= config.matching.movie.durationToleranceMinutes) {
      score += config.matching.movie.durationMatchBonus;
      reasons.push(`Duración similar (±${diff}min)`);
    }
  }

  console.log("\n=== RESULTADO ===");
  console.log(`Score: ${score}`);
  console.log(`Razones: ${reasons.join('; ')}`);
  console.log(`\nUmbrales:`);
  console.log(`  autoAcceptScore: ${config.matching.movie.autoAcceptScore}`);
  console.log(`  reviewScore: ${config.matching.movie.reviewScore}`);

  if (score >= config.matching.movie.autoAcceptScore) {
    console.log(`\n✅ AUTO_ACCEPT (score ${score} >= ${config.matching.movie.autoAcceptScore})`);
  } else if (score >= config.matching.movie.reviewScore) {
    console.log(`\n🔍 REVIEW (score ${score} >= ${config.matching.movie.reviewScore})`);
  } else {
    console.log(`\n➖ NO_MATCH (score ${score} < ${config.matching.movie.reviewScore})`);
  }
}

main().catch(console.error);
