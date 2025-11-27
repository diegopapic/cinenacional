const mysql = require('mysql2/promise');
const { Client } = require('pg');

// Función para deserializar arrays PHP
function unserializePhpArray(serialized) {
  try {
    const matches = serialized.match(/s:\d+:"([^"]+)"/g);
    if (matches) {
      return matches.map(match => {
        const value = match.match(/s:\d+:"([^"]+)"/)[1];
        return value;
      });
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function migrateBySlug() {
  const mysqlConnection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  const postgresClient = new Client({
    host: 'localhost',
    port: 5433,
    database: 'cinenacional',
    user: 'cinenacional',
    password: 'Paganitzu'
  });

  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN NACIONALIDADES → LOCATIONS (MAPEO POR SLUG)        ║');
    console.log('║  Usando slug como identificador único                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    await postgresClient.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // PASO 1: Obtener slug → ID de personas en PostgreSQL
    console.log('═══ PASO 1: OBTENER PERSONAS EN POSTGRESQL (POR SLUG) ═══\n');
    const peopleResult = await postgresClient.query(`
      SELECT id, slug FROM people WHERE slug IS NOT NULL ORDER BY id
    `);

    const pgSlugMap = {};
    peopleResult.rows.forEach(row => {
      pgSlugMap[row.slug] = row.id;
    });

    console.log(`Personas en PostgreSQL: ${peopleResult.rows.length}\n`);

    // PASO 2: Obtener países en locations
    console.log('═══ PASO 2: OBTENER PAÍSES EN LOCATIONS ═══\n');
    const locationsResult = await postgresClient.query(`
      SELECT id, name
      FROM locations
      WHERE parent_id IS NULL
      ORDER BY name
    `);

    const locationNameMap = {};
    locationsResult.rows.forEach(location => {
      locationNameMap[location.name.toLowerCase()] = {
        id: location.id,
        name: location.name
      };
    });

    console.log(`Países en locations: ${locationsResult.rows.length}\n`);

    // PASO 3: Extraer datos de WordPress (CON SLUG)
    console.log('═══ PASO 3: EXTRAER DATOS DE WORDPRESS ═══\n');
    const [wpNationalities] = await mysqlConnection.execute(`
      SELECT 
        p.ID as wp_person_id,
        p.post_name as wp_slug,
        p.post_title as persona_nombre,
        pm.meta_value as nacionalidad_raw
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND pm.meta_key = 'nacionalidad'
      AND pm.meta_value != ''
      AND pm.meta_value IS NOT NULL
      ORDER BY p.ID
    `);

    console.log(`Total de registros en WordPress: ${wpNationalities.length}\n`);

    // PASO 4: Obtener term_ids y nombres de países
    console.log('═══ PASO 4: OBTENER MAPEO DE TÉRMINOS ═══\n');
    const termIdsSet = new Set();
    wpNationalities.forEach(row => {
      const termIds = unserializePhpArray(row.nacionalidad_raw);
      termIds.forEach(id => termIdsSet.add(id));
    });

    const termIds = Array.from(termIdsSet);
    const placeholders = termIds.map(() => '?').join(',');
    const [wpCountriesData] = await mysqlConnection.execute(
      `SELECT term_id, name FROM wp_terms WHERE term_id IN (${placeholders})`,
      termIds
    );

    const wpCountryMap = {};
    wpCountriesData.forEach(row => {
      wpCountryMap[row.term_id] = row.name;
    });

    console.log(`Términos mapeados: ${wpCountriesData.length}\n`);

    // PASO 5: Procesar nacionalidades (MAPEANDO POR SLUG)
    console.log('═══ PASO 5: PROCESAR NACIONALIDADES (MAPEO POR SLUG) ═══\n');

    let totalPersonas = 0;
    let personasEncontradas = 0;
    let personasFaltantes = 0;
    let mappedCount = 0;
    let unmappedCountries = 0;
    let migrableRecords = [];
    const unmappedCountryMap = new Map();
    const missingPeople = new Map();

    for (const row of wpNationalities) {
      totalPersonas++;
      
      // Buscar persona por SLUG en PostgreSQL
      const pgPersonId = pgSlugMap[row.wp_slug];
      
      if (!pgPersonId) {
        personasFaltantes++;
        if (!missingPeople.has(row.wp_slug)) {
          missingPeople.set(row.wp_slug, row.persona_nombre);
        }
        continue; // Saltar esta persona
      }
      
      personasEncontradas++;
      const termIds = unserializePhpArray(row.nacionalidad_raw);
      
      for (const termId of termIds) {
        const countryName = wpCountryMap[termId];
        const countryNameLower = countryName ? countryName.toLowerCase() : null;
        const postgresLocation = countryNameLower ? locationNameMap[countryNameLower] : null;

        if (postgresLocation) {
          mappedCount++;
          migrableRecords.push({
            personId: pgPersonId,
            locationId: postgresLocation.id,
            locationName: postgresLocation.name,
            countryName: countryName,
            slug: row.wp_slug
          });
        } else {
          unmappedCountries++;
          if (!unmappedCountryMap.has(countryName)) {
            unmappedCountryMap.set(countryName, 0);
          }
          unmappedCountryMap.set(countryName, unmappedCountryMap.get(countryName) + 1);
        }
      }
    }

    console.log(`Total de personas en WordPress: ${totalPersonas}`);
    console.log(`Personas encontradas por slug: ${personasEncontradas}`);
    console.log(`Personas no encontradas: ${personasFaltantes}`);
    console.log(`Registros que se migrarán: ${mappedCount}`);
    console.log(`Registros sin mapeo (país): ${unmappedCountries}`);
    console.log(`Cobertura: ${((mappedCount / personasEncontradas) * 100).toFixed(2)}%\n`);

    if (personasFaltantes > 0) {
      console.log(`⚠️  ${personasFaltantes} personas no se encontraron por slug`);
      console.log('   (Se ignorarán estos registros)\n');
      
      if (personasFaltantes <= 10) {
        Array.from(missingPeople.entries()).forEach(([slug, name]) => {
          console.log(`  • Slug: "${slug}" (${name})`);
        });
      }
      console.log();
    }

    if (unmappedCountries > 0) {
      console.log('⚠️  Países sin mapeo:');
      Array.from(unmappedCountryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([country, count]) => {
          console.log(`  • "${country}": ${count} registros`);
        });
      console.log();
    }

    // PASO 6: Estado actual
    console.log('\n═══ PASO 6: ESTADO ACTUAL DE person_nationalities ═══\n');
    
    const countCheckResult = await postgresClient.query('SELECT COUNT(*) FROM person_nationalities');
    const currentCount = parseInt(countCheckResult.rows[0].count);
    
    console.log(`Registros actuales: ${currentCount}\n`);

    // PASO 7: Insertar datos
    console.log('═══ PASO 7: INSERTAR NACIONALIDADES ═══\n');
    console.log(`Insertando ${migrableRecords.length} registros...\n`);

    const batchSize = 100;
    let insertedTotal = 0;
    let skippedTotal = 0;

    for (let i = 0; i < migrableRecords.length; i += batchSize) {
      const batch = migrableRecords.slice(i, i + batchSize);

      try {
        const values = batch
          .map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`)
          .join(',');

        const queryParams = [];
        batch.forEach(item => {
          queryParams.push(item.personId);
          queryParams.push(item.locationId);
        });

        const query = `
          INSERT INTO person_nationalities (person_id, location_id)
          VALUES ${values}
          ON CONFLICT (person_id, location_id) DO NOTHING
        `;

        const result = await postgresClient.query(query, queryParams);
        insertedTotal += result.rowCount;
        skippedTotal += batch.length - result.rowCount;

        const progress = Math.min(i + batchSize, migrableRecords.length);
        const percentage = ((progress / migrableRecords.length) * 100).toFixed(1);
        console.log(`Progreso: ${progress}/${migrableRecords.length} (${percentage}%)`);

      } catch (error) {
        console.error(`❌ Error en batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        console.error('   Detalles:', error.detail);
        throw error;
      }
    }

    console.log(`\n✅ Inserción completada:`);
    console.log(`  - Nuevos registros: ${insertedTotal}`);
    console.log(`  - Duplicados ignorados: ${skippedTotal}\n`);

    // PASO 8: Verificación final
    console.log('═══ PASO 8: VERIFICACIÓN FINAL ═══\n');

    const finalCountResult = await postgresClient.query('SELECT COUNT(*) FROM person_nationalities');
    const finalCount = parseInt(finalCountResult.rows[0].count);

    console.log(`Total en person_nationalities: ${finalCount}\n`);

    // Estadísticas por país
    const countrySummaryResult = await postgresClient.query(`
      SELECT 
        l.id,
        l.name,
        COUNT(pn.person_id) as cantidad_personas
      FROM person_nationalities pn
      JOIN locations l ON pn.location_id = l.id
      GROUP BY l.id, l.name
      ORDER BY cantidad_personas DESC
    `);

    console.log('═══ DISTRIBUCIÓN FINAL POR PAÍS ═══\n');
    console.log('Top 25 países:\n');
    
    countrySummaryResult.rows.slice(0, 25).forEach((row, idx) => {
      console.log(`${String(idx + 1).padStart(2, ' ')}. ${row.name.padEnd(30, '.')} ${String(row.cantidad_personas).padStart(5)} personas`);
    });

    if (countrySummaryResult.rows.length > 25) {
      console.log(`\n... y ${countrySummaryResult.rows.length - 25} países más`);
    }

    // Resumen final
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   MIGRACIÓN COMPLETADA                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('✅ Resumen:');
    console.log(`   • Personas en WordPress con nacionalidad: ${totalPersonas}`);
    console.log(`   • Personas encontradas por slug: ${personasEncontradas}`);
    console.log(`   • Personas no encontradas: ${personasFaltantes}`);
    console.log(`   • Registros insertados: ${insertedTotal}`);
    console.log(`   • Registros sin mapeo (país): ${unmappedCountries}`);
    console.log(`   • Cobertura: ${((insertedTotal / personasEncontradas) * 100).toFixed(2)}%`);
    console.log(`   • Países únicos: ${countrySummaryResult.rows.length}`);
    console.log('\n🎉 ¡Migración completada correctamente!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  } finally {
    await mysqlConnection.end();
    await postgresClient.end();
  }
}

// Ejecutar
migrateBySlug()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });