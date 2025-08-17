/**
 * Script para analizar y extraer personas (directores, actores, etc.) 
 * de la base de datos WordPress de cine argentino
 * 
 * Ubicación: /scripts/analyze-wp-people.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root', // Ajustar según tu configuración
  password: '', // Ajustar según tu configuración
  database: 'wordpress_cine',
  port: 3306
};

async function analyzeWordPressPeople() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');
    
    // 1. Analizar la estructura de taxonomías
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. ANÁLISIS DE TAXONOMÍAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [taxonomies] = await connection.execute(`
      SELECT 
        taxonomy,
        COUNT(*) as total
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY total DESC
    `);
    
    console.log('Taxonomías encontradas:');
    taxonomies.forEach(tax => {
      console.log(`  - ${tax.taxonomy}: ${tax.total} términos`);
    });
    
    // 2. Analizar campos de intérpretes
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('2. EXTRACCIÓN DE INTÉRPRETES/ACTORES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Buscar todos los campos de intérpretes que contienen nombres
    const interpreteFields = [];
    for (let i = 0; i <= 50; i++) {
      interpreteFields.push(`interpretes_${i}_interprete`);
      interpreteFields.push(`interpretes_import_${i}_interprete`);
    }
    
    const allPeople = new Map(); // Usar Map para evitar duplicados
    
    // Extraer intérpretes
    for (const field of interpreteFields) {
      const [results] = await connection.execute(`
        SELECT 
          pm.meta_value as person_name,
          COUNT(DISTINCT pm.post_id) as movie_count
        FROM wp_postmeta pm
        INNER JOIN wp_posts p ON pm.post_id = p.ID
        WHERE pm.meta_key = ?
        AND p.post_type = 'pelicula'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND pm.meta_value NOT LIKE 'field_%'
        GROUP BY pm.meta_value
      `, [field]);
      
      if (results.length > 0) {
        console.log(`Encontrados ${results.length} intérpretes en campo "${field}"`);
        results.forEach(r => {
          if (r.person_name && !r.person_name.startsWith('field_')) {
            const existing = allPeople.get(r.person_name) || { 
              name: r.person_name, 
              roles: new Set(['actor']), 
              movie_count: 0 
            };
            existing.movie_count += r.movie_count;
            allPeople.set(r.person_name, existing);
          }
        });
      }
    }
    
    console.log(`\nTotal de intérpretes únicos encontrados: ${allPeople.size}`);
    
    // 3. Analizar campos de ficha técnica (directores, guionistas, etc.)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('3. EXTRACCIÓN DE FICHA TÉCNICA (DIRECTORES, GUIONISTAS, ETC)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const techFields = [
      { prefix: 'ficha_tecnica_guion', role: 'guionista' },
      { prefix: 'ficha_tecnica_musica', role: 'músico' },
      { prefix: 'ficha_tecnica_montaje', role: 'montajista' },
      { prefix: 'ficha_tecnica_direccion', role: 'director' },
      { prefix: 'ficha_tecnica_produccion', role: 'productor' },
      { prefix: 'ficha_tecnica_fotografia', role: 'director de fotografía' }
    ];
    
    for (const techField of techFields) {
      const fields = [];
      for (let i = 0; i <= 10; i++) {
        fields.push(`${techField.prefix}_${i}_persona`);
        fields.push(`${techField.prefix}_import_${i}_persona`);
      }
      // También buscar sin número
      fields.push(`${techField.prefix}_persona`);
      
      for (const field of fields) {
        const [results] = await connection.execute(`
          SELECT 
            pm.meta_value as person_name,
            COUNT(DISTINCT pm.post_id) as movie_count
          FROM wp_postmeta pm
          INNER JOIN wp_posts p ON pm.post_id = p.ID
          WHERE pm.meta_key = ?
          AND p.post_type = 'pelicula'
          AND pm.meta_value IS NOT NULL
          AND pm.meta_value != ''
          AND pm.meta_value NOT LIKE 'field_%'
          GROUP BY pm.meta_value
        `, [field]);
        
        if (results.length > 0) {
          console.log(`Encontrados ${results.length} ${techField.role}s en campo "${field}"`);
          results.forEach(r => {
            if (r.person_name && !r.person_name.startsWith('field_')) {
              const existing = allPeople.get(r.person_name) || { 
                name: r.person_name, 
                roles: new Set(), 
                movie_count: 0 
              };
              existing.roles.add(techField.role);
              existing.movie_count = Math.max(existing.movie_count, r.movie_count);
              allPeople.set(r.person_name, existing);
            }
          });
        }
      }
    }
    
    // 4. Buscar director en campo específico si existe
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('4. BÚSQUEDA DE CAMPOS ADICIONALES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const additionalFields = ['director', 'directores', 'realizador', 'actores', 'elenco'];
    
    for (const field of additionalFields) {
      const [results] = await connection.execute(`
        SELECT 
          pm.meta_value as person_names,
          COUNT(DISTINCT pm.post_id) as movie_count
        FROM wp_postmeta pm
        INNER JOIN wp_posts p ON pm.post_id = p.ID
        WHERE pm.meta_key = ?
        AND p.post_type = 'pelicula'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND pm.meta_value NOT LIKE 'field_%'
        GROUP BY pm.meta_value
        LIMIT 10
      `, [field]);
      
      if (results.length > 0) {
        console.log(`Campo "${field}" encontrado con ${results.length} valores`);
        results.forEach(r => {
          console.log(`  - ${r.person_names.substring(0, 100)}... (${r.movie_count} películas)`);
        });
      }
    }
    
    // 5. Convertir Map a Array y ordenar
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('5. RESUMEN DE PERSONAS ENCONTRADAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const peopleArray = Array.from(allPeople.values()).map(p => ({
      name: p.name,
      roles: Array.from(p.roles),
      movie_count: p.movie_count,
      slug: p.name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }));
    
    // Ordenar por cantidad de películas
    peopleArray.sort((a, b) => b.movie_count - a.movie_count);
    
    console.log(`Total de personas únicas encontradas: ${peopleArray.length}`);
    console.log('\nTop 30 personas con más películas:');
    console.log('─────────────────────────────────────────');
    
    peopleArray.slice(0, 30).forEach((person, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${person.name}`);
      console.log(`     Roles: ${person.roles.join(', ')}`);
      console.log(`     Películas: ${person.movie_count}`);
      console.log('');
    });
    
    // 6. Estadísticas por rol
    console.log('═══════════════════════════════════════════════════════════');
    console.log('6. ESTADÍSTICAS POR ROL');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const roleStats = {};
    peopleArray.forEach(person => {
      person.roles.forEach(role => {
        roleStats[role] = (roleStats[role] || 0) + 1;
      });
    });
    
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count} personas`);
    });
    
    // 7. Guardar resultado en JSON para migración
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('7. EXPORTACIÓN DE DATOS');
    console.log('═══════════════════════════════════════════════════════════');
    
    const outputPath = './scripts/wp-people-export.json';
    
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total_people: peopleArray.length,
        source: 'WordPress meta fields',
        stats: roleStats,
        people: peopleArray
      }, null, 2)
    );
    
    console.log(`\n✅ Datos exportados a: ${outputPath}`);
    console.log(`   Total de personas exportadas: ${peopleArray.length}`);
    
    // 8. Mostrar algunos ejemplos de películas con sus personas
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('8. EJEMPLO DE PELÍCULAS CON SUS PERSONAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [sampleMovies] = await connection.execute(`
      SELECT ID, post_title
      FROM wp_posts 
      WHERE post_type = 'pelicula'
      ORDER BY ID DESC
      LIMIT 3
    `);
    
    for (const movie of sampleMovies) {
      console.log(`\nPelícula: "${movie.post_title}" (ID: ${movie.ID})`);
      console.log('─────────────────────────────────────────');
      
      // Buscar intérpretes de esta película
      const [interpretes] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        AND meta_key LIKE '%interprete%'
        AND meta_key NOT LIKE '_%'
        AND meta_value NOT LIKE 'field_%'
        AND meta_value != ''
        ORDER BY meta_key
      `, [movie.ID]);
      
      if (interpretes.length > 0) {
        console.log('Intérpretes:');
        interpretes.forEach(i => {
          console.log(`  - ${i.meta_value}`);
        });
      }
      
      // Buscar ficha técnica
      const [fichaTecnica] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        AND meta_key LIKE 'ficha_tecnica_%_persona'
        AND meta_key NOT LIKE '_%'
        AND meta_value NOT LIKE 'field_%'
        AND meta_value != ''
        ORDER BY meta_key
      `, [movie.ID]);
      
      if (fichaTecnica.length > 0) {
        console.log('Ficha técnica:');
        fichaTecnica.forEach(f => {
          const role = f.meta_key.match(/ficha_tecnica_(\w+)_/)?.[1] || 'otro';
          console.log(`  - ${f.meta_value} (${role})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Verifica las credenciales de la base de datos en dbConfig');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Asegúrate de que MySQL esté ejecutándose en localhost');
    }
    console.error('\nStack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar el análisis
console.log('🎬 ANÁLISIS DE PERSONAS EN WORDPRESS - CINE ARGENTINO');
console.log('═══════════════════════════════════════════════════════════\n');
analyzeWordPressPeople();