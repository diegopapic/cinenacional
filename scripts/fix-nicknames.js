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

async function fixNicknames() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Analizar cuántos registros serán afectados
    console.log('📊 Analizando registros con apodos entre comillas al inicio del apellido...\n');
    
    // Buscar apellidos que comienzan con "algo" (comillas dobles)
    const analysisQuery = `
      SELECT 
        id, 
        first_name, 
        last_name,
        -- Extraer el apodo (la parte entre comillas al inicio)
        substring(last_name from '^"[^"]+"') as nickname,
        -- El resto del apellido (sin el apodo y sin espacios iniciales)
        trim(regexp_replace(last_name, '^"[^"]+"\s*', '')) as clean_last_name,
        slug
      FROM people 
      WHERE last_name ~ '^"[^"]+"'
      ORDER BY id
    `;
    
    const analysisResult = await client.query(analysisQuery);
    const recordsToFix = analysisResult.rows;
    
    console.log(`📋 Registros encontrados: ${recordsToFix.length}\n`);
    
    if (recordsToFix.length === 0) {
      console.log('✅ No hay registros que necesiten corrección.');
      return;
    }
    
    // Mostrar todos los registros a modificar (o los primeros 30 si son muchos)
    const maxToShow = Math.min(recordsToFix.length, 30);
    console.log(`📝 ${maxToShow === recordsToFix.length ? 'Registros' : `Primeros ${maxToShow} registros`} a modificar:`);
    console.log('─'.repeat(120));
    console.log('ID\tNombre Actual\t\t\t\tApellido Actual\t\t\t\t→ Nombre Nuevo\t\t\t\tApellido Nuevo');
    console.log('─'.repeat(120));
    
    recordsToFix.slice(0, maxToShow).forEach(record => {
      const currentFirstName = (record.first_name || 'NULL').substring(0, 20).padEnd(20);
      const currentLastName = (record.last_name || '').substring(0, 30).padEnd(30);
      
      // Calcular el nuevo nombre (nombre actual + apodo)
      const newFirstName = record.first_name 
        ? `${record.first_name} ${record.nickname}`.substring(0, 25).padEnd(25)
        : (record.nickname || '').substring(0, 25).padEnd(25);
      const newLastName = (record.clean_last_name || '').substring(0, 20).padEnd(20);
      
      console.log(`${record.id}\t${currentFirstName}\t${currentLastName}\t→ ${newFirstName}\t${newLastName}`);
    });
    
    if (recordsToFix.length > maxToShow) {
      console.log(`... y ${recordsToFix.length - maxToShow} registros más`);
    }
    console.log('─'.repeat(120));
    
    // 2. Mostrar lo que se va a hacer
    console.log('\n🔄 Operación a realizar:');
    console.log('   - Detectar apodos entre comillas al INICIO del apellido');
    console.log('   - Mover el apodo al FINAL del nombre (con espacio)');
    console.log('   - Limpiar el apellido (quitar apodo y espacios iniciales)\n');
    
    // 3. Modo dry-run o ejecución
    const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
    
    if (isDryRun) {
      console.log('⚠️  MODO DRY-RUN: No se realizarán cambios.');
      console.log('   Para ejecutar los cambios, usa: node fix-nicknames.js --execute\n');
      
      // Mostrar SQL que se ejecutaría
      console.log('📜 SQL que se ejecutaría:');
      console.log('─'.repeat(100));
      console.log(`
UPDATE people 
SET 
  -- Agregar el apodo al final del nombre (con espacio si hay nombre previo)
  first_name = CASE 
    WHEN first_name IS NOT NULL AND first_name != '' 
    THEN first_name || ' ' || substring(last_name from '^"[^"]+"')
    ELSE substring(last_name from '^"[^"]+"')
  END,
  -- Quitar el apodo del apellido y limpiar espacios
  last_name = trim(regexp_replace(last_name, '^"[^"]+"\s*', '')),
  updated_at = NOW()
WHERE last_name ~ '^"[^"]+"';
      `);
      console.log('─'.repeat(100));
      
    } else {
      // 4. Ejecutar la actualización
      console.log('🚀 Ejecutando actualización...\n');
      
      const updateQuery = `
        UPDATE people 
        SET 
          first_name = CASE 
            WHEN first_name IS NOT NULL AND first_name != '' 
            THEN first_name || ' ' || substring(last_name from '^"[^"]+"')
            ELSE substring(last_name from '^"[^"]+"')
          END,
          last_name = trim(regexp_replace(last_name, '^"[^"]+"\s*', '')),
          updated_at = NOW()
        WHERE last_name ~ '^"[^"]+"'
        RETURNING id, first_name, last_name, slug
      `;
      
      const updateResult = await client.query(updateQuery);
      
      console.log(`✅ Registros actualizados: ${updateResult.rowCount}\n`);
      
      // Mostrar ejemplos de los actualizados
      if (updateResult.rows.length > 0) {
        const showCount = Math.min(updateResult.rows.length, 15);
        console.log(`📝 ${showCount === updateResult.rows.length ? 'Registros' : `Primeros ${showCount} registros`} actualizados:`);
        console.log('─'.repeat(100));
        console.log('ID\tNombre (nuevo)\t\t\t\tApellido (nuevo)\t\t\tSlug');
        console.log('─'.repeat(100));
        
        updateResult.rows.slice(0, showCount).forEach(record => {
          const firstName = (record.first_name || 'NULL').substring(0, 30).padEnd(30);
          const lastName = (record.last_name || '').substring(0, 25).padEnd(25);
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
        COUNT(CASE WHEN last_name ~ '^"[^"]+"' THEN 1 END) as con_apodo_en_apellido,
        COUNT(CASE WHEN first_name ~ '"[^"]+"' THEN 1 END) as con_apodo_en_nombre
      FROM people
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`   Total de personas: ${stats.total}`);
    console.log(`   Con apodo al inicio del apellido: ${stats.con_apodo_en_apellido}`);
    console.log(`   Con apodo en el nombre: ${stats.con_apodo_en_nombre}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🔧 Script para corregir apodos entre comillas');
console.log('   Mover apodos del inicio del apellido al final del nombre');
console.log('   Ejemplo: "Ernesto" + "Che" Guevara → Ernesto "Che" + Guevara\n');
console.log('═'.repeat(120));
fixNicknames();