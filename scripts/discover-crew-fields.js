// scripts/discover-crew-fields.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function discoverCrewFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🔍 Descubriendo campos de crew en WordPress...\n');
    
    // 1. Buscar todos los campos base que son contadores
    console.log('Buscando campos principales (contadores)...');
    const [mainFields] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key LIKE 'ficha_tecnica_%'
      AND meta_key NOT LIKE '%_%_%'
      AND meta_key NOT LIKE '%_import'
      AND meta_value REGEXP '^[0-9]+$'
      AND CAST(meta_value AS UNSIGNED) > 0
      GROUP BY meta_key
      HAVING count > 10
      ORDER BY count DESC
    `);
    
    console.log(`\nCampos principales encontrados (${mainFields.length}):`);
    mainFields.forEach(f => {
      console.log(`  ${f.meta_key}: usado en ${f.count} películas`);
    });
    
    // 2. Para cada campo principal, verificar si tiene subcampos de persona
    console.log('\n✅ Campos válidos con estructura de crew:');
    const validFields = [];
    
    for (const field of mainFields) {
      const fieldName = field.meta_key;
      
      // Verificar si tiene subcampos _0_persona
      const [hasPersona] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM wp_postmeta
        WHERE meta_key = ?
        LIMIT 1
      `, [`${fieldName}_0_persona`]);
      
      if (hasPersona[0].count > 0) {
        validFields.push(fieldName);
        console.log(`  ✓ ${fieldName}`);
        
        // Ver ejemplo de estructura
        const [example] = await connection.execute(`
          SELECT post_id
          FROM wp_postmeta
          WHERE meta_key = ?
          AND meta_value > '0'
          LIMIT 1
        `, [fieldName]);
        
        if (example[0]) {
          const [sampleData] = await connection.execute(`
            SELECT meta_key, meta_value
            FROM wp_postmeta
            WHERE post_id = ?
            AND meta_key LIKE ?
            ORDER BY meta_key
            LIMIT 5
          `, [example[0].post_id, `${fieldName}_%`]);
          
          console.log(`    Ejemplo de estructura:`);
          sampleData.forEach(s => {
            const value = s.meta_value ? s.meta_value.substring(0, 50) : 'null';
            console.log(`      ${s.meta_key}: ${value}`);
          });
        }
      }
    }
    
    // 3. También buscar campos que no siguen el patrón estándar
    console.log('\n🔍 Buscando otros posibles campos de crew...');
    const [otherFields] = await connection.execute(`
      SELECT DISTINCT 
        SUBSTRING_INDEX(meta_key, '_0_', 1) as field_base,
        COUNT(DISTINCT post_id) as movie_count
      FROM wp_postmeta
      WHERE meta_key LIKE '%_0_persona'
      GROUP BY field_base
      HAVING movie_count > 10
      ORDER BY movie_count DESC
    `);
    
    console.log(`\nOtros campos encontrados analizando _0_persona:`);
    otherFields.forEach(f => {
      console.log(`  ${f.field_base}: en ${f.movie_count} películas`);
    });
    
    return validFields;

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

discoverCrewFields();