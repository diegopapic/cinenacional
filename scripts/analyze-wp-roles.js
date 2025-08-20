// scripts/analyze-wp-roles.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

// Configuración de la base de datos MySQL local
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  port: 3306
};

async function analyzeRoles() {
  let connection;
  
  try {
    console.log('🔍 Analizando roles en la base de datos WordPress...\n');
    console.log('=====================================\n');
    
    connection = await mysql.createConnection(wpConfig);
    
    // 1. Buscar en wp_postmeta campos relacionados con roles/crew
    console.log('1. BUSCANDO CAMPOS DE ROLES EN wp_postmeta:');
    console.log('-------------------------------------------');
    
    const [roleMetaKeys] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND (
          meta_key LIKE '%rol%' 
          OR meta_key LIKE '%role%'
          OR meta_key LIKE '%crew%'
          OR meta_key LIKE '%equipo%'
          OR meta_key LIKE '%director%'
          OR meta_key LIKE '%productor%'
          OR meta_key LIKE '%guion%'
          OR meta_key LIKE '%fotograf%'
          OR meta_key LIKE '%montaje%'
          OR meta_key LIKE '%edicion%'
          OR meta_key LIKE '%sonido%'
          OR meta_key LIKE '%musica%'
          OR meta_key LIKE '%arte%'
          OR meta_key LIKE '%vestuario%'
          OR meta_key LIKE '%maquillaje%'
        )
      GROUP BY meta_key
      ORDER BY count DESC
    `);
    
    if (roleMetaKeys.length > 0) {
      console.log('Campos encontrados:');
      roleMetaKeys.forEach(field => {
        console.log(`  - ${field.meta_key}: ${field.count} registros`);
      });
    } else {
      console.log('  No se encontraron campos de roles en wp_postmeta con los criterios básicos.');
    }
    
    // 2. Buscar campos serializados que puedan contener información de crew
    console.log('\n2. BUSCANDO CAMPOS SERIALIZADOS:');
    console.log('-------------------------------------------');
    
    const [serializedFields] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND meta_value LIKE 'a:%'
      GROUP BY meta_key
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('Campos serializados encontrados (posibles arrays/objetos):');
    for (const field of serializedFields) {
      console.log(`  - ${field.meta_key}: ${field.count} registros`);
      
      // Obtener una muestra del contenido
      const [sample] = await connection.execute(`
        SELECT meta_value
        FROM wp_postmeta pm
        JOIN wp_posts p ON pm.post_id = p.ID
        WHERE p.post_type = 'pelicula'
          AND meta_key = ?
          AND meta_value IS NOT NULL
          AND meta_value != ''
        LIMIT 1
      `, [field.meta_key]);
      
      if (sample.length > 0) {
        try {
          // Intentar deserializar si es PHP serializado
          const phpUnserialize = require('php-unserialize');
          const unserializedData = phpUnserialize.unserialize(sample[0].meta_value);
          
          // Si contiene información relevante de roles, mostrar estructura
          const dataStr = JSON.stringify(unserializedData, null, 2);
          if (dataStr.toLowerCase().includes('director') || 
              dataStr.toLowerCase().includes('productor') ||
              dataStr.toLowerCase().includes('guion') ||
              dataStr.toLowerCase().includes('role') ||
              dataStr.toLowerCase().includes('crew')) {
            console.log(`    ⚠️  Posible campo de roles - Estructura de ejemplo:`);
            console.log(`    ${dataStr.substring(0, 500)}...`);
          }
        } catch (e) {
          // No es serializado PHP o error al deserializar
        }
      }
    }
    
    // 3. Buscar taxonomías personalizadas para roles
    console.log('\n3. BUSCANDO TAXONOMÍAS PERSONALIZADAS:');
    console.log('-------------------------------------------');
    
    const [taxonomies] = await connection.execute(`
      SELECT DISTINCT tt.taxonomy, COUNT(*) as count
      FROM wp_term_taxonomy tt
      JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
      GROUP BY tt.taxonomy
      ORDER BY count DESC
    `);
    
    console.log('Taxonomías asociadas a películas:');
    taxonomies.forEach(tax => {
      console.log(`  - ${tax.taxonomy}: ${tax.count} relaciones`);
    });
    
    // Buscar términos en taxonomías que parezcan roles
    for (const tax of taxonomies) {
      if (tax.taxonomy.includes('rol') || 
          tax.taxonomy.includes('crew') || 
          tax.taxonomy.includes('equipo') ||
          tax.taxonomy.includes('cargo')) {
        
        console.log(`\n    Términos en ${tax.taxonomy}:`);
        const [terms] = await connection.execute(`
          SELECT t.name, COUNT(*) as count
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
          JOIN wp_posts p ON tr.object_id = p.ID
          WHERE tt.taxonomy = ?
            AND p.post_type = 'pelicula'
          GROUP BY t.term_id
          ORDER BY count DESC
          LIMIT 10
        `, [tax.taxonomy]);
        
        terms.forEach(term => {
          console.log(`      - ${term.name}: ${term.count} películas`);
        });
      }
    }
    
    // 4. Buscar en tablas personalizadas
    console.log('\n4. BUSCANDO TABLAS PERSONALIZADAS:');
    console.log('-------------------------------------------');
    
    const [customTables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'wordpress_cine'
        AND (
          TABLE_NAME LIKE '%crew%'
          OR TABLE_NAME LIKE '%role%'
          OR TABLE_NAME LIKE '%equipo%'
          OR TABLE_NAME LIKE '%cargo%'
          OR TABLE_NAME LIKE '%person%'
          OR TABLE_NAME LIKE '%people%'
          OR TABLE_NAME LIKE '%cast%'
        )
    `);
    
    if (customTables.length > 0) {
      console.log('Tablas personalizadas encontradas:');
      for (const table of customTables) {
        console.log(`  - ${table.TABLE_NAME}`);
        
        // Obtener estructura de la tabla
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME, DATA_TYPE
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = 'wordpress_cine'
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [table.TABLE_NAME]);
        
        console.log('    Columnas:');
        columns.forEach(col => {
          console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });
        
        // Contar registros
        const [count] = await connection.execute(`
          SELECT COUNT(*) as total FROM ${table.TABLE_NAME}
        `);
        console.log(`    Total registros: ${count[0].total}\n`);
      }
    } else {
      console.log('  No se encontraron tablas personalizadas relacionadas con roles.');
    }
    
    // 5. Analizar campos ACF (Advanced Custom Fields) si existe
    console.log('\n5. BUSCANDO CAMPOS ACF:');
    console.log('-------------------------------------------');
    
    const [acfFields] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND (meta_key LIKE 'field_%' OR meta_key LIKE '_%')
      GROUP BY meta_key
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (acfFields.length > 0) {
      console.log('Posibles campos ACF encontrados:');
      for (const field of acfFields) {
        // Buscar el nombre real del campo ACF
        const fieldName = field.meta_key.startsWith('_') ? field.meta_key.substring(1) : field.meta_key;
        
        const [realField] = await connection.execute(`
          SELECT DISTINCT meta_key, meta_value
          FROM wp_postmeta
          WHERE meta_key = ?
          LIMIT 1
        `, [fieldName]);
        
        if (realField.length > 0) {
          console.log(`  - ${field.meta_key} -> ${fieldName}: ${field.count} registros`);
        }
      }
    }
    
    // 6. Buscar patrones comunes de almacenamiento de crew/cast
    console.log('\n6. ANALIZANDO PATRONES DE ALMACENAMIENTO:');
    console.log('-------------------------------------------');
    
    // Buscar campos que contengan IDs de personas
    const [personFields] = await connection.execute(`
      SELECT DISTINCT meta_key, meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND meta_value REGEXP '^[0-9]+$'
        AND meta_key NOT LIKE '%id'
        AND meta_key NOT LIKE 'field_%'
        AND meta_key NOT LIKE '_%'
      LIMIT 20
    `);
    
    console.log('Campos que podrían contener IDs de personas:');
    for (const field of personFields) {
      // Verificar si el ID corresponde a un post de tipo persona
      const [person] = await connection.execute(`
        SELECT post_type, post_title
        FROM wp_posts
        WHERE ID = ?
      `, [field.meta_value]);
      
      if (person.length > 0 && person[0].post_type === 'persona') {
        console.log(`  ✓ ${field.meta_key}: apunta a persona "${person[0].post_title}"`);
      }
    }
    
    // 7. Buscar relaciones many-to-many entre películas y personas
    console.log('\n7. BUSCANDO RELACIONES PELÍCULA-PERSONA:');
    console.log('-------------------------------------------');
    
    const [p2pTables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'wordpress_cine'
        AND TABLE_NAME LIKE '%p2p%'
    `);
    
    if (p2pTables.length > 0) {
      console.log('Tablas Posts 2 Posts encontradas:');
      for (const table of p2pTables) {
        console.log(`  - ${table.TABLE_NAME}`);
        
        // Analizar contenido
        const [sample] = await connection.execute(`
          SELECT * FROM ${table.TABLE_NAME} LIMIT 5
        `);
        
        if (sample.length > 0) {
          console.log('    Estructura de ejemplo:');
          console.log(JSON.stringify(sample[0], null, 2));
        }
      }
    }
    
    // 8. Resumen y recomendaciones
    console.log('\n=====================================');
    console.log('RESUMEN Y RECOMENDACIONES:');
    console.log('=====================================\n');
    
    console.log('Basándome en el análisis, los roles probablemente están en:');
    console.log('1. Campos serializados en wp_postmeta');
    console.log('2. Tablas personalizadas de relaciones (si existen)');
    console.log('3. Taxonomías personalizadas');
    console.log('4. Tablas Posts 2 Posts (plugin P2P)');
    console.log('\nEjecuta el siguiente script para analizar una película específica:');
    console.log('node scripts/analyze-wp-movie-roles.js [movie_id]');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar el análisis
analyzeRoles().catch(console.error);