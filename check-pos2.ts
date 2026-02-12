import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Buscar la posición de la película 191146 en las no procesadas
  const notProcessed = await prisma.movie.findMany({
    where: { 
      imdbId: { not: null },
      imdbVotes: null  // --only-missing busca esto
    },
    select: { id: true },
    orderBy: [
      { imdbVotesUpdatedAt: { sort: 'asc', nulls: 'first' } },
      { id: 'asc' }
    ]
  });
  
  const idx = notProcessed.findIndex(m => m.id === 191146);
  console.log('Posición de 191146 en películas sin votes:', idx);
  console.log('Total sin votes:', notProcessed.length);
  
  await prisma.$disconnect();
}
main();
