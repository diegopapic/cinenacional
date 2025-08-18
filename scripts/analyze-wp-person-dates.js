// scripts/prepare-person-dates-migration.js
// Script para preparar la migración de fechas de personas a Supabase

const mysql = require('mysql2/promise');
const fs = require('fs').promises;

// Configuración de conexión a MySQL (WordPress)
async function createConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  });
}

async function prepareDatesMigration() {
  console.log('=== PREPARACIÓN PARA MIGRACIÓN DE FECHAS DE PERSONAS ===\n');

  let wpConnection;
  
  try {
    // Crear conexión
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');
    // 1. Obtener todas las personas con sus fechas
    console.log('📊 1. EXTRAYENDO DATOS DE FECHAS DE TODAS LAS PERSONAS\n');
    
    const [peopleWithDates] = await wpConnection.execute(`
      SELECT 
        p.ID as wp_id,
        p.post_name as slug,
        p.post_title as nombre,
        pm_birth.meta_value as fecha_nacimiento,
        pm_death.meta_value as fecha_muerte,
        pm_birth_import.meta_value as fecha_nacimiento_import,
        pm_death_import.meta_value as fecha_muerte_import
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_birth ON p.ID = pm_birth.post_id AND pm_birth.meta_key = 'fecha_nacimiento'
      LEFT JOIN wp_postmeta pm_death ON p.ID = pm_death.post_id AND pm_death.meta_key = 'fecha_muerte'
      LEFT JOIN wp_postmeta pm_birth_import ON p.ID = pm_birth_import.post_id AND pm_birth_import.meta_key = 'fecha_nacimiento_import'
      LEFT JOIN wp_postmeta pm_death_import ON p.ID = pm_death_import.post_id AND pm_death_import.meta_key = 'fecha_muerte_import'
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      ORDER BY p.post_title
    `);

    console.log(`Total personas encontradas: ${peopleWithDates.length}`);

    // 2. Procesar y clasificar las fechas
    const processedPeople = [];
    const dateStats = {
      totalPeople: peopleWithDates.length,
      withBirthDate: 0,
      withDeathDate: 0,
      birthFormats: {
        yyyymmdd: 0,
        yyyy: 0,
        yyyymm: 0,
        iso: 0,
        empty: 0,
        other: 0
      },
      deathFormats: {
        yyyymmdd: 0,
        yyyy: 0,
        yyyymm: 0,
        iso: 0,
        empty: 0,
        other: 0
      },
      examples: {
        yyyymmdd: [],
        yyyy: [],
        yyyymm: [],
        iso: [],
        other: []
      }
    };

    for (const person of peopleWithDates) {
      const processedPerson = {
        wp_id: person.wp_id,
        slug: person.slug,
        nombre: person.nombre,
        birth_date_parsed: null,
        death_date_parsed: null,
        birth_format: null,
        death_format: null,
        raw_birth: person.fecha_nacimiento,
        raw_death: person.fecha_muerte,
        raw_birth_import: person.fecha_nacimiento_import,
        raw_death_import: person.fecha_muerte_import
      };

      // Procesar fecha de nacimiento
      const birthResult = parseAndClassifyDate(person.fecha_nacimiento, person.fecha_nacimiento_import);
      if (birthResult.parsed) {
        processedPerson.birth_date_parsed = birthResult.parsed;
        processedPerson.birth_format = birthResult.format;
        dateStats.withBirthDate++;
        dateStats.birthFormats[birthResult.format]++;
        
        // Guardar ejemplos
        if (dateStats.examples[birthResult.format].length < 3) {
          dateStats.examples[birthResult.format].push({
            nombre: person.nombre,
            raw: person.fecha_nacimiento,
            parsed: birthResult.parsed
          });
        }
      } else {
        dateStats.birthFormats.empty++;
      }

      // Procesar fecha de muerte
      const deathResult = parseAndClassifyDate(person.fecha_muerte, person.fecha_muerte_import);
      if (deathResult.parsed) {
        processedPerson.death_date_parsed = deathResult.parsed;
        processedPerson.death_format = deathResult.format;
        dateStats.withDeathDate++;
        dateStats.deathFormats[deathResult.format]++;
        
        // Guardar ejemplos
        if (dateStats.examples[deathResult.format].length < 3) {
          dateStats.examples[deathResult.format].push({
            nombre: person.nombre,
            raw: person.fecha_muerte,
            parsed: deathResult.parsed
          });
        }
      } else {
        dateStats.deathFormats.empty++;
      }

      processedPeople.push(processedPerson);
    }

    // 3. Mostrar estadísticas
    console.log('\n📈 2. ESTADÍSTICAS DE PROCESAMIENTO\n');
    console.log(`Total personas: ${dateStats.totalPeople}`);
    console.log(`Con fecha de nacimiento: ${dateStats.withBirthDate} (${(dateStats.withBirthDate/dateStats.totalPeople*100).toFixed(1)}%)`);
    console.log(`Con fecha de muerte: ${dateStats.withDeathDate} (${(dateStats.withDeathDate/dateStats.totalPeople*100).toFixed(1)}%)`);

    console.log('\nFORMATOS DE FECHA DE NACIMIENTO:');
    Object.entries(dateStats.birthFormats).forEach(([format, count]) => {
      const percentage = (count/dateStats.totalPeople*100).toFixed(1);
      console.log(`  ${format}: ${count} (${percentage}%)`);
    });

    console.log('\nFORMATOS DE FECHA DE MUERTE:');
    Object.entries(dateStats.deathFormats).forEach(([format, count]) => {
      const percentage = (count/dateStats.totalPeople*100).toFixed(1);
      console.log(`  ${format}: ${count} (${percentage}%)`);
    });

    // 4. Mostrar ejemplos
    console.log('\n📝 3. EJEMPLOS POR FORMATO\n');
    Object.entries(dateStats.examples).forEach(([format, examples]) => {
      if (examples.length > 0) {
        console.log(`${format.toUpperCase()}:`);
        examples.forEach(example => {
          console.log(`  "${example.raw}" → ${JSON.stringify(example.parsed)} (${example.nombre})`);
        });
        console.log();
      }
    });

    // 5. Validaciones y problemas detectados
    console.log('🚨 4. VALIDACIONES Y PROBLEMAS DETECTADOS\n');
    
    const problems = [];
    
    // Personas con fecha de muerte pero sin fecha de nacimiento
    const deathWithoutBirth = processedPeople.filter(p => 
      p.death_date_parsed && !p.birth_date_parsed
    );
    
    if (deathWithoutBirth.length > 0) {
      problems.push(`${deathWithoutBirth.length} personas con fecha de muerte pero sin fecha de nacimiento`);
      console.log(`⚠️  ${deathWithoutBirth.length} personas con fecha de muerte pero sin fecha de nacimiento:`);
      deathWithoutBirth.slice(0, 5).forEach(p => {
        console.log(`   ${p.nombre} - Muerte: ${JSON.stringify(p.death_date_parsed)}`);
      });
    }

    // Personas que murieron antes de nacer (error lógico)
    const invalidDates = processedPeople.filter(p => {
      if (!p.birth_date_parsed || !p.death_date_parsed) return false;
      
      const birthYear = p.birth_date_parsed.year;
      const deathYear = p.death_date_parsed.year;
      
      return deathYear < birthYear;
    });

    if (invalidDates.length > 0) {
      problems.push(`${invalidDates.length} personas con fechas inválidas (muerte antes del nacimiento)`);
      console.log(`❌ ${invalidDates.length} personas con fechas inválidas:`);
      invalidDates.forEach(p => {
        console.log(`   ${p.nombre} - Nac: ${JSON.stringify(p.birth_date_parsed)}, Muerte: ${JSON.stringify(p.death_date_parsed)}`);
      });
    }

    // 6. Generar script de migración SQL
    console.log('\n📄 5. GENERANDO PREVIEW DEL SCRIPT DE MIGRACIÓN\n');
    
    const migrationSQL = generateMigrationSQL(processedPeople.slice(0, 10)); // Solo primeros 10 como ejemplo
    console.log('Vista previa del SQL de migración (primeros 10 registros):');
    console.log(migrationSQL);

    // 7. Guardar resultados
    const results = {
      timestamp: new Date().toISOString(),
      stats: dateStats,
      problems: problems,
      sample_processed: processedPeople.slice(0, 20), // Muestra de 20
      migration_ready: processedPeople.filter(p => p.birth_date_parsed || p.death_date_parsed).length
    };

    await fs.writeFile('scripts/person-dates-migration-prep.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Resultados guardados en: scripts/person-dates-migration-prep.json');

    // 8. Guardar datos completos para migración
    await fs.writeFile('scripts/person-dates-full-data.json', JSON.stringify(processedPeople, null, 2));
    console.log('💾 Datos completos guardados en: scripts/person-dates-full-data.json');

    console.log('\n✅ ANÁLISIS COMPLETADO');
    console.log(`📊 ${dateStats.withBirthDate + dateStats.withDeathDate} fechas procesadas exitosamente`);
    console.log(`🔄 ${processedPeople.filter(p => p.birth_date_parsed || p.death_date_parsed).length} personas listas para migrar`);

  } catch (error) {
    console.error('❌ Error en la preparación:', error.message);
    console.error(error.stack);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
    }
  }
}

