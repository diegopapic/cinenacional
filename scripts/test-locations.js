// test-locations.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const locations = await prisma.location.findMany({
    take: 5
  });
  console.log('Locations:', locations);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());