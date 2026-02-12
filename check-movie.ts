import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movie = await prisma.movie.findFirst({
    where: { id: 2113 },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      imdbId: true,
      crew: {
        where: { role: { department: 'DIRECCION' } },
        select: { person: { select: { firstName: true, lastName: true } } }
      }
    }
  });
  console.log(JSON.stringify(movie, null, 2));
  await prisma.$disconnect();
}
main();
