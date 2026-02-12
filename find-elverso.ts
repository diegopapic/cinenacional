import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movies = await prisma.movie.findMany({
    where: { tmdbId: null },
    select: { id: true, title: true, year: true },
    orderBy: [{ year: 'desc' }, { id: 'asc' }]
  });
  
  console.log('Total sin tmdb_id:', movies.length);
  
  const idx = movies.findIndex(m => m.id === 2113);
  if (idx >= 0) {
    console.log('El verso está en posición:', idx);
    console.log('Película:', movies[idx]);
  } else {
    console.log('El verso no encontrado en películas sin tmdb_id');
    
    // Verificar si tiene tmdb_id
    const elverso = await prisma.movie.findFirst({ where: { id: 2113 }, select: { id: true, title: true, tmdbId: true }});
    console.log('El verso en DB:', elverso);
  }
  
  await prisma.$disconnect();
}
main();
