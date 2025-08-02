const mysql = require('mysql2/promise');

async function searchTandilEverywhere() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== BUSCANDO "TANDIL" EN TODA LA BASE DE DATOS ===\n');

    // 1. Buscar en wp_posts
    console.log('1. BUSCANDO EN wp_posts (contenido)');
    const [postsWithTandil] = await connection.execute(`
      SELECT 
        ID,
        post_title,
        post_type,
        post_status,
        SUBSTRING(post_content, 
          GREATEST(1, LOCATE('Tandil', post_content) - 50), 
          100
        ) as content_excerpt
      FROM wp_posts
      WHERE (
        post_content LIKE '%Tandil%' 
        OR post_title LIKE '%Tandil%'
        OR post_excerpt LIKE '%Tandil%'
      )
      LIMIT 10
    `);

    if (postsWithTandil.length > 0) {
      console.log(`Encontrados ${postsWithTandil.length} posts con "Tandil":`);
      postsWithTandil.forEach(post => {
        console.log(`\n- ${post.post_title} (ID: ${post.ID}, tipo: ${post.post_type})`);
        if (post.content_excerpt && post.content_excerpt.includes('Tandil')) {
          console.log(`  Contexto: ...${post.content_excerpt}...`);
        }
      });
    } else {
      console.log('No se encontró "Tandil" en wp_posts');
    }

    // 2. Buscar en wp_postmeta
    console.log('\n\n2. BUSCANDO EN wp_postmeta');
    const [metaWithTandil] = await connection.execute(`
      SELECT 
        pm.post_id,
        pm.meta_key,
        pm.meta_value,
        p.post_title,
        p.post_type
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE pm.meta_value LIKE '%Tandil%'
      LIMIT 20
    `);

    if (metaWithTandil.length > 0) {
      console.log(`Encontrados ${metaWithTandil.length} metadatos con "Tandil":`);
      metaWithTandil.forEach(meta => {
        console.log(`\n- ${meta.post_title} (tipo: ${meta.post_type})`);
        console.log(`  Meta key: ${meta.meta_key}`);
        console.log(`  Valor: ${meta.meta_value.substring(0, 100)}...`);
      });
    } else {
      console.log('No se encontró "Tandil" en wp_postmeta');
    }

    // 3. Buscar en wp_terms
    console.log('\n\n3. BUSCANDO EN wp_terms');
    const [termsWithTandil] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.name LIKE '%Tandil%' OR t.slug LIKE '%tandil%'
    `);

    if (termsWithTandil.length > 0) {
      console.log('Términos encontrados:');
      termsWithTandil.forEach(term => {
        console.log(`- ${term.name} (ID: ${term.term_id}, taxonomía: ${term.taxonomy}, usos: ${term.count})`);
      });
    } else {
      console.log('No se encontró "Tandil" en wp_terms');
    }

    // 4. Buscar específicamente en el post de Víctor Laplace
    console.log('\n\n4. DATOS COMPLETOS DE VÍCTOR LAPLACE');
    const [victorData] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        p.post_content,
        p.post_excerpt
      FROM wp_posts p
      WHERE p.post_title = 'Víctor Laplace'
      AND p.post_type = 'persona'
    `);

    if (victorData.length > 0) {
      const victor = victorData[0];
      console.log(`\nContenido del post de Víctor Laplace (ID: ${victor.ID}):`);
      console.log('Post content:', victor.post_content ? victor.post_content.substring(0, 500) + '...' : 'Vacío');
      console.log('\nPost excerpt:', victor.post_excerpt || 'Vacío');
      
      // Buscar si Tandil está en el contenido
      if (victor.post_content && victor.post_content.includes('Tandil')) {
        console.log('\n¡"Tandil" ENCONTRADO en el contenido del post!');
        const index = victor.post_content.indexOf('Tandil');
        console.log('Contexto:', victor.post_content.substring(Math.max(0, index - 50), index + 50));
      }
    }

    // 5. Buscar todos los metadatos de Víctor Laplace
    console.log('\n\n5. TODOS LOS METADATOS DE VÍCTOR LAPLACE');
    const [victorMeta] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = 158575
      ORDER BY meta_key
    `);

    console.log('Buscando "Tandil" en los metadatos...');
    victorMeta.forEach(meta => {
      if (meta.meta_value && meta.meta_value.toLowerCase().includes('tandil')) {
        console.log(`\n¡ENCONTRADO en ${meta.meta_key}!`);
        console.log(`Valor: ${meta.meta_value}`);
      }
    });

    // 6. Buscar en opciones del sitio
    console.log('\n\n6. BUSCANDO EN wp_options');
    const [optionsWithTandil] = await connection.execute(`
      SELECT option_name, option_value
      FROM wp_options
      WHERE option_value LIKE '%Tandil%'
      LIMIT 5
    `);

    if (optionsWithTandil.length > 0) {
      console.log('Opciones con "Tandil":');
      optionsWithTandil.forEach(opt => {
        console.log(`- ${opt.option_name}`);
      });
    } else {
      console.log('No se encontró "Tandil" en wp_options');
    }

  } catch (error) {
    console.error('Error durante la búsqueda:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar la búsqueda
searchTandilEverywhere()
  .then(() => console.log('\nBúsqueda completada'))
  .catch(console.error);