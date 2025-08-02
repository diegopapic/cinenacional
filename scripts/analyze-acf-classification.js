const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine'
};

async function analyzeACFClassification() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');

    console.log('=== ANÁLISIS DE CLASIFICACIONES CON ACF ===\n');

    // 1. Analizar el campo ACF
    console.log('1. ANÁLISIS DEL CAMPO ACF:');
    console.log('--------------------------');
    
    // Buscar la definición del campo ACF
    const [acfField] = await connection.execute(`
      SELECT 
        post_name,
        post_content,
        post_excerpt,
        post_title
      FROM wp_posts
      WHERE post_name = 'field_6182cf8d65fb5'
        AND post_type = 'acf-field'
    `);

    if (acfField.length > 0) {
      console.log('Campo ACF encontrado:');
      console.log(`- Nombre: ${acfField[0].post_excerpt}`);
      console.log(`- Título: ${acfField[0].post_title}`);
      
      // Parsear el contenido serializado si es posible
      try {
        console.log(`- Configuración: ${acfField[0].post_content.substring(0, 200)}...`);
      } catch (e) {
        console.log('- Configuración: [datos serializados]');
      }
    }

    // 2. Buscar las opciones del campo select (si es un select)
    console.log('\n\n2. OPCIONES DEL CAMPO DE CLASIFICACIÓN:');
    console.log('---------------------------------------');
    
    // Buscar en wp_options las opciones de ACF
    const [acfOptions] = await connection.execute(`
      SELECT 
        option_name,
        option_value
      FROM wp_options
      WHERE option_name LIKE '%acf%'
        AND option_value LIKE '%clasificacion%'
      LIMIT 5
    `);

    if (acfOptions.length > 0) {
      console.log('Opciones ACF relacionadas encontradas:');
      acfOptions.forEach(opt => {
        console.log(`- ${opt.option_name}: ${opt.option_value.substring(0, 100)}...`);
      });
    }

    // 3. Mapeo completo y definitivo
    console.log('\n\n3. MAPEO DEFINITIVO CÓDIGO → CLASIFICACIÓN:');
    console.log('-------------------------------------------');
    
    // Obtener el mapeo más preciso basado en películas con taxonomía
    const [definitiveMapping] = await connection.execute(`
      SELECT 
        pm.meta_value as codigo,
        t.name as clasificacion_oficial,
        t.slug as slug_oficial,
        COUNT(DISTINCT p.ID) as total_peliculas,
        MIN(pm_year.meta_value) as desde_ano,
        MAX(pm_year.meta_value) as hasta_ano,
        GROUP_CONCAT(DISTINCT p.post_title ORDER BY p.post_date DESC LIMIT 3) as ejemplos
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
      INNER JOIN wp_term_relationships tr ON p.ID = tr.object_id
      INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
      INNER JOIN wp_terms t ON tt.term_id = t.term_id
      LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_value != 'n/d'
      GROUP BY pm.meta_value, t.name, t.slug
      ORDER BY 
        CASE 
          WHEN pm.meta_value REGEXP '^[0-9]+$' THEN CAST(pm.meta_value AS UNSIGNED)
          ELSE 999
        END,
        total_peliculas DESC
    `);

    console.log('\nCódigo | Clasificación Oficial | Películas | Período | Ejemplos');
    console.log('-------|----------------------|-----------|---------|----------');
    
    const codeToClassificationMap = {};
    definitiveMapping.forEach(map => {
      // Guardar el mapeo más usado (con más películas)
      if (!codeToClassificationMap[map.codigo] || codeToClassificationMap[map.codigo].count < map.total_peliculas) {
        codeToClassificationMap[map.codigo] = {
          clasificacion: map.clasificacion_oficial,
          slug: map.slug_oficial,
          count: map.total_peliculas
        };
      }
      
      const ejemplos = map.ejemplos ? map.ejemplos.split(',').slice(0, 2).join(', ') : '';
      console.log(`${map.codigo.padEnd(6)} | ${map.clasificacion_oficial.padEnd(20)} | ${map.total_peliculas.toString().padEnd(9)} | ${map.desde_ano}-${map.hasta_ano} | ${ejemplos.substring(0, 50)}...`);
    });

    // 4. Normalización al sistema actual
    console.log('\n\n4. TABLA DE CONVERSIÓN AL SISTEMA ACTUAL:');
    console.log('----------------------------------------');
    
    const normalizationMap = {
      '1': null, // Sin datos suficientes
      '2': 'ATP',
      '3': null, // Sin datos suficientes
      '4': 'SAM14', // Inconveniente para menores de 14
      '5': 'SAM16', // Inconveniente para menores de 16
      '6': 'SAM18', // Inconveniente para menores de 18
      '7': 'SAM13', // Inconveniente para niños
      '8': 'SAM14', // No apta para menores de 14
      '9': 'SAM16', // No apta para menores de 16
      '10': 'SAM18', // No apta para menores de 18
      '11': 'SAM13', // Prohibida para menores de 13
      '12': 'SAM14', // Prohibida para menores de 14
      '13': 'SAM16', // Prohibida para menores de 16
      '14': 'SAM18', // Prohibida para menores de 18
      '15': 'SAM13',
      '16': 'SAM13 C/R',
      '17': 'SAM14',
      '18': 'SAM15',
      '19': 'SAM16',
      '20': 'SAM16 C/R',
      '21': 'SAM18',
      '22': 'SAM18 C/R',
      '23': 'ATP', // Sin restricciones
      '24': 'ATP C/R'
    };

    console.log('Código | Clasificación Histórica | Sistema Actual');
    console.log('-------|------------------------|---------------');
    Object.entries(codeToClassificationMap).forEach(([code, data]) => {
      const modern = normalizationMap[code] || 'Por definir';
      console.log(`${code.padEnd(6)} | ${data.clasificacion.padEnd(22)} | ${modern}`);
    });

    // 5. Películas que necesitan reparación
    console.log('\n\n5. PELÍCULAS QUE NECESITAN REPARACIÓN:');
    console.log('-------------------------------------');
    
    const [needsRepair] = await connection.execute(`
      SELECT 
        pm.meta_value as codigo,
        COUNT(DISTINCT p.ID) as cantidad,
        GROUP_CONCAT(DISTINCT YEAR(p.post_date) ORDER BY YEAR(p.post_date) DESC) as anos_afectados
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
      LEFT JOIN (
        SELECT tr.object_id
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tt.taxonomy = 'clasificacion'
      ) tax ON p.ID = tax.object_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_value REGEXP '^[0-9]+$'
        AND pm.meta_value != 'n/d'
        AND tax.object_id IS NULL
      GROUP BY pm.meta_value
      ORDER BY cantidad DESC
    `);

    console.log('Códigos sin taxonomía asociada:');
    needsRepair.forEach(repair => {
      const modernClass = normalizationMap[repair.codigo];
      console.log(`- Código ${repair.codigo} → ${modernClass || 'Sin mapeo'}: ${repair.cantidad} películas (años: ${repair.anos_afectados})`);
    });

    // 6. Verificación específica de Las Furias
    console.log('\n\n6. VERIFICACIÓN DE "LAS FURIAS":');
    console.log('--------------------------------');
    
    const [lasFuriasCheck] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm_year.meta_value as ano,
        pm_class.meta_value as codigo_clasificacion,
        CASE 
          WHEN tax.object_id IS NOT NULL THEN 'Sí'
          ELSE 'No'
        END as tiene_taxonomia,
        GROUP_CONCAT(DISTINCT t.name) as clasificacion_taxonomia
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_postmeta pm_class ON p.ID = pm_class.post_id AND pm_class.meta_key = 'clasificacion'
      LEFT JOIN (
        SELECT tr.object_id
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tt.taxonomy = 'clasificacion'
      ) tax ON p.ID = tax.object_id
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_title LIKE '%Las Furias%'
        AND p.post_type = 'pelicula'
      GROUP BY p.ID
    `);

    lasFuriasCheck.forEach(movie => {
      console.log(`"${movie.post_title}" (${movie.ano}):`);
      console.log(`- Código en meta: ${movie.codigo_clasificacion}`);
      console.log(`- Tiene taxonomía: ${movie.tiene_taxonomia}`);
      console.log(`- Clasificación en taxonomía: ${movie.clasificacion_taxonomia || 'Ninguna'}`);
      console.log(`- Clasificación correcta según mapeo: ${normalizationMap[movie.codigo_clasificacion] || 'Sin mapeo'}`);
      
      if (movie.codigo_clasificacion === '14') {
        console.log('- DIAGNÓSTICO: La película tiene código 14 que corresponde a SAM18');
        console.log('  pero no tiene el término asociado en la taxonomía.');
        console.log('  Por eso el admin muestra SAM16 (posiblemente un default o error).');
      }
    });

    // 7. Resumen final
    console.log('\n\n7. RESUMEN Y RECOMENDACIONES:');
    console.log('-----------------------------');
    console.log('1. El campo ACF "field_6182cf8d65fb5" almacena códigos numéricos');
    console.log('2. Estos códigos se mapean a clasificaciones históricas y actuales');
    console.log('3. Muchas películas (especialmente 2019-2022) perdieron la asociación con la taxonomía');
    console.log('4. Para la migración a Supabase:');
    console.log('   - Usar el mapeo de normalización propuesto');
    console.log('   - Convertir clasificaciones históricas al sistema actual');
    console.log('   - Los códigos "n/d" o null → dejar campo vacío');
    console.log('   - Validar casos especiales manualmente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeACFClassification();