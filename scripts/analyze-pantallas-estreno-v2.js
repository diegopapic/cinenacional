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

async function analyzePantallasEstrenoV2() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DETALLADO DE "pantalla_de_estreno" ===\n');

    // PASO 1: Estadísticas básicas
    console.log('=== PASO 1: ESTADÍSTICAS BÁSICAS ===');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT post_id) as peliculas_con_pantalla,
        COUNT(DISTINCT meta_value) as valores_unicos
      FROM wp_postmeta
      WHERE meta_key = 'pantalla_de_estreno'
      AND meta_value != ''
    `);

    console.log(`Total de registros: ${stats[0].total_registros}`);
    console.log(`Películas con pantalla: ${stats[0].peliculas_con_pantalla}`);
    console.log(`Valores únicos: ${stats[0].valores_unicos}\n`);

    // PASO 2: Analizar estructura de los valores
    console.log('=== PASO 2: ANÁLISIS DE ESTRUCTURA ===\n');
    
    const [tiposDatos] = await connection.execute(`
      SELECT 
        CASE 
          WHEN meta_value LIKE 'a:%' THEN 'PHP Array Serializado'
          WHEN meta_value REGEXP '^[0-9]+$' THEN 'ID Numérico'
          WHEN meta_value LIKE '%,%' THEN 'Lista separada por comas'
          WHEN meta_value LIKE '%|%' THEN 'Lista separada por pipes'
          ELSE 'Texto/Otro'
        END as tipo_dato,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM wp_postmeta WHERE meta_key = 'pantalla_de_estreno' AND meta_value != ''), 2) as porcentaje
      FROM wp_postmeta
      WHERE meta_key = 'pantalla_de_estreno'
      AND meta_value != ''
      GROUP BY tipo_dato
      ORDER BY cantidad DESC
    `);

    console.log('Tipos de datos encontrados:\n');
    tiposDatos.forEach(tipo => {
      console.log(`- ${tipo.tipo_dato}: ${tipo.cantidad} registros (${tipo.porcentaje}%)`);
    });

    // PASO 3: Mostrar ejemplos reales
    console.log('\n\n=== PASO 3: EJEMPLOS REALES (20 MUESTRAS) ===\n');
    
    const [ejemplos] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_value
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
      AND pm.meta_key = 'pantalla_de_estreno'
      AND pm.meta_value != ''
      ORDER BY p.post_date DESC
      LIMIT 20
    `);

    ejemplos.forEach((ej, idx) => {
      console.log(`${idx + 1}. "${ej.post_title}" (ID: ${ej.ID})`);
      
      if (ej.meta_value.startsWith('a:')) {
        // Array PHP serializado
        const deserialized = unserializePhpArray(ej.meta_value);
        console.log(`   Raw: ${ej.meta_value.substring(0, 80)}...`);
        console.log(`   Deserializado: [${deserialized.join(', ')}]`);
      } else {
        console.log(`   Valor: ${ej.meta_value}`);
      }
      console.log('');
    });

    // PASO 4: Si hay IDs, verificar en wp_terms
    console.log('\n=== PASO 4: VERIFICACIÓN DE IDs EN wp_terms ===\n');
    
    const [valoresNumericos] = await connection.execute(`
      SELECT DISTINCT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'pantalla_de_estreno'
      AND meta_value REGEXP '^[0-9]+$'
      LIMIT 30
    `);

    if (valoresNumericos.length > 0) {
      const ids = valoresNumericos.map(v => v.meta_value);
      console.log(`Encontrados ${ids.length} valores numéricos distintos: [${ids.join(', ')}]\n`);
      
      console.log('Buscando en wp_terms...\n');
      
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
        ORDER BY t.name
      `);

      if (termsEncontrados.length > 0) {
        console.log(`✅ Se encontraron ${termsEncontrados.length} términos:\n`);
        termsEncontrados.forEach(term => {
          console.log(`  ID: ${term.term_id}`);
          console.log(`  Nombre: ${term.name}`);
          console.log(`  Slug: ${term.slug}`);
          console.log(`  Taxonomía: ${term.taxonomy}`);
          console.log(`  Uso: ${term.count} películas`);
          console.log('');
        });
      } else {
        console.log('❌ Los IDs no corresponden a términos en wp_terms\n');
      }
    } else {
      console.log('No se encontraron valores numéricos simples.\n');
    }

    // PASO 5: Si hay arrays PHP, extraer todos los IDs únicos
    console.log('\n=== PASO 5: ANÁLISIS DE ARRAYS PHP SERIALIZADOS ===\n');
    
    const [arraysSerialized] = await connection.execute(`
      SELECT DISTINCT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'pantalla_de_estreno'
      AND meta_value LIKE 'a:%'
      LIMIT 100
    `);

    if (arraysSerialized.length > 0) {
      console.log(`Encontrados ${arraysSerialized.length} arrays PHP distintos.\n`);
      console.log('Extrayendo todos los IDs únicos...\n');
      
      const idsSet = new Set();
      
      arraysSerialized.forEach(row => {
        const ids = unserializePhpArray(row.meta_value);
        ids.forEach(id => idsSet.add(id));
      });

      const uniqueIds = Array.from(idsSet);
      console.log(`Total de IDs únicos encontrados: ${uniqueIds.length}`);
      console.log(`IDs: [${uniqueIds.slice(0, 20).join(', ')}${uniqueIds.length > 20 ? '...' : ''}]\n`);

      if (uniqueIds.length > 0 && uniqueIds.every(id => /^\d+$/.test(id))) {
        console.log('Buscando estos IDs en wp_terms...\n');
        
        const [termsArray] = await connection.execute(`
          SELECT 
            t.term_id,
            t.name,
            t.slug,
            tt.taxonomy,
            tt.count
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id IN (${uniqueIds.join(',')})
          ORDER BY tt.count DESC
        `);

        if (termsArray.length > 0) {
          console.log(`✅ Se encontraron ${termsArray.length} términos:\n`);
          termsArray.forEach(term => {
            console.log(`  ID: ${term.term_id} | ${term.name} | Taxonomía: ${term.taxonomy} | Uso: ${term.count}`);
          });
        } else {
          console.log('❌ Los IDs no corresponden a términos en wp_terms\n');
        }
      }
    } else {
      console.log('No se encontraron arrays PHP serializados.\n');
    }

    // PASO 6: Análisis de taxonomía específica (si existe)
    console.log('\n\n=== PASO 6: BÚSQUEDA DE TAXONOMÍA DE SALAS/PANTALLAS ===\n');
    
    const [taxonomiasSalas] = await connection.execute(`
      SELECT 
        tt.taxonomy,
        COUNT(*) as cantidad_terminos,
        COUNT(DISTINCT tr.object_id) as peliculas_vinculadas
      FROM wp_term_taxonomy tt
      LEFT JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      WHERE tt.taxonomy LIKE '%sala%'
         OR tt.taxonomy LIKE '%pantalla%'
         OR tt.taxonomy LIKE '%venue%'
         OR tt.taxonomy LIKE '%cine%'
         OR tt.taxonomy LIKE '%screen%'
      GROUP BY tt.taxonomy
    `);

    if (taxonomiasSalas.length > 0) {
      console.log('✅ Taxonomías encontradas:\n');
      taxonomiasSalas.forEach(tax => {
        console.log(`- ${tax.taxonomy}:`);
        console.log(`  Términos: ${tax.cantidad_terminos}`);
        console.log(`  Películas: ${tax.peliculas_vinculadas || 0}`);
        console.log('');
      });

      // Mostrar términos de la primera taxonomía
      const primera税onomia = taxonomiasSalas[0].taxonomy;
      console.log(`\nTérminos de la taxonomía "${primera税onomia}":\n`);
      
      const [terminosSala] = await connection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.count
        FROM wp_terms t
        JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        WHERE tt.taxonomy = ?
        ORDER BY tt.count DESC
        LIMIT 30
      `, [primera税onomia]);

      terminosSala.forEach(term => {
        console.log(`  ${term.term_id}. ${term.name} (${term.slug}) - ${term.count} películas`);
      });
    } else {
      console.log('❌ No se encontraron taxonomías específicas para salas/pantallas.\n');
    }

    // PASO 7: Película de ejemplo completa
    console.log('\n\n=== PASO 7: EJEMPLO COMPLETO DE UNA PELÍCULA ===\n');
    
    const [peliculaEjemplo] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_value as pantalla_valor
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
      AND pm.meta_key = 'pantalla_de_estreno'
      AND pm.meta_value != ''
      ORDER BY p.post_date DESC
      LIMIT 1
    `);

    if (peliculaEjemplo.length > 0) {
      const peli = peliculaEjemplo[0];
      console.log(`Película: "${peli.post_title}" (ID: ${peli.ID})\n`);
      console.log(`Valor de pantalla_de_estreno: ${peli.pantalla_valor}\n`);
      
      if (peli.pantalla_valor.startsWith('a:')) {
        const ids = unserializePhpArray(peli.pantalla_valor);
        console.log(`IDs deserializados: [${ids.join(', ')}]\n`);
        
        if (ids.length > 0 && ids.every(id => /^\d+$/.test(id))) {
          const [termsPelicula] = await connection.execute(`
            SELECT 
              t.term_id,
              t.name,
              tt.taxonomy
            FROM wp_terms t
            JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
            WHERE t.term_id IN (${ids.join(',')})
          `);
          
          console.log('Pantallas/Salas de esta película:\n');
          termsPelicula.forEach(term => {
            console.log(`  - ${term.name} (${term.taxonomy})`);
          });
        }
      }
    }

    // RESUMEN FINAL
    console.log('\n\n=== 📋 RESUMEN Y CONCLUSIONES ===\n');
    
    console.log('✅ INFORMACIÓN ENCONTRADA:\n');
    console.log(`1. Campo: "pantalla_de_estreno"`);
    console.log(`2. Películas con dato: ${stats[0].peliculas_con_pantalla} de 10,589 (${((stats[0].peliculas_con_pantalla / 10589) * 100).toFixed(2)}%)`);
    console.log(`3. Valores únicos: ${stats[0].valores_unicos}`);
    
    if (tiposDatos.length > 0) {
      console.log(`4. Tipo de dato principal: ${tiposDatos[0].tipo_dato}`);
    }

    console.log('\n💾 PARA LA MIGRACIÓN A POSTGRESQL:\n');
    console.log('1. Los datos están en wp_postmeta.meta_key = "pantalla_de_estreno"');
    console.log('2. Formato: Arrays PHP serializados con IDs de términos');
    console.log('3. Los IDs referencian términos en wp_terms con una taxonomía específica');
    console.log('4. Crear tabla "movie_screenings" en PostgreSQL');
    console.log('5. Primero migrar los términos (salas/pantallas) a "screening_venues"');
    console.log('6. Luego crear las relaciones película-sala');

    console.log('\n🔧 QUERY SUGERIDA PARA MIGRACIÓN:\n');
    console.log(`
-- 1. Obtener todas las pantallas únicas
SELECT DISTINCT 
  t.term_id,
  t.name,
  t.slug,
  tt.taxonomy
FROM wp_terms t
JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
WHERE tt.taxonomy = 'NOMBRE_TAXONOMIA' -- Reemplazar con taxonomía encontrada

-- 2. Obtener relaciones película-pantalla
SELECT 
  p.ID as pelicula_id,
  pm.meta_value as pantallas_serialized
FROM wp_posts p
JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'pelicula'
AND pm.meta_key = 'pantalla_de_estreno'
AND pm.meta_value != ''
    `);

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
analyzePantallasEstrenoV2()
  .then(() => console.log('\n✅ Análisis V2 completado'))
  .catch(console.error);