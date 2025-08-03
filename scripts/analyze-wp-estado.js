/**
 * Script para analizar cómo se almacenan los Estados de las películas en WordPress
 * Ubicación: /scripts/analyze-wp-estado.js
 */

const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root', // Ajusta según tu configuración
  password: '', // Ajusta según tu configuración
  database: 'wordpress_cine',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function analyzeEstadoStorage() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('='.repeat(80));
    console.log('ANÁLISIS DE ALMACENAMIENTO DE ESTADOS EN WORDPRESS');
    console.log('='.repeat(80));
    console.log();

    // 1. Buscar en wp_postmeta campos que puedan contener "estado"
    console.log('1. BUSCANDO EN WP_POSTMETA');
    console.log('-'.repeat(40));
    
    const [metaEstado] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta pm
      INNER JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        meta_key LIKE '%estado%' 
        OR meta_key LIKE '%status%'
        OR meta_key LIKE '%produccion%'
        OR meta_key LIKE '%completa%'
      )
      GROUP BY meta_key
      ORDER BY count DESC
    `);
    
    if (metaEstado.length > 0) {
      console.log('Meta campos encontrados relacionados con estado:');
      metaEstado.forEach(row => {
        console.log(`  - ${row.meta_key}: ${row.count} registros`);
      });
      
      // Mostrar valores únicos para cada meta_key encontrado
      for (const row of metaEstado) {
        const [valores] = await connection.execute(`
          SELECT DISTINCT meta_value, COUNT(*) as count
          FROM wp_postmeta pm
          INNER JOIN wp_posts p ON pm.post_id = p.ID
          WHERE p.post_type = 'pelicula'
          AND meta_key = ?
          GROUP BY meta_value
          ORDER BY count DESC
          LIMIT 10
        `, [row.meta_key]);
        
        console.log(`\n  Valores para '${row.meta_key}':`);
        valores.forEach(val => {
          const displayValue = val.meta_value ? 
            (val.meta_value.length > 50 ? val.meta_value.substring(0, 50) + '...' : val.meta_value) : 
            '[vacío]';
          console.log(`    • ${displayValue} (${val.count} películas)`);
        });
      }
    } else {
      console.log('No se encontraron meta campos con palabras clave de estado.');
    }
    
    console.log();

    // 2. Buscar en taxonomías personalizadas
    console.log('2. BUSCANDO EN TAXONOMÍAS');
    console.log('-'.repeat(40));
    
    const [taxonomias] = await connection.execute(`
      SELECT DISTINCT tt.taxonomy, COUNT(DISTINCT tr.object_id) as count
      FROM wp_term_relationships tr
      INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        tt.taxonomy LIKE '%estado%'
        OR tt.taxonomy LIKE '%status%'
        OR tt.taxonomy LIKE '%produccion%'
      )
      GROUP BY tt.taxonomy
    `);
    
    if (taxonomias.length > 0) {
      console.log('Taxonomías encontradas relacionadas con estado:');
      taxonomias.forEach(row => {
        console.log(`  - ${row.taxonomy}: ${row.count} películas`);
      });
      
      // Mostrar términos de cada taxonomía
      for (const tax of taxonomias) {
        const [terminos] = await connection.execute(`
          SELECT t.name, t.slug, COUNT(tr.object_id) as count
          FROM wp_terms t
          INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
          INNER JOIN wp_posts p ON tr.object_id = p.ID
          WHERE tt.taxonomy = ?
          AND p.post_type = 'pelicula'
          GROUP BY t.term_id
          ORDER BY count DESC
        `, [tax.taxonomy]);
        
        console.log(`\n  Términos en '${tax.taxonomy}':`);
        terminos.forEach(term => {
          console.log(`    • ${term.name} (${term.slug}): ${term.count} películas`);
        });
      }
    } else {
      console.log('No se encontraron taxonomías con palabras clave de estado.');
    }
    
    console.log();

    // 3. Buscar términos que contengan palabras clave de estado
    console.log('3. BUSCANDO TÉRMINOS CON PALABRAS CLAVE DE ESTADO');
    console.log('-'.repeat(40));
    
    const [terminos] = await connection.execute(`
      SELECT DISTINCT t.name, t.slug, tt.taxonomy, COUNT(tr.object_id) as count
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        t.name LIKE '%completa%'
        OR t.name LIKE '%produccion%'
        OR t.name LIKE '%producción%'
        OR t.name LIKE '%preproduccion%'
        OR t.name LIKE '%preproducción%'
        OR t.name LIKE '%postproduccion%'
        OR t.name LIKE '%postproducción%'
        OR t.name LIKE '%rodaje%'
        OR t.name LIKE '%desarrollo%'
        OR t.name LIKE '%estreno%'
      )
      GROUP BY t.term_id
      ORDER BY count DESC
    `);
    
    if (terminos.length > 0) {
      console.log('Términos encontrados que podrían indicar estado:');
      terminos.forEach(term => {
        console.log(`  - ${term.name} (taxonomía: ${term.taxonomy}): ${term.count} películas`);
      });
    } else {
      console.log('No se encontraron términos con palabras clave de estado.');
    }
    
    console.log();

    // 4. Analizar valores en post_status
    console.log('4. ANALIZANDO POST_STATUS');
    console.log('-'.repeat(40));
    
    const [postStatus] = await connection.execute(`
      SELECT post_status, COUNT(*) as count
      FROM wp_posts
      WHERE post_type = 'pelicula'
      GROUP BY post_status
      ORDER BY count DESC
    `);
    
    console.log('Estados de publicación (post_status):');
    postStatus.forEach(status => {
      console.log(`  - ${status.post_status}: ${status.count} películas`);
    });
    
    console.log();

    // 5. Buscar en todos los meta_value texto que pueda indicar estado
    console.log('5. BUSCANDO TEXTO DE ESTADO EN META_VALUES');
    console.log('-'.repeat(40));
    
    const [metaTexto] = await connection.execute(`
      SELECT pm.meta_key, pm.meta_value, COUNT(*) as count
      FROM wp_postmeta pm
      INNER JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        pm.meta_value LIKE '%completa%'
        OR pm.meta_value LIKE '%en producción%'
        OR pm.meta_value LIKE '%en produccion%'
        OR pm.meta_value LIKE '%preproducción%'
        OR pm.meta_value LIKE '%preproduccion%'
        OR pm.meta_value LIKE '%postproducción%'
        OR pm.meta_value LIKE '%postproduccion%'
        OR pm.meta_value LIKE '%en rodaje%'
        OR pm.meta_value LIKE '%en desarrollo%'
      )
      GROUP BY pm.meta_key, pm.meta_value
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (metaTexto.length > 0) {
      console.log('Meta values encontrados con texto de estado:');
      metaTexto.forEach(row => {
        const displayValue = row.meta_value.length > 60 ? 
          row.meta_value.substring(0, 60) + '...' : 
          row.meta_value;
        console.log(`  - ${row.meta_key}: "${displayValue}" (${row.count} veces)`);
      });
    } else {
      console.log('No se encontraron meta values con texto de estado.');
    }
    
    console.log();

    // 6. Mostrar algunas películas de ejemplo con todos sus metadatos
    console.log('6. EJEMPLOS DE PELÍCULAS CON SUS METADATOS');
    console.log('-'.repeat(40));
    
    const [peliculasEjemplo] = await connection.execute(`
      SELECT ID, post_title
      FROM wp_posts
      WHERE post_type = 'pelicula'
      AND post_status = 'publish'
      ORDER BY ID DESC
      LIMIT 3
    `);
    
    for (const pelicula of peliculasEjemplo) {
      console.log(`\nPelícula: ${pelicula.post_title} (ID: ${pelicula.ID})`);
      
      // Obtener todos los metadatos
      const [metadatos] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        AND meta_key NOT LIKE '\\_%'
        ORDER BY meta_key
      `, [pelicula.ID]);
      
      console.log('  Metadatos:');
      metadatos.forEach(meta => {
        const displayValue = meta.meta_value && meta.meta_value.length > 50 ? 
          meta.meta_value.substring(0, 50) + '...' : 
          meta.meta_value || '[vacío]';
        console.log(`    • ${meta.meta_key}: ${displayValue}`);
      });
      
      // Obtener taxonomías
      const [taxPelicula] = await connection.execute(`
        SELECT tt.taxonomy, GROUP_CONCAT(t.name SEPARATOR ', ') as terms
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        INNER JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE tr.object_id = ?
        GROUP BY tt.taxonomy
      `, [pelicula.ID]);
      
      if (taxPelicula.length > 0) {
        console.log('  Taxonomías:');
        taxPelicula.forEach(tax => {
          console.log(`    • ${tax.taxonomy}: ${tax.terms}`);
        });
      }
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('RESUMEN DEL ANÁLISIS');
    console.log('='.repeat(80));
    
    // Generar resumen
    const [totalPeliculas] = await connection.execute(`
      SELECT COUNT(*) as total FROM wp_posts WHERE post_type = 'pelicula'
    `);
    
    console.log(`Total de películas analizadas: ${totalPeliculas[0].total}`);
    console.log('\nRecomendaciones:');
    console.log('1. Revisar los meta campos y taxonomías encontrados arriba');
    console.log('2. Verificar si el estado se guarda en algún campo específico');
    console.log('3. Considerar si el estado está implícito en otras propiedades');
    console.log('4. Ejecutar consultas adicionales según los hallazgos');
    
  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeEstadoStorage()
  .then(() => {
    console.log('\nAnálisis completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });