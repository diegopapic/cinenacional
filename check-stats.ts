import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const totalWithImdb = await prisma.movie.count({ where: { imdbId: { not: null } } });
  const withVotes = await prisma.movie.count({ where: { imdbId: { not: null }, imdbVotes: { not: null } } });
  const withoutVotes = await prisma.movie.count({ where: { imdbId: { not: null }, imdbVotes: null } });
  const notProcessed = await prisma.movie.count({ where: { imdbId: { not: null }, imdbVotesUpdatedAt: null } });
  console.log('Total películas con imdbId:', totalWithImdb);
  console.log('Con imdbVotes:', withVotes);
  console.log('Sin imdbVotes (null):', withoutVotes);
  console.log('Nunca procesadas (imdbVotesUpdatedAt null):', notProcessed);
  await prisma.$disconnect();
}
main();
