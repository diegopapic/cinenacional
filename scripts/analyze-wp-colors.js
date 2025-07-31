const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajusta según tu configuración
  database: 'wordpress_cine'
};

async function analyzeColors() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress\n');

    // Primero, verifiquemos la taxonomía de color
    const taxonomyQuery = `
      SELECT DISTINCT taxonomy 
      FROM wp_term_taxonomy tt
      INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND taxonomy LIKE '%color%'
    `;
    
    const [taxonomies] = await connection.execute(taxonomyQuery);
    console.log('🔍 Taxonomías relacionadas con color encontradas:');
    taxonomies.forEach(t => console.log(`  - ${t.taxonomy}`));
    console.log('');

    // Query principal para obtener los nombres de los colores
    const query = `
      SELECT 
        pm.meta_value as color_id,
        t.name as color_name,
        t.slug as color_slug,
        COUNT(DISTINCT pm.post_id) as cantidad_peliculas
      FROM wp_postmeta pm
      INNER JOIN wp_posts p ON pm.post_id = p.ID
      LEFT JOIN wp_terms t ON pm.meta_value = t.term_id
      WHERE 
        pm.meta_key = 'color'
        AND p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
      GROUP BY pm.meta_value, t.name, t.slug
      ORDER BY cantidad_peliculas DESC
    `;

    console.log('📊 TIPOS DE COLOR ENCONTRADOS:');
    console.log('================================\n');
    
    const [results] = await connection.execute(query);

    let totalPeliculas = 0;
    const coloresNoEncontrados = [];
    
    results.forEach((row, index) => {
      if (row.color_name) {
        console.log(`${index + 1}. ${row.color_name} (ID: ${row.color_id})`);
        console.log(`   🔗 Slug: ${row.color_slug}`);
        console.log(`   📽️  Películas: ${row.cantidad_peliculas}`);
      } else {
        console.log(`${index + 1}. [Color ID: ${row.color_id} - TÉRMINO NO ENCONTRADO]`);
        console.log(`   📽️  Películas: ${row.cantidad_peliculas}`);
        coloresNoEncontrados.push(row);
      }
      console.log('');
      totalPeliculas += parseInt(row.cantidad_peliculas);
    });

    console.log('================================');
    console.log(`\n📈 RESUMEN:`);
    console.log(`- Total de tipos de color: ${results.length}`);
    console.log(`- Total de películas con color definido: ${totalPeliculas}`);

    // Query adicional para verificar películas sin color
    const querySinColor = `
      SELECT COUNT(DISTINCT p.ID) as sin_color
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'color'
      WHERE 
        p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND (pm.meta_value IS NULL OR pm.meta_value = '')
    `;

    const [sinColor] = await connection.execute(querySinColor);
    console.log(`- Películas sin color definido: ${sinColor[0].sin_color}`);

    // Si hay términos no encontrados, busquemos más información
    if (coloresNoEncontrados.length > 0) {
      console.log('\n⚠️  ADVERTENCIA: Algunos IDs de color no se encontraron en wp_terms');
      console.log('Verificando en wp_term_taxonomy...\n');

      for (const color of coloresNoEncontrados) {
        const checkQuery = `
          SELECT 
            tt.term_id,
            tt.taxonomy,
            tt.term_taxonomy_id,
            t.name
          FROM wp_term_taxonomy tt
          LEFT JOIN wp_terms t ON tt.term_id = t.term_id
          WHERE tt.term_id = ? OR tt.term_taxonomy_id = ?
        `;
        
        const [checkResults] = await connection.execute(checkQuery, [color.color_id, color.color_id]);
        if (checkResults.length > 0) {
          console.log(`ID ${color.color_id}:`);
          checkResults.forEach(r => {
            console.log(`  - Taxonomía: ${r.taxonomy}, Nombre: ${r.name || 'NO ENCONTRADO'}`);
          });
        }
      }
    }

    // Análisis adicional: agrupación por tipo
    console.log('\n🎨 ANÁLISIS DETALLADO POR CATEGORÍAS:');
    console.log('================================\n');

    const colorGroups = {
      'Blanco y Negro': [],
      'Color': [],
      'Mixtos': [],
      'Técnicos': [],
      'Otros': []
    };

    results.forEach(row => {
      if (!row.color_name) return;
      
      const colorLower = row.color_name.toLowerCase();
      if (colorLower.includes('blanco') && colorLower.includes('negro')) {
        colorGroups['Blanco y Negro'].push(row);
      } else if (colorLower === 'color' || colorLower === 'a color') {
        colorGroups['Color'].push(row);
      } else if (colorLower.includes('color') && (colorLower.includes('blanco') || colorLower.includes('negro'))) {
        colorGroups['Mixtos'].push(row);
      } else if (colorLower.includes('color') || colorLower.includes('chrome')) {
        colorGroups['Técnicos'].push(row);
      } else {
        colorGroups['Otros'].push(row);
      }
    });

    // Mostrar agrupaciones
    for (const [grupo, items] of Object.entries(colorGroups)) {
      if (items.length > 0) {
        console.log(`${grupo}:`);
        items.forEach(item => {
          console.log(`  - "${item.color_name}" (${item.cantidad_peliculas} películas)`);
        });
        console.log('');
      }
    }

    // Verificar también la relación con term_taxonomy
    console.log('\n🔗 VERIFICACIÓN DE TAXONOMÍAS:');
    console.log('================================\n');

    const taxonomyCheckQuery = `
      SELECT 
        t.term_id,
        t.name,
        tt.taxonomy,
        COUNT(DISTINCT tr.object_id) as peliculas_relacionadas
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE 
        p.post_type = 'pelicula'
        AND (tt.taxonomy LIKE '%color%' OR t.name LIKE '%color%' OR t.name LIKE '%blanco%' OR t.name LIKE '%negro%')
      GROUP BY t.term_id, t.name, tt.taxonomy
      ORDER BY peliculas_relacionadas DESC
      LIMIT 20
    `;

    const [taxonomyResults] = await connection.execute(taxonomyCheckQuery);
    
    console.log('Términos relacionados con color en las taxonomías:');
    taxonomyResults.forEach(row => {
      console.log(`- ${row.name} (ID: ${row.term_id})`);
      console.log(`  Taxonomía: ${row.taxonomy}`);
      console.log(`  Películas: ${row.peliculas_relacionadas}`);
      console.log('');
    });

    // Exportar a JSON para referencia
    const exportData = {
      fecha_analisis: new Date().toISOString(),
      total_tipos_color: results.length,
      colores: results.map(r => ({
        id: r.color_id,
        nombre: r.color_name || `ID ${r.color_id} - No encontrado`,
        slug: r.color_slug,
        cantidad: r.cantidad_peliculas
      })),
      taxonomias_encontradas: taxonomyResults.map(r => ({
        id: r.term_id,
        nombre: r.name,
        taxonomia: r.taxonomy,
        peliculas: r.peliculas_relacionadas
      }))
    };

    const fs = require('fs').promises;
    await fs.writeFile(
      './color-analysis.json', 
      JSON.stringify(exportData, null, 2)
    );
    console.log('\n✅ Resultados exportados a color-analysis.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeColors();