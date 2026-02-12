import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Ver posición de la película 191146 en el orden de procesamiento
  const whereClause = { imdbId: { not: null } };
  
  // Verificar cuántas películas vienen antes de 191146 en el orden
  const movie = await prisma.movie.findUnique({
    where: { id: 191146 },
    select: { id: true, imdbVotesUpdatedAt: true }
  });
  
  console.log('Película 191146:', movie);
  
  // Cuántas películas con imdbVotesUpdatedAt NULL y id < 191146
  const countBefore = await prisma.movie.count({
    where: {
      imdbId: { not: null },
      OR: [
        { imdbVotesUpdatedAt: null, id: { lt: 191146 } },
        { imdbVotesUpdatedAt: { not: null } }
      ]
    }
  });
  
  console.log('Películas que deberían procesarse antes (aprox):', countBefore);
  
  // Mostrar algunas películas cercanas en el orden
  const nearby = await prisma.movie.findMany({
    where: { imdbId: { not: null } },
    select: { id: true, title: true, imdbVotesUpdatedAt: true },
    orderBy: [
      { imdbVotesUpdatedAt: { sort: 'asc', nulls: 'first' } },
      { id: 'asc' }
    ],
    skip: 7850,
    take: 20
  });
  
  console.log('\nPelículas en posiciones 7850-7870:');
  nearby.forEach((m, i) => console.log(`  ${7850+i}: id=${m.id}, updatedAt=${m.imdbVotesUpdatedAt}, title=${m.title}`));
  
  await prisma.$disconnect();
}
main();
