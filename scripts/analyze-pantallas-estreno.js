const mysql = require('mysql2/promise');

// Función para deserializar arrays PHP
function unserializePhpArray(serialized) {
  try {
    const matches = serialized.match(/s:\d+:"([^"]+)"/g);
    if (matches) {
      return matches.map(match => {
        const value = match.match(/s:\d+:"([^"]+)"/)[1];
        return value;
      });
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function analyzePantallasEstreno() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE PANTALLAS/SALAS DE ESTRENO ===\n');

    // PASO 1: Buscar meta_keys relacionados con pantallas/salas/estrenos
    console.log('=== PASO 1: BÚSQUEDA DE META_KEYS RELACIONADOS ===');
    console.log('Buscando meta_keys que contengan: pantalla, sala, cine, estreno, venue, screen, teatro, plataforma...\n');
    
    const [metaKeysRelacionados] = await connection.execute(`
      SELECT DISTINCT 
        meta_key,
        COUNT(*) as cantidad_registros,
        COUNT(DISTINCT post_id) as peliculas_con_dato
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      AND (
        meta_key LIKE '%pantalla%' OR
        meta_key LIKE '%sala%' OR
        meta_key LIKE '%cine%' OR
        meta_key LIKE '%estreno%' OR
        meta_key LIKE '%venue%' OR
        meta_key LIKE '%screen%' OR
        meta_key LIKE '%teatro%' OR
        meta_key LIKE '%plataforma%' OR
        meta_key LIKE '%distribucion%' OR
        meta_key LIKE '%exhibicion%'
      )
      GROUP BY meta_key
      ORDER BY cantidad_registros DESC
    `);

    if (metaKeysRelacionados.length > 0) {
      console.log('✅ Meta keys encontrados:\n');
      metaKeysRelacionados.forEach((mk, idx) => {
        console.log(`${idx + 1}. meta_key: "${mk.meta_key}"`);
        console.log(`   - Registros: ${mk.cantidad_registros}`);
        console.log(`   - Películas: ${mk.peliculas_con_dato}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron meta_keys con esos términos.\n');
      console.log('Buscando meta_keys más genéricos...\n');
    }

    // PASO 2: Listar TODOS los meta_keys de películas (por si tienen nombre diferente)
    console.log('\n=== PASO 2: TODOS LOS META_KEYS DE PELÍCULAS ===');
    console.log('(Mostrando top 50 ordenados por cantidad de uso)\n');
    
    const [todosMetaKeys] = await connection.execute(`
      SELECT 
        meta_key,
        COUNT(*) as cantidad,
        COUNT(DISTINCT post_id) as peliculas
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      GROUP BY meta_key
      ORDER BY cantidad DESC
      LIMIT 50
    `);

    todosMetaKeys.forEach((mk, idx) => {
      console.log(`${idx + 1}. ${mk.meta_key} (${mk.cantidad} registros, ${mk.peliculas} películas)`);
    });

    // PASO 3: Buscar en taxonomías
    console.log('\n\n=== PASO 3: TAXONOMÍAS RELACIONADAS ===');
    console.log('Buscando taxonomías que puedan contener salas/pantallas...\n');
    
    const [taxonomiasRelacionadas] = await connection.execute(`
      SELECT 
        tt.taxonomy,
        COUNT(*) as cantidad_terminos
      FROM wp_term_taxonomy tt
      WHERE tt.taxonomy LIKE '%sala%'
         OR tt.taxonomy LIKE '%cine%'
         OR tt.taxonomy LIKE '%venue%'
         OR tt.taxonomy LIKE '%screen%'
         OR tt.taxonomy LIKE '%plataforma%'
         OR tt.taxonomy LIKE '%estreno%'
      GROUP BY tt.taxonomy
    `);

    if (taxonomiasRelacionadas.length > 0) {
      console.log('✅ Taxonomías encontradas:\n');
      taxonomiasRelacionadas.forEach(tax => {
        console.log(`- ${tax.taxonomy}: ${tax.cantidad_terminos} términos`);
      });
    } else {
      console.log('❌ No se encontraron taxonomías con esos nombres.\n');
      
      // Mostrar todas las taxonomías disponibles
      console.log('Mostrando TODAS las taxonomías disponibles:\n');
      const [todasTaxonomias] = await connection.execute(`
        SELECT DISTINCT taxonomy, COUNT(*) as count
        FROM wp_term_taxonomy
        GROUP BY taxonomy
        ORDER BY count DESC
      `);
      
      todasTaxonomias.forEach(tax => {
        console.log(`- ${tax.taxonomy}: ${tax.count} términos`);
      });
    }

    // PASO 4: Analizar muestras de los meta_keys encontrados
    if (metaKeysRelacionados.length > 0) {
      console.log('\n\n=== PASO 4: ANÁLISIS DETALLADO DE DATOS ===\n');
      
      for (const metaKey of metaKeysRelacionados.slice(0, 5)) { // Top 5
        console.log(`\n📊 Analizando: "${metaKey.meta_key}"\n`);
        
        const [muestras] = await connection.execute(`
          SELECT 
            p.ID,
            p.post_title,
            pm.meta_value
          FROM wp_posts p
          JOIN wp_postmeta pm ON p.ID = pm.post_id
          WHERE p.post_type = 'pelicula'
          AND pm.meta_key = ?
          AND pm.meta_value != ''
          LIMIT 10
        `, [metaKey.meta_key]);

        console.log(`Mostrando 10 ejemplos:\n`);
        muestras.forEach((muestra, idx) => {
          console.log(`${idx + 1}. Película: ${muestra.post_title}`);
          console.log(`   ID: ${muestra.ID}`);
          
          // Intentar deserializar si parece PHP serializado
          if (muestra.meta_value.startsWith('a:')) {
            const deserialized = unserializePhpArray(muestra.meta_value);
            console.log(`   Valor raw: ${muestra.meta_value.substring(0, 100)}...`);
            console.log(`   Deserializado: [${deserialized.join(', ')}]`);
          } else {
            console.log(`   Valor: ${muestra.meta_value}`);
          }
          console.log('');
        });

        // Analizar estructura del valor
        const [tiposDatos] = await connection.execute(`
          SELECT 
            CASE 
              WHEN meta_value LIKE 'a:%' THEN 'PHP Array Serializado'
              WHEN meta_value REGEXP '^[0-9]+$' THEN 'ID Numérico'
              WHEN meta_value LIKE '%,%' THEN 'Lista separada por comas'
              WHEN meta_value LIKE '%|%' THEN 'Lista separada por pipes'
              ELSE 'Texto simple'
            END as tipo_dato,
            COUNT(*) as cantidad
          FROM wp_postmeta
          WHERE meta_key = ?
          AND meta_value != ''
          GROUP BY tipo_dato
        `, [metaKey.meta_key]);

        console.log('Tipos de datos en este meta_key:');
        tiposDatos.forEach(tipo => {
          console.log(`  - ${tipo.tipo_dato}: ${tipo.cantidad} registros`);
        });
      }
    }

    // PASO 5: Buscar relaciones con wp_terms (si los IDs referencian términos)
    console.log('\n\n=== PASO 5: VERIFICACIÓN DE RELACIONES CON TERMS ===\n');
    
    if (metaKeysRelacionados.length > 0) {
      const primerMetaKey = metaKeysRelacionados[0].meta_key;
      
      const [valoresNumericos] = await connection.execute(`
        SELECT DISTINCT meta_value
        FROM wp_postmeta
        WHERE meta_key = ?
        AND meta_value REGEXP '^[0-9]+$'
        LIMIT 20
      `, [primerMetaKey]);

      if (valoresNumericos.length > 0) {
        const ids = valoresNumericos.map(v => v.meta_value);
        
        console.log(`Verificando si los IDs [${ids.join(', ')}] existen en wp_terms...\n`);
        
        const [termsEncontrados] = await connection.execute(`
          SELECT 
            t.term_id,
            t.name,
            t.slug,
            tt.taxonomy,
            tt.count
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id IN (${ids.join(',')})
        `);

        if (termsEncontrados.length > 0) {
          console.log('✅ IDs encontrados en wp_terms:\n');
          termsEncontrados.forEach(term => {
            console.log(`  ID: ${term.term_id}`);
            console.log(`  Nombre: ${term.name}`);
            console.log(`  Slug: ${term.slug}`);
            console.log(`  Taxonomía: ${term.taxonomy}`);
            console.log(`  Asignaciones: ${term.count}`);
            console.log('');
          });
        } else {
          console.log('❌ Los IDs no corresponden a términos en wp_terms\n');
        }
      }
    }

    // PASO 6: Buscar en wp_term_relationships (relación directa película-término)
    console.log('\n=== PASO 6: RELACIONES PELÍCULA-TAXONOMÍA ===\n');
    console.log('Buscando relaciones directas de películas con taxonomías...\n');
    
    const [relacionesTaxonomia] = await connection.execute(`
      SELECT 
        tt.taxonomy,
        COUNT(DISTINCT tr.object_id) as peliculas_relacionadas,
        COUNT(*) as total_relaciones
      FROM wp_term_relationships tr
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      WHERE tr.object_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      GROUP BY tt.taxonomy
      ORDER BY total_relaciones DESC
    `);

    console.log('Taxonomías vinculadas a películas:\n');
    relacionesTaxonomia.forEach(rel => {
      console.log(`- ${rel.taxonomy}:`);
      console.log(`  Películas: ${rel.peliculas_relacionadas}`);
      console.log(`  Relaciones: ${rel.total_relaciones}`);
      console.log('');
    });

    // PASO 7: Ejemplo de una película con toda su metadata
    console.log('\n=== PASO 7: EJEMPLO COMPLETO DE UNA PELÍCULA ===\n');
    
    const [ejemploPelicula] = await connection.execute(`
      SELECT ID, post_title
      FROM wp_posts
      WHERE post_type = 'pelicula'
      AND post_status = 'publish'
      ORDER BY post_date DESC
      LIMIT 1
    `);

    if (ejemploPelicula.length > 0) {
      const peliculaId = ejemploPelicula[0].ID;
      const peliculaTitulo = ejemploPelicula[0].post_title;
      
      console.log(`Película: "${peliculaTitulo}" (ID: ${peliculaId})\n`);
      
      const [todaMetadata] = await connection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        ORDER BY meta_key
      `, [peliculaId]);

      console.log('Toda la metadata de esta película:\n');
      todaMetadata.forEach(meta => {
        const valorMostrar = meta.meta_value.length > 100 
          ? meta.meta_value.substring(0, 100) + '...'
          : meta.meta_value;
        console.log(`  ${meta.meta_key}: ${valorMostrar}`);
      });
    }

    // RESUMEN FINAL
    console.log('\n\n=== 📋 RESUMEN Y CONCLUSIONES ===\n');
    
    if (metaKeysRelacionados.length > 0) {
      console.log('✅ HALLAZGOS PRINCIPALES:\n');
      console.log(`1. Se encontraron ${metaKeysRelacionados.length} meta_keys relacionados con pantallas/salas`);
      console.log(`2. El meta_key más usado es: "${metaKeysRelacionados[0].meta_key}"`);
      console.log(`3. Afecta a ${metaKeysRelacionados[0].peliculas_con_dato} películas`);
    } else {
      console.log('⚠️  NO SE ENCONTRARON meta_keys directamente relacionados\n');
      console.log('Posibles explicaciones:');
      console.log('1. La información podría estar en una taxonomía custom');
      console.log('2. Podría usar un nombre de campo diferente al esperado');
      console.log('3. La información podría no estar en la base de datos de WordPress');
      console.log('4. Podría estar en una tabla custom (no en wp_postmeta)');
    }

    console.log('\n🔍 PRÓXIMOS PASOS SUGERIDOS:\n');
    console.log('1. Revisar el listado completo de meta_keys (PASO 2)');
    console.log('2. Verificar las taxonomías disponibles (PASO 3)');
    console.log('3. Analizar el ejemplo completo de película (PASO 7)');
    console.log('4. Buscar en el código PHP de WordPress el campo relacionado');
    console.log('5. Consultar con quien conoce el sitio original sobre cómo se ingresaban las salas');

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
analyzePantallasEstreno()
  .then(() => console.log('\n✅ Análisis completado'))
  .catch(console.error);