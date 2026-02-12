import { getPool, closePool } from './scripts/tmdb/utils';

async function main() {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      m.id, m.title, m.year, m.duration,
      STRING_AGG(CONCAT(p.first_name, ' ', p.last_name), ', ') as directors
    FROM movies m
    LEFT JOIN movie_crew mc ON m.id = mc.movie_id AND mc.role_id = 2
    LEFT JOIN people p ON mc.person_id = p.id
    WHERE m.title ILIKE '%residencia%' AND m.year = 2022
    GROUP BY m.id, m.title, m.year, m.duration
  `);

  console.log("Películas 'La residencia' (2022):");
  console.log(result.rows);

  await closePool();
}

main().catch(console.error);
