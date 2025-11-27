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

async function dryRunMigrationOptimized() {
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
    console.log('║  DRY-RUN OPTIMIZADO: MIGRACIÓN DE NACIONALIDADES              ║');
    console.log('║  (Sin insertar datos - solo simulación)                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    await postgresClient.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // PASO 1: Obtener mapeo de países en PostgreSQL
    console.log('═══ PASO 1: OBTENER MAPEO DE PAÍSES EN POSTGRESQL ═══\n');
    const countriesResult = await postgresClient.query(`
      SELECT id, name, code
      FROM countries
      ORDER BY name
    `);

    const countryNameMap = {};
    countriesResult.rows.forEach(country => {
      countryNameMap[country.name.toLowerCase()] = {
        id: country.id,
        name: country.name,
        code: country.code
      };
    });

    console.log(`Total de países en PostgreSQL: ${countriesResult.rows.length}\n`);

    // PASO 2: Obtener datos de WordPress (SIN PROCESAR)
    console.log('═══ PASO 2: EXTRAER NACIONALIDADES DE WORDPRESS ═══\n');
    const [wpNationalities] = await mysqlConnection.execute(`
      SELECT 
        p.ID as wp_person_id,
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

    console.log(`Registros extraídos de WordPress: ${wpNationalities.length}\n`);

    // PASO 3: OPTIMIZADO - Extraer term_ids del PHP serializado (EN JAVASCRIPT)
    console.log('═══ PASO 3: EXTRAER TERM_IDS DEL PHP SERIALIZADO ═══\n');
    
    const termIdsSet = new Set();
    wpNationalities.forEach(row => {
      const termIds = unserializePhpArray(row.nacionalidad_raw);
      termIds.forEach(id => termIdsSet.add(id));
    });

    const termIds = Array.from(termIdsSet);
    console.log(`Term IDs únicos encontrados: ${termIds.length}`);
    console.log(`IDs: ${termIds.join(', ')}\n`);

    // PASO 4: Obtener nombres de países desde WordPress (QUERY SIMPLE)
    console.log('═══ PASO 4: OBTENER NOMBRES DE TÉRMINOS DESDE WORDPRESS ═══\n');
    
    if (termIds.length === 0) {
      throw new Error('No se encontraron term_ids');
    }

    const placeholders = termIds.map(() => '?').join(',');
    const [wpCountriesData] = await mysqlConnection.execute(
      `SELECT term_id, name FROM wp_terms WHERE term_id IN (${placeholders})`,
      termIds
    );

    const wpCountryMap = {};
    wpCountriesData.forEach(row => {
      wpCountryMap[row.term_id] = row.name;
    });

    console.log(`Términos obtenidos: ${wpCountriesData.length}\n`);
    console.log('Mapeo term_id → nombre país:\n');
    wpCountriesData.forEach(row => {
      console.log(`  • Term ID ${String(row.term_id).padEnd(5)} → "${row.name}"`);
    });

    // PASO 5: Procesar y validar migración
    console.log('\n\n═══ PASO 5: VALIDAR MAPEO (DRY-RUN) ═══\n');

    let processedCount = 0;
    let mappedCount = 0;
    let unmappedCount = 0;
    const unmappedCountries = new Set();
    const migrableRecords = [];

    for (const row of wpNationalities) {
      const termIds = unserializePhpArray(row.nacionalidad_raw);
      
      for (const termId of termIds) {
        const countryName = wpCountryMap[termId];
        const countryNameLower = countryName ? countryName.toLowerCase() : null;
        const postgresCountry = countryNameLower ? countryNameMap[countryNameLower] : null;

        if (postgresCountry) {
          mappedCount++;
          migrableRecords.push({
            wpPersonId: row.wp_person_id,
            personName: row.persona_nombre,
            wpTermId: termId,
            wpCountryName: countryName,
            pgCountryId: postgresCountry.id,
            pgCountryName: postgresCountry.name,
            pgCountryCode: postgresCountry.code
          });
        } else {
          unmappedCount++;
          unmappedCountries.add(countryName || `Unknown (termId: ${termId})`);
        }
      }
      processedCount++;
    }

    console.log(`📊 ESTADÍSTICAS DEL DRY-RUN:\n`);
    console.log(`Total de personas procesadas: ${processedCount}`);
    console.log(`Registros que se migrarían: ${mappedCount}`);
    console.log(`Registros sin mapeo: ${unmappedCount}`);
    console.log(`Cobertura: ${((mappedCount / processedCount) * 100).toFixed(2)}%\n`);

    if (unmappedCount > 0) {
      console.log('⚠️  Países sin mapeo encontrados:');
      Array.from(unmappedCountries).forEach(country => {
        console.log(`  • "${country}"`);
      });
    }

    // PASO 6: Mostrar ejemplos
    console.log('\n\n═══ PASO 6: EJEMPLOS DE REGISTROS A MIGRAR ═══\n');
    console.log('Primeros 10 registros que se migrarían:\n');

    migrableRecords.slice(0, 10).forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.personName}`);
      console.log(`   WordPress: persona_id=${record.wpPersonId}, term_id=${record.wpTermId} (${record.wpCountryName})`);
      console.log(`   PostgreSQL: person_id=${record.wpPersonId}, location_id=${record.pgCountryId} (${record.pgCountryName})`);
      console.log();
    });

    // PASO 7: Estadísticas por país
    console.log('\n═══ PASO 7: DISTRIBUCIÓN POR PAÍS ═══\n');
    console.log('Nacionalidades que se migrarían (completo):\n');

    const countByCountry = {};
    migrableRecords.forEach(record => {
      if (!countByCountry[record.pgCountryName]) {
        countByCountry[record.pgCountryName] = 0;
      }
      countByCountry[record.pgCountryName]++;
    });

    Object.entries(countByCountry)
      .sort((a, b) => b[1] - a[1])
      .forEach(([country, count]) => {
        console.log(`  ${country.padEnd(25, '.')} ${String(count).padStart(5)} personas`);
      });

    // PASO 8: Resumen final
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMEN DEL DRY-RUN                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('✅ LISTO PARA MIGRAR SI:');
    console.log(`   • Confirmaste que se migrarán ${mappedCount} registros`);
    console.log(`   • La cobertura es correcta (${((mappedCount / processedCount) * 100).toFixed(2)}%)`);

    if (unmappedCount > 0) {
      console.log(`\n⚠️  ADVERTENCIA:`);
      console.log(`   • ${unmappedCount} registros NO se migrarán (sin mapeo)`);
      console.log('   • Verifica si está bien ignorarlos o si falta completar el mapeo\n');
    } else {
      console.log(`\n✨ PERFECTO: 100% de cobertura - todos los registros tienen mapeo\n`);
    }

    console.log('📋 PRÓXIMOS PASOS:');
    console.log('   1. Revisa este dry-run y confirma que todo esté correcto');
    console.log('   2. Si todo está bien, ejecuta el script REAL de migración');
    console.log('   3. El script real insertará los registros en person_nationalities\n');

  } catch (error) {
    console.error('\n❌ Error durante dry-run:', error.message);
    console.error('\nDetalles:', error);
  } finally {
    await mysqlConnection.end();
    await postgresClient.end();
  }
}

// Ejecutar
dryRunMigrationOptimized()
  .then(() => console.log('\n✅ Dry-run completado'))
  .catch(console.error);