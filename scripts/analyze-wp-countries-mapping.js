const mysql = require('mysql2/promise');

async function mapCountriesFromCoproduction() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración local
    database: 'wordpress_cine'
  });

  try {
    console.log('=== MAPEO COMPLETO DE PAÍSES EN COPRODUCCIÓN ===\n');

    // 1. Obtener TODOS los países de la taxonomía "localidad"
    console.log('=== TODOS LOS PAÍSES EN TAXONOMÍA LOCALIDAD ===');
    const [allCountries] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.count as movies_count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
      ORDER BY t.name
    `);

    console.log(`Total de países disponibles: ${allCountries.length}\n`);
    
    // Crear un mapa de ID a nombre
    const countryMap = {};
    allCountries.forEach(country => {
      countryMap[country.term_id] = {
        name: country.name,
        slug: country.slug,
        count: country.movies_count
      };
    });

    // Mostrar lista completa
    console.log('Lista completa de países:');
    console.log('ID\tNombre\t\t\tSlug\t\t\tPelículas');
    console.log('--\t------\t\t\t----\t\t\t---------');
    allCountries.forEach(country => {
      const name = country.name.padEnd(20);
      const slug = country.slug.padEnd(20);
      console.log(`${country.term_id}\t${name}\t${slug}\t${country.movies_count}`);
    });

    // 2. Extraer todos los IDs únicos de la meta_key coproduccion
    console.log('\n\n=== EXTRACCIÓN DE IDs ÚNICOS DE COPRODUCCIÓN ===');
    const [coproductionData] = await connection.execute(`
      SELECT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'coproduccion'
      AND meta_value != ''
      AND meta_value IS NOT NULL
    `);

    const uniqueCountryIds = new Set();
    const coproductionPatterns = {};

    coproductionData.forEach(row => {
      const value = row.meta_value;
      
      // Contar patrones
      if (!coproductionPatterns[value]) {
        coproductionPatterns[value] = 0;
      }
      coproductionPatterns[value]++;

      // Extraer IDs usando regex
      const matches = value.match(/s:\d+:"(\d+)"/g);
      if (matches) {
        matches.forEach(match => {
          const id = match.match(/s:\d+:"(\d+)"/)[1];
          uniqueCountryIds.add(id);
        });
      }
    });

    // 3. Mapear IDs encontrados con nombres de países
    console.log('\nPaíses encontrados en coproducciones:');
    console.log('ID\tNombre\t\t\tPelículas como coproductor');
    console.log('--\t------\t\t\t-------------------------');
    
    const sortedIds = Array.from(uniqueCountryIds).sort((a, b) => parseInt(a) - parseInt(b));
    sortedIds.forEach(id => {
      const country = countryMap[id];
      if (country) {
        const name = country.name.padEnd(20);
        // Contar cuántas veces aparece este ID en coproducciones
        let count = 0;
        Object.entries(coproductionPatterns).forEach(([pattern, patternCount]) => {
          if (pattern.includes(`"${id}"`)) {
            count += patternCount;
          }
        });
        console.log(`${id}\t${name}\t${count}`);
      } else {
        console.log(`${id}\t[NO ENCONTRADO EN TÉRMINOS]\t?`);
      }
    });

    // 4. Análisis de coproducciones más comunes
    console.log('\n\n=== COMBINACIONES DE COPRODUCCIÓN MÁS COMUNES ===');
    const sortedPatterns = Object.entries(coproductionPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30); // Top 30

    console.log('Rango\tCantidad\tPaíses');
    console.log('-----\t--------\t------');
    
    sortedPatterns.forEach(([pattern, count], index) => {
      // Extraer IDs del patrón
      const matches = pattern.match(/s:\d+:"(\d+)"/g);
      if (matches) {
        const ids = matches.map(m => m.match(/s:\d+:"(\d+)"/)[1]);
        const countryNames = ids.map(id => {
          const country = countryMap[id];
          return country ? country.name : `ID:${id}`;
        }).join(' + ');
        
        console.log(`${index + 1}\t${count}\t\t${countryNames}`);
      }
    });

    // 5. Análisis por país principal (Argentina siempre debería ser el principal)
    console.log('\n\n=== ANÁLISIS: ARGENTINA COMO PAÍS PRINCIPAL ===');
    
    // Buscar el ID de Argentina
    const argentinaData = allCountries.find(c => c.name === 'Argentina' || c.slug === 'argentina');
    if (argentinaData) {
      console.log(`Argentina ID: ${argentinaData.term_id}`);
      
      // Contar películas donde Argentina NO es coproductor
      const [nonArgentineMovies] = await connection.execute(`
        SELECT 
          pm.post_id,
          p.post_title,
          pm.meta_value
        FROM wp_postmeta pm
        JOIN wp_posts p ON p.ID = pm.post_id
        WHERE pm.meta_key = 'coproduccion'
        AND pm.meta_value != ''
        AND pm.meta_value NOT LIKE '%"${argentinaData.term_id}"%'
        AND p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        LIMIT 10
      `);

      console.log(`\nPelículas sin Argentina como coproductor: ${nonArgentineMovies.length}`);
      if (nonArgentineMovies.length > 0) {
        console.log('\nEjemplos:');
        nonArgentineMovies.forEach(movie => {
          console.log(`- ${movie.post_title}`);
          console.log(`  Coproducción: ${movie.meta_value}`);
        });
      }
    }

    // 6. Verificar integridad de datos
    console.log('\n\n=== VERIFICACIÓN DE INTEGRIDAD ===');
    
    // Buscar IDs que no corresponden a ningún término
    const invalidIds = Array.from(uniqueCountryIds).filter(id => !countryMap[id]);
    if (invalidIds.length > 0) {
      console.log(`\nIDs sin término correspondiente: ${invalidIds.join(', ')}`);
    } else {
      console.log('\n✓ Todos los IDs de coproducción corresponden a términos válidos');
    }

    // 7. Resumen estadístico
    console.log('\n\n=== RESUMEN ESTADÍSTICO ===');
    console.log(`Total de películas con coproducción: ${coproductionData.length}`);
    console.log(`Países únicos como coproductores: ${uniqueCountryIds.size}`);
    console.log(`Patrones únicos de coproducción: ${Object.keys(coproductionPatterns).length}`);
    
    // Calcular promedio de países por película
    let totalCountries = 0;
    coproductionData.forEach(row => {
      const matches = row.meta_value.match(/s:\d+:"(\d+)"/g);
      if (matches) {
        totalCountries += matches.length;
      }
    });
    const avgCountries = (totalCountries / coproductionData.length).toFixed(2);
    console.log(`Promedio de países por película: ${avgCountries}`);

    // 8. Crear mapa de conversión para migración
    console.log('\n\n=== MAPA DE CONVERSIÓN PARA MIGRACIÓN ===');
    console.log('// Copiar este objeto para usar en el script de migración:');
    console.log('const countryIdMap = {');
    sortedIds.forEach(id => {
      const country = countryMap[id];
      if (country) {
        console.log(`  "${id}": { name: "${country.name}", slug: "${country.slug}" },`);
      }
    });
    console.log('};');

  } catch (error) {
    console.error('Error durante el mapeo:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
mapCountriesFromCoproduction()
  .then(() => console.log('\nMapeo completado'))
  .catch(console.error);