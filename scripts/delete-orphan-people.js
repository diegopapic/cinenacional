const { Client } = require('pg');

// Configuración PostgreSQL - VPS
// Para ejecutar localmente con túnel SSH:
// ssh -L 5433:localhost:5433 usuario@5.161.58.106
const pgConfig = {
  host: 'localhost',
  port: 5433,
  database: 'cinenacional',
  user: 'cinenacional',
  password: 'Paganitzu'
};

async function deleteOrphanPeople() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Analizar cuántas personas no tienen películas relacionadas
    console.log('📊 Analizando personas sin películas relacionadas...\n');
    
    const analysisQuery = `
      SELECT 
        p.id, 
        p.first_name, 
        p.last_name,
        p.slug,
        p.created_at
      FROM people p
      LEFT JOIN movie_cast mc ON p.id = mc.person_id
      LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
      WHERE mc.id IS NULL AND mcr.id IS NULL
      ORDER BY p.id
    `;
    
    const analysisResult = await client.query(analysisQuery);
    const recordsToDelete = analysisResult.rows;
    
    console.log(`📋 Personas sin películas encontradas: ${recordsToDelete.length}\n`);
    
    if (recordsToDelete.length === 0) {
      console.log('✅ No hay personas huérfanas para eliminar.');
      return;
    }
    
    // Mostrar los registros a eliminar
    const maxToShow = Math.min(recordsToDelete.length, 50);
    console.log(`📝 ${maxToShow === recordsToDelete.length ? 'Personas' : `Primeras ${maxToShow} personas`} a eliminar:`);
    console.log('─'.repeat(100));
    console.log('ID\tNombre\t\t\t\tApellido\t\t\tSlug');
    console.log('─'.repeat(100));
    
    recordsToDelete.slice(0, maxToShow).forEach(record => {
      const firstName = (record.first_name || 'NULL').substring(0, 20).padEnd(20);
      const lastName = (record.last_name || 'NULL').substring(0, 20).padEnd(20);
      console.log(`${record.id}\t${firstName}\t${lastName}\t${record.slug}`);
    });
    
    if (recordsToDelete.length > maxToShow) {
      console.log(`... y ${recordsToDelete.length - maxToShow} personas más`);
    }
    console.log('─'.repeat(100));
    
    // 2. Mostrar lo que se va a hacer
    console.log('\n🔄 Operación a realizar:');
    console.log('   - Eliminar personas que NO aparecen en movie_cast (elenco)');
    console.log('   - NI en movie_crew (equipo técnico)');
    console.log('   ⚠️  Esta operación es IRREVERSIBLE\n');
    
    // 3. Modo dry-run o ejecución
    const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
    
    if (isDryRun) {
      console.log('⚠️  MODO DRY-RUN: No se realizarán cambios.');
      console.log('   Para ejecutar los cambios, usa: node delete-orphan-people.js --execute\n');
      
      // Mostrar SQL que se ejecutaría
      console.log('📜 SQL que se ejecutaría:');
      console.log('─'.repeat(100));
      console.log(`
-- Primero eliminar registros relacionados en person_links
DELETE FROM person_links 
WHERE person_id IN (
  SELECT p.id FROM people p
  LEFT JOIN movie_cast mc ON p.id = mc.person_id
  LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
  WHERE mc.id IS NULL AND mcr.id IS NULL
);

-- Luego eliminar registros en person_nationalities
DELETE FROM person_nationalities 
WHERE person_id IN (
  SELECT p.id FROM people p
  LEFT JOIN movie_cast mc ON p.id = mc.person_id
  LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
  WHERE mc.id IS NULL AND mcr.id IS NULL
);

-- Finalmente eliminar las personas
DELETE FROM people 
WHERE id IN (
  SELECT p.id FROM people p
  LEFT JOIN movie_cast mc ON p.id = mc.person_id
  LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
  WHERE mc.id IS NULL AND mcr.id IS NULL
);
      `);
      console.log('─'.repeat(100));
      
    } else {
      // 4. Ejecutar la eliminación
      console.log('🚀 Ejecutando eliminación...\n');
      
      // Obtener IDs a eliminar
      const idsToDelete = recordsToDelete.map(r => r.id);
      
      // Eliminar en orden: primero las tablas relacionadas, luego people
      
      // 4.1 Eliminar person_links
      const deleteLinksQuery = `
        DELETE FROM person_links 
        WHERE person_id = ANY($1::int[])
        RETURNING id
      `;
      const linksResult = await client.query(deleteLinksQuery, [idsToDelete]);
      console.log(`   🔗 Links eliminados: ${linksResult.rowCount}`);
      
      // 4.2 Eliminar person_nationalities
      const deleteNationalitiesQuery = `
        DELETE FROM person_nationalities 
        WHERE person_id = ANY($1::int[])
        RETURNING person_id
      `;
      const nationalitiesResult = await client.query(deleteNationalitiesQuery, [idsToDelete]);
      console.log(`   🌍 Nacionalidades eliminadas: ${nationalitiesResult.rowCount}`);
      
      // 4.3 Eliminar personas
      const deletePeopleQuery = `
        DELETE FROM people 
        WHERE id = ANY($1::int[])
        RETURNING id, first_name, last_name, slug
      `;
      const peopleResult = await client.query(deletePeopleQuery, [idsToDelete]);
      
      console.log(`\n✅ Personas eliminadas: ${peopleResult.rowCount}\n`);
      
      // Mostrar ejemplos de los eliminados
      if (peopleResult.rows.length > 0) {
        const showCount = Math.min(peopleResult.rows.length, 15);
        console.log(`📝 ${showCount === peopleResult.rows.length ? 'Personas' : `Primeras ${showCount} personas`} eliminadas:`);
        console.log('─'.repeat(100));
        console.log('ID\tNombre\t\t\t\tApellido\t\t\tSlug');
        console.log('─'.repeat(100));
        
        peopleResult.rows.slice(0, showCount).forEach(record => {
          const firstName = (record.first_name || 'NULL').substring(0, 20).padEnd(20);
          const lastName = (record.last_name || 'NULL').substring(0, 20).padEnd(20);
          console.log(`${record.id}\t${firstName}\t${lastName}\t${record.slug}`);
        });
        console.log('─'.repeat(100));
      }
    }
    
    // 5. Estadísticas finales
    console.log('\n📊 Estadísticas de la tabla people:');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN mc.id IS NOT NULL THEN 1 END) as en_elenco,
        COUNT(CASE WHEN mcr.id IS NOT NULL THEN 1 END) as en_crew
      FROM people p
      LEFT JOIN movie_cast mc ON p.id = mc.person_id
      LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Contar huérfanos restantes
    const orphanQuery = `
      SELECT COUNT(*) as huerfanos
      FROM people p
      LEFT JOIN movie_cast mc ON p.id = mc.person_id
      LEFT JOIN movie_crew mcr ON p.id = mcr.person_id
      WHERE mc.id IS NULL AND mcr.id IS NULL
    `;
    const orphanResult = await client.query(orphanQuery);
    
    console.log(`   Total de personas: ${stats.total}`);
    console.log(`   En elenco (movie_cast): ${stats.en_elenco}`);
    console.log(`   En equipo (movie_crew): ${stats.en_crew}`);
    console.log(`   Sin películas (huérfanas): ${orphanResult.rows[0].huerfanos}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🔧 Script para eliminar personas sin películas');
console.log('   Elimina personas que no están en movie_cast ni movie_crew');
console.log('   ⚠️  OPERACIÓN IRREVERSIBLE - usar con cuidado\n');
console.log('═'.repeat(100));
deleteOrphanPeople();