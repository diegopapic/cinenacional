import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Resumen del problema
  console.log('=== RESUMEN DEL PROBLEMA DE DIRECTORES BORRADOS ===\n');

  // 1. Total de películas sin director
  const totalNoDirector = await prisma.$queryRaw<[{count: bigint}]>`
    SELECT COUNT(*) as count FROM movies m
    WHERE NOT EXISTS (
      SELECT 1 FROM movie_crew mc WHERE mc.movie_id = m.id AND mc.role_id = 2
    )
  `;
  console.log(`Total películas sin director: ${totalNoDirector[0].count.toString()}`);

  // 2. Desglose por fecha
  const byDate = await prisma.$queryRaw<{date: string, count: bigint}[]>`
    SELECT DATE(m.updated_at) as date, COUNT(*) as count
    FROM movies m
    WHERE NOT EXISTS (
      SELECT 1 FROM movie_crew mc WHERE mc.movie_id = m.id AND mc.role_id = 2
    )
    AND m.updated_at > '2026-01-01'
    GROUP BY DATE(m.updated_at)
    ORDER BY date DESC
  `;
  console.log('\nPelículas sin director por fecha (enero 2026):');
  byDate.forEach(row => {
    console.log(`  ${row.date}: ${row.count.toString()} películas`);
  });

  // 3. Películas sin director del 24 de enero con título NO duplicado
  // (estas podrían haber perdido el director por otra razón)
  const uniqueTitles = await prisma.$queryRaw<{id: number, title: string, year: number | null}[]>`
    SELECT m.id, m.title, m.year
    FROM movies m
    WHERE NOT EXISTS (
      SELECT 1 FROM movie_crew mc WHERE mc.movie_id = m.id AND mc.role_id = 2
    )
    AND DATE(m.updated_at) = '2026-01-24'
    AND (
      SELECT COUNT(*) FROM movies m2 WHERE LOWER(m2.title) = LOWER(m.title)
    ) = 1
    ORDER BY m.title
  `;
  console.log(`\nPelículas sin director del 24/1 con título ÚNICO (no duplicado): ${uniqueTitles.length}`);
  uniqueTitles.slice(0, 10).forEach(m => {
    console.log(`  ${m.id}: "${m.title}" (${m.year || '?'})`);
  });
  if (uniqueTitles.length > 10) {
    console.log(`  ... y ${uniqueTitles.length - 10} más`);
  }

  // 4. Películas sin director del 24 de enero con título duplicado
  const duplicateTitles = await prisma.$queryRaw<{id: number, title: string, year: number | null, dup_count: bigint}[]>`
    SELECT m.id, m.title, m.year,
      (SELECT COUNT(*) FROM movies m2 WHERE LOWER(m2.title) = LOWER(m.title)) as dup_count
    FROM movies m
    WHERE NOT EXISTS (
      SELECT 1 FROM movie_crew mc WHERE mc.movie_id = m.id AND mc.role_id = 2
    )
    AND DATE(m.updated_at) = '2026-01-24'
    AND (
      SELECT COUNT(*) FROM movies m2 WHERE LOWER(m2.title) = LOWER(m.title)
    ) > 1
    ORDER BY dup_count DESC, m.title
  `;
  console.log(`\nPelículas sin director del 24/1 con título DUPLICADO: ${duplicateTitles.length}`);
  duplicateTitles.slice(0, 20).forEach(m => {
    console.log(`  ${m.id}: "${m.title}" (${m.year || '?'}) - ${m.dup_count.toString()} duplicados`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
