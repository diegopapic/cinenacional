import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const movies = await prisma.movie.findMany({
    where: { title: { contains: 'Beltza', mode: 'insensitive' } },
    select: { id: true, title: true, year: true, tmdbId: true }
  });
  console.log(JSON.stringify(movies, null, 2));
  await prisma.$disconnect();
}
main();
