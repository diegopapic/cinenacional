import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movies = await prisma.movie.findMany({
    where: { 
      tmdbId: null,
      title: { contains: 'verso', mode: 'insensitive' }
    },
    select: { id: true, title: true, year: true },
    orderBy: [{ year: 'desc' }, { id: 'asc' }]
  });
  
  console.log('Películas con "verso" sin tmdb_id:');
  movies.forEach(m => console.log('  ', m.id, m.title, '(' + m.year + ')'));
  
  await prisma.$disconnect();
}
main();
