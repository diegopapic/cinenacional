const mysql = require('mysql2/promise');

async function investigarDiscrepancia() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('=== INVESTIGACIÓN DE DISCREPANCIA: 802 vs 73 ===\n');

    // 1. Contar EXACTAMENTE como el primer script
    console.log('=== CONTEO EXACTO DEL PRIMER ANÁLISIS ===\n');
    
    const [primerConteo] = await connection.execute(`
      SELECT DISTINCT 
        meta_key,
        COUNT(*) as cantidad_registros,
        COUNT(DISTINCT post_id) as peliculas_con_dato
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      AND (meta_key = 'pantalla_de_estreno' OR meta_key = '_pantalla_de_estreno')
      GROUP BY meta_key
      ORDER BY cantidad_registros DESC
    `);

    primerConteo.forEach(mk => {
      console.log(`${mk.meta_key}:`);
      console.log(`  - Registros: ${mk.cantidad_registros}`);
      console.log(`  - Películas: ${mk.peliculas_con_dato}`);
      console.log('');
    });

    // 2. Contar CON y SIN la condición de meta_value != ''
    console.log('\n=== ANÁLISIS CON/SIN FILTRO DE VALORES VACÍOS ===\n');
    
    const [conSinVacios] = await connection.execute(`
      SELECT 
        meta_key,
        COUNT(*) as total_todos,
        SUM(CASE WHEN meta_value != '' THEN 1 ELSE 0 END) as total_no_vacios,
        SUM(CASE WHEN meta_value = '' THEN 1 ELSE 0 END) as total_vacios,
        SUM(CASE WHEN meta_value IS NULL THEN 1 ELSE 0 END) as total_nulls
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      AND (meta_key = 'pantalla_de_estreno' OR meta_key = '_pantalla_de_estreno')
      GROUP BY meta_key
    `);

    conSinVacios.forEach(stats => {
      console.log(`${stats.meta_key}:`);
      console.log(`  Total registros: ${stats.total_todos}`);
      console.log(`  No vacíos (value != ''): ${stats.total_no_vacios}`);
      console.log(`  Vacíos (value = ''): ${stats.total_vacios}`);
      console.log(`  NULL: ${stats.total_nulls}`);
      console.log('');
    });

    // 3. Ver muestras de valores en _pantalla_de_estreno (con underscore)
    console.log('\n=== MUESTRAS DE _pantalla_de_estreno (CON UNDERSCORE) ===\n');
    
    const [muestrasUnderscore] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_value,
        LENGTH(pm.meta_value) as longitud
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
      AND pm.meta_key = '_pantalla_de_estreno'
      ORDER BY p.post_date DESC
      LIMIT 20
    `);

    console.log(`Total de muestras: ${muestrasUnderscore.length}\n`);
    
    muestrasUnderscore.forEach((muestra, idx) => {
      console.log(`${idx + 1}. "${muestra.post_title}" (ID: ${muestra.ID})`);
      console.log(`   Valor: "${muestra.meta_value}"`);
      console.log(`   Longitud: ${muestra.longitud} caracteres`);
      console.log('');
    });

    // 4. Comparar si son idénticos los valores entre ambos meta_keys
    console.log('\n=== COMPARACIÓN DE VALORES ENTRE pantalla_de_estreno Y _pantalla_de_estreno ===\n');
    
    const [comparacion] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm1.meta_value as valor_sin_underscore,
        pm2.meta_value as valor_con_underscore,
        CASE 
          WHEN pm1.meta_value = pm2.meta_value THEN 'Idénticos'
          WHEN pm1.meta_value IS NULL AND pm2.meta_value IS NULL THEN 'Ambos NULL'
          WHEN pm1.meta_value IS NULL THEN 'Solo con _ tiene valor'
          WHEN pm2.meta_value IS NULL THEN 'Solo sin _ tiene valor'
          ELSE 'Diferentes'
        END as comparacion
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm1 ON p.ID = pm1.post_id AND pm1.meta_key = 'pantalla_de_estreno'
      LEFT JOIN wp_postmeta pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_pantalla_de_estreno'
      WHERE p.post_type = 'pelicula'
      AND (pm1.post_id IS NOT NULL OR pm2.post_id IS NOT NULL)
      LIMIT 30
    `);

    console.log(`Mostrando 30 películas:\n`);
    
    const resumenComparacion = {
      identicos: 0,
      diferentes: 0,
      soloSinUnderscore: 0,
      soloConUnderscore: 0,
      ambosNull: 0
    };

    comparacion.forEach((comp, idx) => {
      console.log(`${idx + 1}. "${comp.post_title}" (ID: ${comp.ID})`);
      console.log(`   Sin _: "${comp.valor_sin_underscore || 'NULL'}"`);
      console.log(`   Con _: "${comp.valor_con_underscore || 'NULL'}"`);
      console.log(`   → ${comp.comparacion}`);
      console.log('');

      if (comp.comparacion === 'Idénticos') resumenComparacion.identicos++;
      else if (comp.comparacion === 'Diferentes') resumenComparacion.diferentes++;
      else if (comp.comparacion === 'Solo sin _ tiene valor') resumenComparacion.soloSinUnderscore++;
      else if (comp.comparacion === 'Solo con _ tiene valor') resumenComparacion.soloConUnderscore++;
      else if (comp.comparacion === 'Ambos NULL') resumenComparacion.ambosNull++;
    });

    console.log('\nResumen de comparación:');
    console.log(`  Idénticos: ${resumenComparacion.identicos}`);
    console.log(`  Diferentes: ${resumenComparacion.diferentes}`);
    console.log(`  Solo sin _: ${resumenComparacion.soloSinUnderscore}`);
    console.log(`  Solo con _: ${resumenComparacion.soloConUnderscore}`);
    console.log(`  Ambos NULL: ${resumenComparacion.ambosNull}`);

    // 5. Contar películas únicas que tienen CUALQUIERA de los dos campos
    console.log('\n\n=== PELÍCULAS ÚNICAS CON ALGÚN VALOR ===\n');
    
    const [peliculasUnicas] = await connection.execute(`
      SELECT COUNT(DISTINCT p.ID) as total_peliculas_con_pantalla
      FROM wp_posts p
      WHERE p.post_type = 'pelicula'
      AND (
        EXISTS (
          SELECT 1 FROM wp_postmeta pm1 
          WHERE pm1.post_id = p.ID 
          AND pm1.meta_key = 'pantalla_de_estreno' 
          AND pm1.meta_value != ''
        )
        OR
        EXISTS (
          SELECT 1 FROM wp_postmeta pm2 
          WHERE pm2.post_id = p.ID 
          AND pm2.meta_key = '_pantalla_de_estreno' 
          AND pm2.meta_value != ''
        )
      )
    `);

    console.log(`Total de películas únicas con pantalla: ${peliculasUnicas[0].total_peliculas_con_pantalla}`);

    // 6. Análisis final
    console.log('\n\n=== 📋 CONCLUSIÓN ===\n');
    
    const totalConUnderscore = primerConteo.find(m => m.meta_key === '_pantalla_de_estreno');
    const totalSinUnderscore = primerConteo.find(m => m.meta_key === 'pantalla_de_estreno');
    
    console.log('La discrepancia se explica porque:');
    console.log('');
    console.log(`1. El primer análisis contó AMBOS meta_keys:`);
    if (totalSinUnderscore) {
      console.log(`   - pantalla_de_estreno: ${totalSinUnderscore.cantidad_registros} registros`);
    }
    if (totalConUnderscore) {
      console.log(`   - _pantalla_de_estreno: ${totalConUnderscore.cantidad_registros} registros`);
    }
    if (totalSinUnderscore && totalConUnderscore) {
      console.log(`   - SUMA: ${totalSinUnderscore.cantidad_registros + totalConUnderscore.cantidad_registros} registros`);
    }
    console.log('');
    console.log('2. El segundo análisis (V2) solo contó UNO de ellos');
    console.log('');
    console.log('3. En WordPress, el underscore (_) indica metadata "privada/interna"');
    console.log('   que suele ser un duplicado del campo público');
    console.log('');
    console.log('💡 PARA LA MIGRACIÓN:');
    console.log('   ✅ Usar SOLO "pantalla_de_estreno" (sin underscore)');
    console.log('   ✅ El campo con _ es redundante');
    console.log(`   ✅ Total real de películas a migrar: ${peliculasUnicas[0].total_peliculas_con_pantalla}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

investigarDiscrepancia()
  .then(() => console.log('\n✅ Investigación completada'))
  .catch(console.error);