import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Verificar películas que no fueron procesadas pero tienen imdbId
  const notProcessed = await prisma.movie.findMany({
    where: { 
      imdbId: { not: null },
      imdbVotesUpdatedAt: null 
    },
    select: { id: true, title: true, imdbId: true },
    orderBy: { id: 'asc' },
    take: 20
  });
  console.log('Películas no procesadas (primeras 20):');
  notProcessed.forEach(m => console.log(`  ${m.id}: ${m.title} (${m.imdbId})`));
  
  // Verificar si la película 191146 tiene alguna particularidad
  const movie191146 = await prisma.movie.findUnique({
    where: { id: 191146 },
    select: { id: true, title: true, imdbId: true, tmdbId: true, releaseDate: true }
  });
  console.log('\nPelícula 191146:', movie191146);
  
  await prisma.$disconnect();
}
main();
