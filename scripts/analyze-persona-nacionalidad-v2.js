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

async function analyzePersonaNacionalidadV2() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS PROFUNDO DE NACIONALIDAD - V2 ===\n');

    // PASO 1: Confirmar estructura de nacionalidad
    console.log('=== PASO 1: ESTRUCTURA DE NACIONALIDAD ===');
    const [nacionalidadStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT post_id) as personas_con_nacionalidad,
        COUNT(DISTINCT meta_value) as valores_unicos
      FROM wp_postmeta
      WHERE meta_key = 'nacionalidad'
      AND meta_value != ''
    `);

    console.log(`Total de registros: ${nacionalidadStats[0].total_registros}`);
    console.log(`Personas con nacionalidad: ${nacionalidadStats[0].personas_con_nacionalidad}`);
    console.log(`Valores únicos: ${nacionalidadStats[0].valores_unicos}\n`);

    // PASO 2: Obtener muestras reales de nacionalidad
    console.log('=== PASO 2: MUESTRAS REALES DE NACIONALIDAD ===');
    const [nacionalidadMuestras] = await connection.execute(`
      SELECT DISTINCT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'nacionalidad'
      AND meta_value != ''
      LIMIT 20
    `);

    console.log('Valores únicos encontrados:\n');
    const idsSet = new Set();
    
    nacionalidadMuestras.forEach((sample, idx) => {
      console.log(`${idx + 1}. ${sample.meta_value}`);
      
      // Extraer los IDs
      const ids = unserializePhpArray(sample.meta_value);
      ids.forEach(id => idsSet.add(id));
    });

    // PASO 3: Buscar qué representan esos IDs
    console.log('\n\n=== PASO 3: IDENTIFICACIÓN DE IDS ===');
    console.log('IDs encontrados:', Array.from(idsSet).join(', '));

    // Verificar si son term_ids
    console.log('\n📊 Buscando en wp_terms...');
    const [termsFound] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.term_id IN (${Array.from(idsSet).join(',')})
    `);

    if (termsFound.length > 0) {
      console.log('\n✅ IDs encontrados en wp_terms:');
      termsFound.forEach(term => {
        console.log(`\n  ID: ${term.term_id}`);
        console.log(`  Nombre: ${term.name}`);
        console.log(`  Slug: ${term.slug}`);
        console.log(`  Taxonomía: ${term.taxonomy}`);
        console.log(`  Asignaciones: ${term.count}`);
      });
    } else {
      console.log('\n❌ No encontrados en wp_terms. Verificando otras tablas...');
    }

    // PASO 4: Analizar la relación persona-nacionalidad en profundidad
    console.log('\n\n=== PASO 4: ANÁLISIS DETALLADO PERSONA-NACIONALIDAD ===');
    const [personasNacionalidad] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title as persona_nombre,
        pm.meta_value as nacionalidad_valor,
        (SELECT COUNT(*) FROM wp_postmeta pm2 
         WHERE pm2.post_id = p.ID AND pm2.meta_key = 'nacionalidad') as cantidad_nacionalidades
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND pm.meta_key = 'nacionalidad'
      AND pm.meta_value != ''
      LIMIT 30
    `);

    console.log(`Mostrando 30 personas y sus nacionalidades:\n`);
    
    personasNacionalidad.forEach((persona, idx) => {
      const ids = unserializePhpArray(persona.nacionalidad_valor);
      const termsInfo = termsFound.filter(t => ids.includes(t.term_id.toString()));
      
      console.log(`${idx + 1}. ${persona.persona_nombre}`);
      console.log(`   Valor raw: ${persona.nacionalidad_valor}`);
      console.log(`   IDs extraídos: ${ids.join(', ')}`);
      
      if (termsInfo.length > 0) {
        console.log(`   Términos:`, termsInfo.map(t => `${t.name} (${t.taxonomy})`).join(', '));
      }
    });

    // PASO 5: Verificar si existen personas sin nacionalidad
    console.log('\n\n=== PASO 5: COBERTURA DE NACIONALIDAD ===');
    const [cobertura] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM wp_posts WHERE post_type = 'persona' AND post_status = 'publish') as total_personas,
        (SELECT COUNT(DISTINCT post_id) FROM wp_postmeta WHERE meta_key = 'nacionalidad' AND meta_value != '') as con_nacionalidad
    `);

    const totalPersonas = cobertura[0].total_personas;
    const conNacionalidad = cobertura[0].con_nacionalidad;
    const porcentaje = ((conNacionalidad / totalPersonas) * 100).toFixed(2);

    console.log(`Total de personas: ${totalPersonas}`);
    console.log(`Con nacionalidad: ${conNacionalidad}`);
    console.log(`Sin nacionalidad: ${totalPersonas - conNacionalidad}`);
    console.log(`Cobertura: ${porcentaje}%\n`);

    // PASO 6: Verificar estructura de otros meta_keys importantes
    console.log('\n=== PASO 6: OTROS META KEYS IMPORTANTES ===');
    const [otrosMetaKeys] = await connection.execute(`
      SELECT 
        meta_key,
        COUNT(*) as cantidad,
        COUNT(DISTINCT post_id) as personas_unicas
      FROM wp_postmeta
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'persona')
      AND meta_key IN ('lugar_nacimiento', 'lugar_muerte', 'sexo', 'fecha_nacimiento', 'fecha_muerte')
      GROUP BY meta_key
      ORDER BY cantidad DESC
    `);

    console.log('Meta keys relacionados con personas:\n');
    otrosMetaKeys.forEach(meta => {
      console.log(`- ${meta.meta_key}:`);
      console.log(`  Registros: ${meta.cantidad}`);
      console.log(`  Personas únicas: ${meta.personas_unicas}`);
    });

    // PASO 7: Buscar si hay taxonomía de pais
    console.log('\n\n=== PASO 7: TAXONOMÍAS DISPONIBLES ===');
    const [allTaxonomies] = await connection.execute(`
      SELECT DISTINCT taxonomy, COUNT(*) as count
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY count DESC
    `);

    console.log('Todas las taxonomías en la BD:\n');
    allTaxonomies.forEach(tax => {
      console.log(`- ${tax.taxonomy}: ${tax.count} términos`);
    });

    // PASO 8: Si existe una taxonomía 'pais', analizarla
    const paisTaxonomy = allTaxonomies.find(t => t.taxonomy === 'pais');
    if (paisTaxonomy) {
      console.log('\n\n=== PASO 8: ANÁLISIS DE TAXONOMÍA "PAIS" ===');
      const [paisTerminos] = await connection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.count
        FROM wp_terms t
        JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        WHERE tt.taxonomy = 'pais'
        ORDER BY t.name
      `);

      console.log(`Total de países: ${paisTerminos.length}\n`);
      paisTerminos.forEach(pais => {
        console.log(`- ID: ${pais.term_id}, Nombre: ${pais.name}, Slug: ${pais.slug}`);
      });
    }

    // PASO 9: Resumen y conclusiones
    console.log('\n\n=== RESUMEN Y CONCLUSIONES ===\n');
    console.log('✅ HALLAZGOS:');
    console.log('1. La nacionalidad se guarda en meta_key "nacionalidad"');
    console.log('2. Formato: PHP serializado con IDs numéricos');
    console.log(`3. Cobertura: ${porcentaje}% de las personas tienen nacionalidad`);
    
    if (termsFound.length > 0) {
      console.log(`4. Los IDs son term_ids de la taxonomía "${termsFound[0].taxonomy}"`);
      console.log(`5. Hay ${termsFound.length} términos relacionados con nacionalidad`);
    }

    console.log('\n📋 PARA LA MIGRACIÓN A POSTGRESQL:');
    console.log('1. Crear tabla "person_nationalities"');
    console.log('2. Deserializar los arrays PHP en la meta_key "nacionalidad"');
    console.log('3. Por cada persona, insertar un registro por cada ID de nacionalidad');
    console.log('4. Los term_ids deben mapearse a la tabla "countries" en PostgreSQL');
    console.log('5. Crear índices en (person_id, country_id) para queries rápidas');

    console.log('\n💾 EJEMPLO DE MIGRACIÓN:');
    console.log('SELECT');
    console.log('  p.ID as person_id,');
    console.log('  "11229" as country_term_id');
    console.log('FROM wp_posts p');
    console.log('JOIN wp_postmeta pm ON p.ID = pm.post_id');
    console.log('WHERE p.post_type = "persona"');
    console.log('AND pm.meta_key = "nacionalidad"');
    console.log('AND pm.meta_value LIKE "%11229%"');

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
analyzePersonaNacionalidadV2()
  .then(() => console.log('\n✅ Análisis V2 completado'))
  .catch(console.error);