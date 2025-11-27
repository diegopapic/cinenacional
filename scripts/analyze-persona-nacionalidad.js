const mysql = require('mysql2/promise');

async function analyzePersonaNacionalidad() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración local
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE NACIONALIDAD DE PERSONAS EN WORDPRESS ===\n');

    // PASO 1: Contar cuántas personas existen
    console.log('=== PASO 1: CANTIDAD DE PERSONAS ===');
    const [totalPersonas] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM wp_posts
      WHERE post_type = 'persona'
      AND post_status = 'publish'
    `);
    
    console.log(`Total de personas publicadas: ${totalPersonas[0].total}\n`);

    // PASO 2: Obtener todas las meta_keys asociadas a personas
    console.log('=== PASO 2: META KEYS DISPONIBLES PARA PERSONAS ===');
    const [metaKeys] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta
      WHERE post_id IN (
        SELECT ID FROM wp_posts WHERE post_type = 'persona'
      )
      ORDER BY count DESC
    `);

    console.log(`Total de meta_keys únicos: ${metaKeys.length}\n`);
    metaKeys.forEach((key, idx) => {
      console.log(`${idx + 1}. "${key.meta_key}": ${key.count} registros`);
    });

    // PASO 3: Buscar específicamente meta_keys relacionadas con nacionalidad
    console.log('\n\n=== PASO 3: META KEYS RELACIONADAS CON NACIONALIDAD ===');
    const [nacionalidadKeys] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta
      WHERE post_id IN (
        SELECT ID FROM wp_posts WHERE post_type = 'persona'
      )
      AND (
        meta_key LIKE '%nacion%'
        OR meta_key LIKE '%pais%'
        OR meta_key LIKE '%country%'
        OR meta_key LIKE '%origen%'
      )
      ORDER BY count DESC
    `);

    if (nacionalidadKeys.length > 0) {
      console.log('Meta keys de nacionalidad encontrados:\n');
      nacionalidadKeys.forEach(key => {
        console.log(`- "${key.meta_key}": ${key.count} registros`);
      });
    } else {
      console.log('No se encontraron meta_keys específicamente para nacionalidad.\n');
    }

    // PASO 4: Obtener muestra de personas con sus meta datos
    console.log('\n\n=== PASO 4: MUESTRA DE PERSONAS Y SUS META DATOS ===');
    const [samplePersonas] = await connection.execute(`
      SELECT ID, post_title
      FROM wp_posts
      WHERE post_type = 'persona'
      AND post_status = 'publish'
      LIMIT 5
    `);

    for (const persona of samplePersonas) {
      console.log(`\nPersona ID ${persona.ID}: "${persona.post_title}"`);
      console.log('─'.repeat(80));

      const [personaMeta] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        ORDER BY meta_key
      `, [persona.ID]);

      if (personaMeta.length > 0) {
        personaMeta.forEach(meta => {
          const value = meta.meta_value.length > 80 
            ? meta.meta_value.substring(0, 80) + '...' 
            : meta.meta_value;
          console.log(`  ${meta.meta_key}: ${value}`);
        });
      } else {
        console.log('  (Sin meta datos)');
      }
    }

    // PASO 5: Buscar taxonomías asociadas a personas
    console.log('\n\n=== PASO 5: TAXONOMÍAS ASIGNADAS A PERSONAS ===');
    const [personTaxonomies] = await connection.execute(`
      SELECT DISTINCT tt.taxonomy, COUNT(*) as count
      FROM wp_term_relationships tr
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      WHERE tr.object_id IN (
        SELECT ID FROM wp_posts WHERE post_type = 'persona'
      )
      GROUP BY tt.taxonomy
      ORDER BY count DESC
    `);

    console.log(`Total de taxonomías asignadas a personas: ${personTaxonomies.length}\n`);
    personTaxonomies.forEach(tax => {
      console.log(`- ${tax.taxonomy}: ${tax.count} asignaciones`);
    });

    // PASO 6: Si existe la taxonomía 'nacionalidad' o similar, analizar
    console.log('\n\n=== PASO 6: ANÁLISIS PROFUNDO DE TAXONOMÍAS DE NACIONALIDAD ===');
    const [nacionalidadTaxonomies] = await connection.execute(`
      SELECT DISTINCT taxonomy
      FROM wp_term_taxonomy
      WHERE taxonomy LIKE '%nacion%'
      OR taxonomy LIKE '%pais%'
      OR taxonomy = 'pais'
    `);

    if (nacionalidadTaxonomies.length > 0) {
      for (const tax of nacionalidadTaxonomies) {
        console.log(`\nTaxonomía: ${tax.taxonomy}`);
        console.log('─'.repeat(80));

        const [terminos] = await connection.execute(`
          SELECT t.term_id, t.name, t.slug, tt.count
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE tt.taxonomy = ?
          ORDER BY tt.count DESC
          LIMIT 10
        `, [tax.taxonomy]);

        if (terminos.length > 0) {
          console.log(`Términos en "${tax.taxonomy}":`);
          terminos.forEach(termino => {
            console.log(`  - ID: ${termino.term_id}, Nombre: "${termino.name}", Slug: "${termino.slug}", Asignaciones: ${termino.count}`);
          });
        }

        // Muestra de personas con esta taxonomía
        const [personasConTax] = await connection.execute(`
          SELECT DISTINCT p.ID, p.post_title, GROUP_CONCAT(t.name SEPARATOR ', ') as valores
          FROM wp_posts p
          JOIN wp_term_relationships tr ON p.ID = tr.object_id
          JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
          JOIN wp_terms t ON tt.term_id = t.term_id
          WHERE p.post_type = 'persona'
          AND tt.taxonomy = ?
          LIMIT 5
        `, [tax.taxonomy]);

        if (personasConTax.length > 0) {
          console.log(`\nMuestra de personas con taxonomía "${tax.taxonomy}":`);
          personasConTax.forEach(persona => {
            console.log(`  - ${persona.post_title}: ${persona.valores}`);
          });
        }
      }
    } else {
      console.log('No se encontraron taxonomías específicas de nacionalidad.\n');
    }

    // PASO 7: Analizar meta_value en detalle si existen meta_keys de nacionalidad
    if (nacionalidadKeys.length > 0) {
      console.log('\n\n=== PASO 7: ANÁLISIS DE FORMATOS DE NACIONALIDAD ===');
      
      for (const keyObj of nacionalidadKeys) {
        const [samples] = await connection.execute(`
          SELECT DISTINCT meta_value
          FROM wp_postmeta
          WHERE post_id IN (
            SELECT ID FROM wp_posts WHERE post_type = 'persona'
          )
          AND meta_key = ?
          AND meta_value != ''
          LIMIT 10
        `, [keyObj.meta_key]);

        if (samples.length > 0) {
          console.log(`\nMeta key: "${keyObj.meta_key}"`);
          console.log('─'.repeat(80));

          let serializedCount = 0;
          let jsonCount = 0;
          let plainTextCount = 0;
          let numericCount = 0;

          samples.forEach((sample, idx) => {
            const value = sample.meta_value;
            
            // Detectar formato
            let format = 'desconocido';
            if (value.startsWith('a:') && value.includes(':{')) {
              format = 'PHP Serializado';
              serializedCount++;
            } else if ((value.startsWith('[') && value.endsWith(']')) || 
                      (value.startsWith('{') && value.endsWith('}'))) {
              try {
                JSON.parse(value);
                format = 'JSON';
                jsonCount++;
              } catch {
                format = 'Texto plano';
                plainTextCount++;
              }
            } else if (!isNaN(value) && value.trim() !== '') {
              format = 'Numérico';
              numericCount++;
            } else {
              format = 'Texto plano';
              plainTextCount++;
            }

            console.log(`\n${idx + 1}. Formato: ${format}`);
            const displayValue = value.length > 100 
              ? value.substring(0, 100) + '...' 
              : value;
            console.log(`   Valor: ${displayValue}`);

            // Si es serializado, intentar extraer valores
            if (format === 'PHP Serializado') {
              try {
                const matches = value.match(/s:\d+:"([^"]+)"/g);
                if (matches) {
                  console.log('   Valores extraídos:');
                  matches.forEach(match => {
                    const extracted = match.match(/s:\d+:"([^"]+)"/)[1];
                    console.log(`     - ${extracted}`);
                  });
                }
              } catch (e) {
                console.log('   Error al extraer valores serializados');
              }
            }
          });

          console.log(`\nResumen para "${keyObj.meta_key}":`);
          console.log(`  - PHP Serializado: ${serializedCount}`);
          console.log(`  - JSON: ${jsonCount}`);
          console.log(`  - Numérico: ${numericCount}`);
          console.log(`  - Texto plano: ${plainTextCount}`);
        }
      }
    }

    // PASO 8: Verificar relación entre personas y películas
    console.log('\n\n=== PASO 8: RELACIÓN PERSONAS-PELÍCULAS ===');
    const [personMovieRelation] = await connection.execute(`
      SELECT 
        'via_postmeta' as tipo,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'persona')
      AND (
        meta_key LIKE '%movie%'
        OR meta_key LIKE '%pelicula%'
        OR meta_key LIKE '%film%'
      )
      UNION ALL
      SELECT 
        'via_taxonomy_relationships' as tipo,
        COUNT(*) as count
      FROM wp_term_relationships tr
      WHERE tr.object_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      AND tr.term_taxonomy_id IN (
        SELECT tt.term_taxonomy_id 
        FROM wp_term_taxonomy tt 
        JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE tt.taxonomy IN (
          SELECT DISTINCT taxonomy 
          FROM wp_term_taxonomy 
          WHERE term_id IN (
            SELECT meta_value FROM wp_postmeta 
            WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'persona')
          )
        )
      )
    `);

    console.log('Posibles formas de relación personas-películas encontradas:');
    personMovieRelation.forEach(rel => {
      console.log(`- ${rel.tipo}: ${rel.count}`);
    });

    // PASO 9: Resumen final
    console.log('\n\n=== RESUMEN DEL ANÁLISIS ===');
    console.log('Total de personas encontradas:', totalPersonas[0].total);
    console.log('Total de meta_keys únicos:', metaKeys.length);
    console.log('Meta_keys de nacionalidad encontrados:', nacionalidadKeys.length);
    console.log('Taxonomías con nacionalidad:', nacionalidadTaxonomies.length);
    
    console.log('\n📝 RECOMENDACIONES PARA LA MIGRACIÓN:');
    if (nacionalidadKeys.length > 0) {
      console.log('1. Crear tabla "person_nationalities" en PostgreSQL');
      console.log('2. Migrar datos desde meta_keys a la nueva tabla');
      console.log('3. Manejar valores serializados durante la migración');
    }
    if (nacionalidadTaxonomies.length > 0) {
      console.log('1. Migrar términos de nacionalidad a la tabla "countries"');
      console.log('2. Crear relación person_nationalities con referencia a countries');
    }
    if (nacionalidadKeys.length === 0 && nacionalidadTaxonomies.length === 0) {
      console.log('⚠️  No se encontró información de nacionalidad en la base de datos WordPress');
    }

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
analyzePersonaNacionalidad()
  .then(() => console.log('\n✅ Análisis completado'))
  .catch(console.error);