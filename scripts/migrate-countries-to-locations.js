// scripts/migrate-countries-to-locations.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateCountriesToLocations() {
  console.log('🚀 Iniciando migración de countries a locations...');
  
  try {
    // 1. Obtener todos los países de la tabla countries
    const countries = await prisma.country.findMany();
    console.log(`📊 Encontrados ${countries.length} países en tabla countries`);
    
    // 2. Obtener todos los países de la tabla locations (sin parent_id = son países)
    const locationCountries = await prisma.location.findMany({
      where: {
        parentId: null
      }
    });
    console.log(`📊 Encontrados ${locationCountries.length} países (top-level) en tabla locations`);
    
    // 3. Crear un mapa de correspondencia
    const countryToLocationMap = new Map();
    const notFoundCountries = [];
    
    for (const country of countries) {
      // Buscar el país en locations por nombre (normalizado)
      const locationCountry = locationCountries.find(loc => {
        const normalizedLocName = loc.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedCountryName = country.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return normalizedLocName === normalizedCountryName;
      });
      
      if (locationCountry) {
        countryToLocationMap.set(country.id, locationCountry.id);
        console.log(`✅ Mapeado: ${country.name} (countries.id=${country.id}) -> ${locationCountry.name} (locations.id=${locationCountry.id})`);
      } else {
        notFoundCountries.push(country);
        console.log(`⚠️ No encontrado en locations: ${country.name} (code: ${country.code})`);
      }
    }
    
    // 4. Si hay países no encontrados, crear en locations
    if (notFoundCountries.length > 0) {
      console.log('\n⚠️ Los siguientes países no se encontraron en locations:');
      notFoundCountries.forEach(c => console.log(`  - ${c.name} (code: ${c.code})`));
      
      console.log('\n📝 Creando países faltantes en locations...');
      for (const country of notFoundCountries) {
        const slug = country.name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '');
        
        // Verificar si el slug ya existe y hacerlo único si es necesario
        let finalSlug = slug;
        let counter = 1;
        while (await prisma.location.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        const newLocation = await prisma.location.create({
          data: {
            name: country.name,
            slug: finalSlug,
            parentId: null // null = es un país
          }
        });
        
        countryToLocationMap.set(country.id, newLocation.id);
        console.log(`✅ Creado: ${country.name} con id=${newLocation.id}`);
      }
    }
    
    // 5. Obtener todos los registros de movie_countries
    const movieCountries = await prisma.movieCountry.findMany();
    console.log(`\n📊 Encontrados ${movieCountries.length} registros en movie_countries`);
    
    // 6. Preparar actualizaciones
    const updates = [];
    const unmappedCountries = new Set();
    
    for (const mc of movieCountries) {
      const newCountryId = countryToLocationMap.get(mc.countryId);
      if (newCountryId) {
        updates.push({
          movieId: mc.movieId,
          oldCountryId: mc.countryId,
          newCountryId: newCountryId,
          isPrimary: mc.isPrimary
        });
      } else {
        unmappedCountries.add(mc.countryId);
      }
    }
    
    if (unmappedCountries.size > 0) {
      console.log(`\n⚠️ IDs de países sin mapear: ${Array.from(unmappedCountries).join(', ')}`);
    }
    
    // 7. Aplicar actualizaciones - MÉTODO SIMPLIFICADO
    console.log(`\n🔄 Actualizando ${updates.length} registros...`);
    
    // Primero, guardar todos los datos en una tabla temporal o array
    const allData = updates.map(u => ({
      movieId: u.movieId,
      countryId: u.newCountryId,
      isPrimary: u.isPrimary
    }));
    
    // Eliminar todos los registros existentes
    console.log('  Eliminando registros antiguos...');
    await prisma.movieCountry.deleteMany({});
    
    // Insertar todos los nuevos registros en batches
    console.log('  Insertando registros actualizados...');
    const batchSize = 500;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize);
      await prisma.movieCountry.createMany({
        data: batch,
        skipDuplicates: true
      });
      console.log(`  Procesados ${Math.min(i + batchSize, allData.length)}/${allData.length} registros...`);
    }
    
    console.log('✅ Migración completada exitosamente');
    
    // 8. Verificación básica
    const sampleMovies = await prisma.movieCountry.findMany({
      take: 5,
      include: {
        movie: {
          select: {
            title: true
          }
        }
      }
    });
    
    console.log('\n🔍 Verificación (primeros 5 registros):');
    for (const mc of sampleMovies) {
      // Buscar el nombre del país en locations
      const location = await prisma.location.findUnique({
        where: { id: mc.countryId },
        select: { name: true }
      });
      console.log(`  "${mc.movie.title}" -> ${location?.name || 'DESCONOCIDO'} (location.id=${mc.countryId})`);
    }
    
    // Estadísticas finales
    const stats = await prisma.$queryRaw`
      SELECT l.name, COUNT(*) as count
      FROM movie_countries mc
      JOIN locations l ON mc.country_id = l.id
      WHERE l.parent_id IS NULL
      GROUP BY l.id, l.name
      ORDER BY count DESC
      LIMIT 10
    `;
    
    console.log('\n📊 Top 10 países con más películas:');
    stats.forEach(s => {
      console.log(`  ${s.name}: ${s.count} películas`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
migrateCountriesToLocations()
  .catch(console.error)
  .finally(() => process.exit());