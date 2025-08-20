const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapa de países con sus gentilicios (forma femenina/neutra)
// Actualizado con los 99 países finales
const GENTILICIOS = {
  // PAÍSES DE AMÉRICA (22)
  1969: 'argentina',        // Argentina
  1911: 'boliviana',        // Bolivia
  1913: 'brasileña',        // Brasil
  1918: 'canadiense',       // Canadá
  1908: 'chilena',          // Chile
  1964: 'colombiana',       // Colombia
  1952: 'costarricense',    // Costa Rica
  1931: 'cubana',           // Cuba
  1934: 'ecuatoriana',      // Ecuador
  1980: 'salvadoreña',      // El Salvador
  1920: 'estadounidense',   // Estados Unidos
  1942: 'guatemalteca',     // Guatemala (país)
  1990: 'haitiana',         // Haití
  1966: 'hondureña',        // Honduras
  1922: 'mexicana',         // México
  1916: 'panameña',         // Panamá
  1912: 'paraguaya',        // Paraguay
  1904: 'peruana',          // Perú
  1940: 'puertorriqueña',   // Puerto Rico
  1929: 'dominicana',       // República Dominicana
  1906: 'uruguaya',         // Uruguay
  1914: 'venezolana',       // Venezuela

  // PAÍSES DE EUROPA (44)
  1907: 'alemana',          // Alemania
  1928: 'austriaca',        // Austria
  2728: 'bielorrusa',       // Belarús
  1926: 'belga',            // Bélgica
  1986: 'bosnia',           // Bosnia y Herzegovina
  1968: 'búlgara',          // Bulgaria
  1985: 'croata',           // Croacia
  1935: 'danesa',           // Dinamarca
  1982: 'escocesa',         // Escocia
  1993: 'eslovaca',         // Eslovaquia
  1956: 'eslovena',         // Eslovenia
  1903: 'española',         // España
  1948: 'finlandesa',       // Finlandia
  1905: 'francesa',         // Francia
  1984: 'galesa',           // Gales
  1941: 'griega',           // Grecia
  1975: 'húngara',          // Hungría
  1923: 'inglesa',          // Inglaterra
  1978: 'irlandesa',        // Irlanda
  1960: 'islandesa',        // Islandia
  1909: 'italiana',         // Italia
  1979: 'letona',           // Letonia
  1981: 'lituana',          // Lituania
  2744: 'macedonia',        // Macedonia del Norte
  2914: 'moldava',          // Moldavia
  2901: 'montenegrina',     // Montenegro
  1936: 'noruega',          // Noruega
  1919: 'neerlandesa',      // Países Bajos
  1924: 'polaca',           // Polonia
  1937: 'portuguesa',       // Portugal
  1939: 'británica',        // Reino Unido
  1925: 'checa',            // República Checa
  1932: 'rumana',           // Rumania
  1977: 'rusa',             // Rusia
  1965: 'serbia',           // Serbia
  1917: 'sueca',            // Suecia
  1915: 'suiza',            // Suiza
  1945: 'turca',            // Turquía
  1976: 'ucraniana',        // Ucrania
  3665: 'vaticana',         // Vaticano
  1944: 'yugoslava',        // Yugoslavia (histórico)

  // PAÍSES DE ASIA (21)
  3155: 'birmana',          // Burma (Myanmar)
  1930: 'catarí',           // Catar
  1933: 'china',            // China
  1989: 'chipriota',        // Chipre
  1910: 'surcoreana',       // Corea del Sur
  1988: 'egipcia',          // Egipto
  3633: 'filipina',         // Filipinas
  1943: 'india',            // India
  1949: 'iraní',            // Irán
  1950: 'israelí',          // Israel
  1947: 'japonesa',         // Japón
  1991: 'libanesa',         // Líbano
  1992: 'nepalí',           // Nepal
  1983: 'pakistaní',        // Paquistán
  1957: 'palestina',        // Palestina
  3757: 'siria',            // República Árabe Siria
  1967: 'singapurense',     // Singapur
  3528: 'tailandesa',       // Tailandia
  1921: 'taiwanesa',        // Taiwán
  2679: 'vietnamita',       // Vietnam

  // PAÍSES DE ÁFRICA (12)
  1954: 'angoleña',         // Angola
  2794: 'argelina',         // Argelia
  1962: 'burkinesa',        // Burkina Faso
  1955: 'etíope',           // Etiopía
  1953: 'guineana',         // Guinea
  1946: 'maliense',         // Mali
  1959: 'marroquí',         // Marruecos
  1994: 'mozambiqueña',     // Mozambique
  1961: 'namibia',          // Namibia
  1963: 'sudafricana',      // Sudáfrica
  1938: 'tunecina',         // Túnez
  3553: 'zambiana',         // Zambia

  // PAÍSES DE OCEANÍA (4)
  1927: 'australiana',      // Australia
  1958: 'neocaledonia',     // Nueva Caledonia
  1951: 'neozelandesa',     // Nueva Zelanda
  3558: 'samoana',          // Samoa
};