// Función para parsear y clasificar fechas
function parseAndClassifyDate(dateValue, importValue) {
  // Priorizar fecha import si está disponible y no es 0000-00-00
  let dateToProcess = dateValue;
  if (importValue && importValue !== '0000-00-00' && importValue !== '') {
    dateToProcess = importValue;
  }

  if (!dateToProcess || dateToProcess === '' || dateToProcess === '0000-00-00') {
    return { parsed: null, format: 'empty' };
  }

  // Formato ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateToProcess)) {
    const [year, month, day] = dateToProcess.split('-').map(Number);
    return {
      parsed: { year, month, day },
      format: 'iso'
    };
  }

  // Formato YYYYMMDD (8 dígitos)
  if (/^\d{8}$/.test(dateToProcess)) {
    const year = parseInt(dateToProcess.substr(0, 4));
    const month = parseInt(dateToProcess.substr(4, 2));
    const day = parseInt(dateToProcess.substr(6, 2));
    
    // Validación básica
    if (year >= 1800 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        parsed: { year, month, day },
        format: 'yyyymmdd'
      };
    }
  }

  // Formato YYYYMM (6 dígitos)
  if (/^\d{6}$/.test(dateToProcess)) {
    const year = parseInt(dateToProcess.substr(0, 4));
    const month = parseInt(dateToProcess.substr(4, 2));
    
    if (year >= 1800 && year <= 2100 && month >= 1 && month <= 12) {
      return {
        parsed: { year, month, day: null },
        format: 'yyyymm'
      };
    }
  }

  // Formato YYYY (4 dígitos)
  if (/^\d{4}$/.test(dateToProcess)) {
    const year = parseInt(dateToProcess);
    
    if (year >= 1800 && year <= 2100) {
      return {
        parsed: { year, month: null, day: null },
        format: 'yyyy'
      };
    }
  }

  // Otros formatos no reconocidos
  return { parsed: null, format: 'other' };
}

// Función para generar SQL de migración (ejemplo)
function generateMigrationSQL(people) {
  const updates = people
    .filter(p => p.birth_date_parsed || p.death_date_parsed)
    .map(person => {
      const updates = [];
      
      if (person.birth_date_parsed) {
        const { year, month, day } = person.birth_date_parsed;
        updates.push(`birth_year = ${year}`);
        updates.push(`birth_month = ${month || 'NULL'}`);
        updates.push(`birth_day = ${day || 'NULL'}`);
      }
      
      if (person.death_date_parsed) {
        const { year, month, day } = person.death_date_parsed;
        updates.push(`death_year = ${year}`);
        updates.push(`death_month = ${month || 'NULL'}`);
        updates.push(`death_day = ${day || 'NULL'}`);
      }
      
      return `UPDATE people SET ${updates.join(', ')} WHERE slug = '${person.slug}';`;
    });

  return updates.join('\n');
}

// Ejecutar preparación
if (require.main === module) {
  prepareDatesMigration().catch(console.error);
}

module.exports = {
  prepareDatesMigration,
  parseAndClassifyDate,
  generateMigrationSQL
};