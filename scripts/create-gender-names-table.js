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

async function createAndPopulateGenderNames() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

    // 1. Crear la tabla si no existe
    console.log('📊 Paso 1: Verificando/creando tabla first_name_genders...\n');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS first_name_genders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'UNISEX')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_first_name_genders_name ON first_name_genders(name);
      CREATE INDEX IF NOT EXISTS idx_first_name_genders_gender ON first_name_genders(gender);
    `;

    if (!isDryRun) {
      await client.query(createTableSQL);
      console.log('✅ Tabla first_name_genders creada/verificada\n');
    } else {
      console.log('📜 SQL para crear tabla:');
      console.log('─'.repeat(80));
      console.log(createTableSQL);
      console.log('─'.repeat(80));
      console.log('');
    }

    // 2. Analizar nombres existentes en people
    console.log('📊 Paso 2: Analizando nombres de pila en tabla people...\n');
    
    // Extraer el primer nombre (antes del primer espacio) y analizar géneros
    // Solo considerar personas con género asignado (MALE o FEMALE)
    const analysisQuery = `
      WITH first_names AS (
        SELECT 
          LOWER(TRIM(SPLIT_PART(first_name, ' ', 1))) as name,
          gender
        FROM people
        WHERE first_name IS NOT NULL 
          AND first_name != ''
          AND gender IN ('MALE', 'FEMALE')
      ),
      name_gender_counts AS (
        SELECT 
          name,
          gender,
          COUNT(*) as count
        FROM first_names
        WHERE name != '' AND LENGTH(name) > 1
        GROUP BY name, gender
      ),
      name_summary AS (
        SELECT 
          name,
          MAX(CASE WHEN gender = 'MALE' THEN count ELSE 0 END) as male_count,
          MAX(CASE WHEN gender = 'FEMALE' THEN count ELSE 0 END) as female_count,
          SUM(count) as total_count
        FROM name_gender_counts
        GROUP BY name
      )
      SELECT 
        name,
        male_count,
        female_count,
        total_count,
        CASE 
          WHEN male_count > 0 AND female_count > 0 THEN 'UNISEX'
          WHEN male_count > 0 THEN 'MALE'
          WHEN female_count > 0 THEN 'FEMALE'
        END as assigned_gender
      FROM name_summary
      WHERE total_count >= 1
      ORDER BY total_count DESC, name
    `;
    
    const analysisResult = await client.query(analysisQuery);
    const namesData = analysisResult.rows;
    
    // Estadísticas
    const maleNames = namesData.filter(n => n.assigned_gender === 'MALE');
    const femaleNames = namesData.filter(n => n.assigned_gender === 'FEMALE');
    const unisexNames = namesData.filter(n => n.assigned_gender === 'UNISEX');
    
    console.log(`📋 Nombres únicos encontrados: ${namesData.length}`);
    console.log(`   👨 Masculinos: ${maleNames.length}`);
    console.log(`   👩 Femeninos: ${femaleNames.length}`);
    console.log(`   👤 Unisex: ${unisexNames.length}\n`);
    
    // Mostrar nombres unisex (interesante ver cuáles son)
    if (unisexNames.length > 0) {
      console.log('📝 Nombres UNISEX detectados (usados para ambos géneros):');
      console.log('─'.repeat(80));
      console.log('Nombre\t\t\t\tMasculino\tFemenino\tTotal');
      console.log('─'.repeat(80));
      unisexNames.slice(0, 30).forEach(n => {
        const name = n.name.substring(0, 20).padEnd(20);
        console.log(`${name}\t\t${n.male_count}\t\t${n.female_count}\t\t${n.total_count}`);
      });
      if (unisexNames.length > 30) {
        console.log(`... y ${unisexNames.length - 30} nombres unisex más`);
      }
      console.log('─'.repeat(80));
      console.log('');
    }

    // Mostrar top nombres por género
    console.log('📝 Top 20 nombres MASCULINOS más frecuentes:');
    console.log('─'.repeat(60));
    maleNames.slice(0, 20).forEach((n, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${n.name.padEnd(20)} (${n.male_count} personas)`);
    });
    console.log('');

    console.log('📝 Top 20 nombres FEMENINOS más frecuentes:');
    console.log('─'.repeat(60));
    femaleNames.slice(0, 20).forEach((n, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${n.name.padEnd(20)} (${n.female_count} personas)`);
    });
    console.log('');

    // 3. Insertar datos
    if (isDryRun) {
      console.log('⚠️  MODO DRY-RUN: No se realizarán cambios.');
      console.log('   Para ejecutar los cambios, usa: node create-gender-names-table.js --execute\n');
      
      console.log('📜 Se insertarían los siguientes registros:');
      console.log(`   - ${maleNames.length} nombres masculinos`);
      console.log(`   - ${femaleNames.length} nombres femeninos`);
      console.log(`   - ${unisexNames.length} nombres unisex`);
      console.log(`   - Total: ${namesData.length} registros\n`);
      
    } else {
      console.log('🚀 Paso 3: Insertando nombres en la tabla...\n');
      
      // Limpiar tabla existente
      await client.query('TRUNCATE TABLE first_name_genders RESTART IDENTITY');
      console.log('   🗑️  Tabla limpiada');
      
      // Insertar en lotes
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < namesData.length; i += batchSize) {
        const batch = namesData.slice(i, i + batchSize);
        
        const values = batch.map((n, idx) => 
          `($${idx * 2 + 1}, $${idx * 2 + 2})`
        ).join(', ');
        
        const params = batch.flatMap(n => [n.name, n.assigned_gender]);
        
        const insertQuery = `
          INSERT INTO first_name_genders (name, gender)
          VALUES ${values}
          ON CONFLICT (name) DO UPDATE SET 
            gender = EXCLUDED.gender,
            updated_at = NOW()
        `;
        
        await client.query(insertQuery, params);
        inserted += batch.length;
        
        // Progreso
        const percent = Math.round((inserted / namesData.length) * 100);
        process.stdout.write(`\r   📥 Insertados: ${inserted}/${namesData.length} (${percent}%)`);
      }
      
      console.log('\n\n✅ Inserción completada\n');
    }

    // 4. Estadísticas finales
    console.log('📊 Estadísticas finales:');
    
    if (!isDryRun) {
      const statsQuery = `
        SELECT 
          gender,
          COUNT(*) as count
        FROM first_name_genders
        GROUP BY gender
        ORDER BY gender
      `;
      
      const statsResult = await client.query(statsQuery);
      
      statsResult.rows.forEach(row => {
        const icon = row.gender === 'MALE' ? '👨' : row.gender === 'FEMALE' ? '👩' : '👤';
        console.log(`   ${icon} ${row.gender}: ${row.count} nombres`);
      });
      
      const totalQuery = await client.query('SELECT COUNT(*) as total FROM first_name_genders');
      console.log(`   📊 Total: ${totalQuery.rows[0].total} nombres`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🔧 Script para crear tabla de nombres con género');
console.log('   Crea la tabla first_name_genders y la puebla con datos de people\n');
console.log('═'.repeat(80));
createAndPopulateGenderNames();