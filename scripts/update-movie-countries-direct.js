// scripts/update-movie-countries-direct.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCountryIds() {
  // Primero verificar el estado actual
  const count = await prisma.$queryRaw`
    SELECT COUNT(*) as total FROM movie_countries
  `;
  console.log(`Total registros en movie_countries: ${count[0].total}`);

  // Eliminar la constraint antigua
  console.log('Eliminando constraint antigua...');
  await prisma.$executeRaw`
    ALTER TABLE movie_countries 
    DROP CONSTRAINT IF EXISTS movie_countries_country_id_fkey
  `;

  // Mapeo directo
  const countryMap = {
    401: 1903, // España
    402: 1904, // Perú
    403: 1905, // Francia
    404: 1906, // Uruguay
    405: 1907, // Alemania
    406: 1908, // Chile
    407: 1909, // Italia
    408: 1910, // Corea del Sur
    409: 1911, // Bolivia
    410: 1912, // Paraguay
    411: 1913, // Brasil
    412: 1914, // Venezuela
    413: 1915, // Suiza
    414: 1916, // Panamá
    415: 1917, // Suecia
    416: 1918, // Canadá
    417: 1919, // Países Bajos
    418: 1920, // Estados Unidos
    419: 1921, // Taiwán
    420: 1922, // México
    421: 1923, // Inglaterra
    422: 1924, // Polonia
    423: 1925, // República Checa
    424: 1926, // Bélgica
    425: 1927, // Australia
    426: 1928, // Austria
    427: 1929, // República Dominicana
    428: 1930, // Catar
    429: 1931, // Cuba
    430: 1932, // Rumania
    431: 1933, // China
    432: 1934, // Ecuador
    433: 1935, // Dinamarca
    434: 1936, // Noruega
    435: 1937, // Portugal
    436: 1938, // Túnez
    437: 1940, // Puerto Rico
    438: 1941, // Grecia
    439: 3818, // Guatemala (necesitas crearlo primero en locations)
    440: 1943, // India
    441: 1944, // Yugoslavia
    442: 1945, // Turquía
    443: 1946, // Mali
    444: 1947, // Japón
    445: 1948, // Finlandia
    446: 1949, // Irán
    447: 1950, // Israel
    448: 1951, // Nueva Zelanda
    449: 1952, // Costa Rica
    450: 1953, // Guinea
    451: 1954, // Angola
    452: 1955, // Etiopía
    453: 1956, // Eslovenia
    454: 1957, // Palestina
    455: 1958, // Nueva Caledonia
    456: 1959, // Marruecos
    457: 1960, // Islandia
    458: 1961, // Namibia
    459: 1962, // Burkina Faso
    460: 1963, // Sudáfrica
    461: 1964, // Colombia
    462: 1965, // Serbia
    463: 1966, // Honduras
    464: 1967, // Singapur
    465: 1968, // Bulgaria
    466: 1977, // Rusia
  };

  console.log('Actualizando IDs...');
  let totalUpdated = 0;
  
  for (const [oldId, newId] of Object.entries(countryMap)) {
    const result = await prisma.$executeRaw`
      UPDATE movie_countries 
      SET country_id = ${newId}
      WHERE country_id = ${parseInt(oldId)}
    `;
    if (result > 0) {
      console.log(`✅ ${oldId} -> ${newId}: ${result} registros actualizados`);
      totalUpdated += result;
    }
  }
  
  console.log(`\nTotal de registros actualizados: ${totalUpdated}`);

  // Crear nueva constraint apuntando a locations
  console.log('\nCreando nueva constraint...');
  await prisma.$executeRaw`
    ALTER TABLE movie_countries 
    ADD CONSTRAINT movie_countries_country_id_fkey 
    FOREIGN KEY (country_id) 
    REFERENCES locations(id) 
    ON DELETE CASCADE
  `;

  console.log('✅ Migración completada');
  
  // Verificar
  const sample = await prisma.$queryRaw`
    SELECT mc.movie_id, mc.country_id, l.name 
    FROM movie_countries mc
    JOIN locations l ON mc.country_id = l.id
    LIMIT 5
  `;
  console.log('\nMuestra de verificación:', sample);
}

updateCountryIds().catch(console.error).finally(() => prisma.$disconnect());