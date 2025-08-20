// scripts/analyze-wp-crew-fields.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function analyzeCrewFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🔍 Analizando campos de crew en WordPress...\n');

    // 1. Analizar los campos principales de ficha técnica
    const crewFields = [
      'ficha_tecnica_guion',
      'ficha_tecnica_fotografia',
      'ficha_tecnica_montaje',
      'ficha_tecnica_produccion',
      'ficha_tecnica_direccion',
      'ficha_tecnica_musica',
      'ficha_tecnica_sonido',
      'ficha_tecnica_arte',
      'ficha_tecnica_vestuario',
      'ficha_tecnica_maquillaje',
      'ficha_tecnica_efectos',
      'ficha_tecnica_camara',
      'ficha_tecnica_asistente_direccion'
    ];

    console.log('📊 Conteo de campos de ficha técnica:\n');
    
    for (const field of crewFields) {
      const [count] = await connection.execute(`
        SELECT 
          COUNT(DISTINCT post_id) as movies_count,
          COUNT(*) as total_records
        FROM wp_postmeta
        WHERE meta_key = ?
        AND meta_value != ''
        AND meta_value != '0'
        AND meta_value IS NOT NULL
      `, [field]);

      if (count[0].movies_count > 0) {
        console.log(`${field}: ${count[0].movies_count} películas`);
      }
    }

    // 2. Analizar estructura de un campo repeater específico
    console.log('\n📋 Analizando estructura del campo guion:\n');
    
    // Buscar una película con datos de guion
    const [movieWithGuion] = await connection.execute(`
      SELECT post_id 
      FROM wp_postmeta 
      WHERE meta_key = 'ficha_tecnica_guion' 
      AND meta_value > '0'
      LIMIT 1
    `);

    if (movieWithGuion.length > 0) {
      const movieId = movieWithGuion[0].post_id;
      
      // Obtener título de la película
      const [movieTitle] = await connection.execute(`
        SELECT post_title FROM wp_posts WHERE ID = ?
      `, [movieId]);
      
      console.log(`Ejemplo con película: ${movieTitle[0].post_title} (ID: ${movieId})\n`);

      // Obtener todos los campos relacionados con guion para esta película
      const [guionData] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        AND meta_key LIKE 'ficha_tecnica_guion%'
        ORDER BY meta_key
        LIMIT 20
      `, [movieId]);

      console.log('Campos encontrados:');
      for (const row of guionData) {
        // Solo mostrar los primeros 100 caracteres del valor
        const value = row.meta_value ? row.meta_value.substring(0, 100) : 'null';
        console.log(`  ${row.meta_key}: ${value}`);
      }
    }

    // 3. Analizar patrones de los subcampos
    console.log('\n🔍 Analizando subcampos de ficha técnica:\n');
    
    const [subfields] = await connection.execute(`
      SELECT 
        CASE 
          WHEN meta_key LIKE '%_persona' THEN 'persona'
          WHEN meta_key LIKE '%_rol' THEN 'rol'
          WHEN meta_key LIKE '%_acreditado_con_su' THEN 'acreditado_con_su'
          WHEN meta_key LIKE '%_comentario' THEN 'comentario'
          WHEN meta_key LIKE '%_import' THEN 'import'
          ELSE 'otro'
        END as field_type,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key LIKE 'ficha_tecnica_%'
      GROUP BY field_type
      ORDER BY count DESC
    `);

    console.table(subfields);

    // 4. Obtener ejemplo completo de cada tipo de crew
    console.log('\n📝 Ejemplos de cada tipo de crew:\n');
    
    const mainCrewTypes = [
      { field: 'ficha_tecnica_guion', role: 'Guion' },
      { field: 'ficha_tecnica_fotografia', role: 'Fotografía' },
      { field: 'ficha_tecnica_montaje', role: 'Montaje' },
      { field: 'ficha_tecnica_produccion', role: 'Producción' },
      { field: 'ficha_tecnica_direccion', role: 'Dirección' }
    ];

    for (const crewType of mainCrewTypes) {
      // Buscar película con este tipo de crew
      const [movie] = await connection.execute(`
        SELECT post_id, meta_value as crew_count
        FROM wp_postmeta
        WHERE meta_key = ?
        AND meta_value > '0'
        LIMIT 1
      `, [crewType.field]);

      if (movie.length > 0) {
        const movieId = movie[0].post_id;
        const crewCount = parseInt(movie[0].crew_count);
        
        console.log(`\n${crewType.role}: ${crewCount} personas`);
        
        // Obtener el primer miembro del crew
        if (crewCount > 0) {
          const [firstCrew] = await connection.execute(`
            SELECT 
              (SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?) as persona_id,
              (SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?) as rol,
              (SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?) as acreditado,
              (SELECT post_title FROM wp_posts WHERE ID = (
                SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?
              )) as persona_nombre
          `, [
            movieId, `${crewType.field}_0_persona`,
            movieId, `${crewType.field}_0_rol`,
            movieId, `${crewType.field}_0_acreditado_con_su`,
            movieId, `${crewType.field}_0_persona`
          ]);

          if (firstCrew[0].persona_id) {
            console.log(`  Primera persona:`);
            console.log(`    ID: ${firstCrew[0].persona_id}`);
            console.log(`    Nombre: ${firstCrew[0].persona_nombre || 'No encontrado'}`);
            console.log(`    Rol: ${firstCrew[0].rol || 'Sin especificar'}`);
            console.log(`    Acreditado: ${firstCrew[0].acreditado || 'No'}`);
          }
        }
      }
    }

    // 5. Verificar campo 'sonido' que aparece separado
    console.log('\n🔊 Analizando campo sonido:\n');
    
    const [sonidoExample] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE pm.meta_key = 'sonido'
      AND pm.meta_value != ''
      AND pm.meta_value IS NOT NULL
      LIMIT 3
    `);

    if (sonidoExample.length > 0) {
      console.log('Ejemplos del campo sonido:');
      for (const row of sonidoExample) {
        console.log(`  Película: ${row.post_title}`);
        console.log(`  Valor: ${row.meta_value}\n`);
      }
    }

    // 6. Estadísticas finales
    console.log('\n📈 Estadísticas generales:\n');
    
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT post_id) as total_movies_with_crew
      FROM wp_postmeta
      WHERE (
        meta_key LIKE 'ficha_tecnica_%'
        OR meta_key = 'sonido'
      )
      AND meta_value != ''
      AND meta_value != '0'
    `);

    console.log(`Total de películas con datos de crew: ${stats[0].total_movies_with_crew}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

analyzeCrewFields();