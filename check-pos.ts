import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Ver posición actual de 191146 en el orden
  const beforeCount = await prisma.movie.count({
    where: {
      imdbId: { not: null },
      OR: [
        { imdbVotesUpdatedAt: null, id: { lt: 191146 } },
      ]
    }
  });
  
  console.log('Películas con imdbVotesUpdatedAt=null e id < 191146:', beforeCount);
  
  // Total sin procesar
  const totalNull = await prisma.movie.count({
    where: {
      imdbId: { not: null },
      imdbVotesUpdatedAt: null
    }
  });
  console.log('Total películas sin procesar:', totalNull);
  
  await prisma.$disconnect();
}
main();
