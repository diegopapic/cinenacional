const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function readCountries() {
  console.log('🌍 Leyendo países de la base de datos...');
  console.log('   (Locations sin parentId)\n');
  console.log('='.repeat(50));
  
  try {
    // Obtener todos los países (locations sin parentId)
    const countries = await prisma.location.findMany({
      where: {
        parentId: null
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        children: {
          select: {
            id: true
          }
        }
      }
    });
    
    console.log(`\n📍 Encontrados ${countries.length} países (locations sin parentId):\n`);
    console.log('='.repeat(50));
    
    // Mostrar lista formateada
    console.log('\nLISTA DE PAÍSES:');
    console.log('-'.repeat(50));
    
    countries.forEach((country, index) => {
      const childrenCount = country.children ? country.children.length : 0;
      const countryInfo = `${(index + 1).toString().padStart(3, ' ')}. ${country.name.padEnd(30, ' ')}`;
      const metadata = `(ID: ${country.id}, Provincias/Estados: ${childrenCount})`;
      console.log(`${countryInfo} ${metadata}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('\nLISTA SIMPLE DE NOMBRES:\n');
    
    // Crear array simple de nombres para facilitar la copia
    const countryNames = countries.map(c => c.name);
    countryNames.forEach(name => console.log(name));
    
    console.log('\n' + '='.repeat(50));
    console.log('\nFORMATO JSON (para copiar):\n');
    console.log(JSON.stringify(countryNames, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log('\nESTADÍSTICAS:');
    console.log('-'.repeat(50));
    console.log(`Total de países: ${countries.length}`);
    
    const withChildren = countries.filter(c => c.children && c.children.length > 0);
    const withoutChildren = countries.filter(c => !c.children || c.children.length === 0);
    
    console.log(`Países con provincias/estados: ${withChildren.length}`);
    console.log(`Países sin subdivisiones: ${withoutChildren.length}`);
    
    if (withoutChildren.length > 0) {
      console.log('\nPaíses sin subdivisiones:');
      withoutChildren.forEach(c => {
        console.log(`  - ${c.name}`);
      });
    }
    
    // Guardar en archivo para referencia
    const fs = require('fs');
     const outputData = {
      totalCountries: countries.length,
      generatedAt: new Date().toISOString(),
      countries: countries.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        childrenCount: c.children ? c.children.length : 0
      }))
    };
    
    // Usar path.join para crear la ruta correcta
    const jsonPath = path.join(__dirname, 'countries-list.json');
    fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));
    console.log('\n✅ Lista completa guardada en: ' + jsonPath);
    
    // También crear un archivo simple solo con nombres
    const txtPath = path.join(__dirname, 'countries-names.txt');
    fs.writeFileSync(txtPath, countryNames.join('\n'));
    console.log('✅ Lista de nombres guardada en: ' + txtPath);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

readCountries();