async function populateGentilicios() {
  console.log('🌍 ACTUALIZACIÓN DE GENTILICIOS\n');
  console.log('='.repeat(60));
  
  try {
    // Obtener todos los países (locations sin parentId)
    const countries = await prisma.location.findMany({
      where: {
        parentId: null
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`📍 Encontrados ${countries.length} países en la base de datos`);
    console.log(`📝 Gentilicios definidos: ${Object.keys(GENTILICIOS).length}\n`);
    console.log('='.repeat(60));
    console.log('\nPROCESANDO ACTUALIZACIONES:\n');
    
    let updatedCount = 0;
    let alreadySetCount = 0;
    let noGentilicioCount = 0;
    const noGentilicioList = [];
    const updatedList = [];
    
    for (const country of countries) {
      const gentilicio = GENTILICIOS[country.id];
      
      if (gentilicio) {
        // Verificar si ya tiene gentilicio
        if (country.gentilicio === gentilicio) {
          console.log(`✓  ${country.name.padEnd(30)} → ya tiene: ${gentilicio}`);
          alreadySetCount++;
        } else {
          // Actualizar gentilicio
          await prisma.location.update({
            where: { id: country.id },
            data: { gentilicio }
          });
          
          console.log(`✅ ${country.name.padEnd(30)} → ${gentilicio}`);
          updatedList.push({ name: country.name, gentilicio });
          updatedCount++;
        }
      } else {
        console.log(`⚠️  ${country.name.padEnd(30)} - Sin gentilicio definido`);
        noGentilicioList.push(country);
        noGentilicioCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN FINAL:');
    console.log('='.repeat(60));
    console.log(`   ✅ Actualizados: ${updatedCount}`);
    console.log(`   ✓  Ya tenían gentilicio: ${alreadySetCount}`);
    console.log(`   ⚠️  Sin gentilicio: ${noGentilicioCount}`);
    console.log(`   📍 Total procesados: ${countries.length}`);
    
    if (updatedList.length > 0) {
      console.log('\n✅ GENTILICIOS ACTUALIZADOS:');
      console.log('-'.repeat(60));
      updatedList.forEach(item => {
        console.log(`   ${item.name.padEnd(30)} → ${item.gentilicio}`);
      });
    }
    
    if (noGentilicioList.length > 0) {
      console.log('\n⚠️  PAÍSES SIN GENTILICIO:');
      console.log('-'.repeat(60));
      noGentilicioList.forEach(country => {
        console.log(`   - ${country.name} (ID: ${country.id}, slug: ${country.slug})`);
      });
      console.log('\n   Nota: Estos pueden ser países históricos o territorios especiales.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Proceso completado exitosamente\n');
    
  } catch (error) {
    console.error('\n❌ Error al actualizar gentilicios:', error);
    console.error('Detalles:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
populateGentilicios()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });