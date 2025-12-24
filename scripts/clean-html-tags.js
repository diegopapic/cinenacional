const { Client } = require('pg');

// Configuración PostgreSQL - VPS (via túnel SSH o port forwarding)
const pgConfig = {
  host: 'localhost',
  port: 5433,
  database: 'cinenacional',
  user: 'cinenacional',
  password: 'Paganitzu'
};

// Tags a eliminar (estructura)
const TAGS_TO_REMOVE = ['p', 'li', 'ul', 'ol', 'div', 'span'];

// Tags a mantener (formato) - solo para referencia
const TAGS_TO_KEEP = ['a', 'i', 'em', 'strong', 'b', 'br'];

/**
 * Limpia tags de estructura del HTML, manteniendo tags de formato
 * @param {string} html - HTML a limpiar
 * @returns {string} - HTML limpio
 */
function cleanStructureTags(html) {
  if (!html) return html;
  
  let cleaned = html;
  
  // Eliminar cada tag de estructura (apertura y cierre)
  for (const tag of TAGS_TO_REMOVE) {
    // Tag de apertura con atributos: <p class="..."> o <div style="...">
    const openTagRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    cleaned = cleaned.replace(openTagRegex, '');
    
    // Tag de cierre: </p>, </div>, etc.
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi');
    cleaned = cleaned.replace(closeTagRegex, '');
  }
  
  // Limpiar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Limpiar espacios al inicio y final
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Verifica si el HTML contiene tags de estructura
 * @param {string} html 
 * @returns {boolean}
 */
function hasStructureTags(html) {
  if (!html) return false;
  
  for (const tag of TAGS_TO_REMOVE) {
    const regex = new RegExp(`</?${tag}[^>]*>`, 'i');
    if (regex.test(html)) return true;
  }
  return false;
}

async function cleanHtmlTags() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');
    console.log('═'.repeat(80));
    console.log('🧹 LIMPIEZA DE TAGS HTML DE ESTRUCTURA');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Tags a ELIMINAR:', TAGS_TO_REMOVE.join(', '));
    console.log('Tags a MANTENER:', TAGS_TO_KEEP.join(', '));
    console.log('');

    // ════════════════════════════════════════════════════════════════════
    // FASE 1: ANALIZAR DATOS
    // ════════════════════════════════════════════════════════════════════
    
    console.log('─'.repeat(80));
    console.log('📊 FASE 1: ANÁLISIS DE DATOS');
    console.log('─'.repeat(80));
    
    // Contar películas con tags de estructura
    const moviesCountQuery = `
      SELECT COUNT(*) as total
      FROM movies 
      WHERE synopsis IS NOT NULL 
        AND synopsis != ''
    `;
    const moviesCount = await client.query(moviesCountQuery);
    console.log(`\n📽️  Películas con sinopsis: ${moviesCount.rows[0].total}`);
    
    // Contar personas con tags de estructura
    const peopleCountQuery = `
      SELECT COUNT(*) as total
      FROM people 
      WHERE biography IS NOT NULL 
        AND biography != ''
    `;
    const peopleCount = await client.query(peopleCountQuery);
    console.log(`👤 Personas con biografía: ${peopleCount.rows[0].total}`);

    // ════════════════════════════════════════════════════════════════════
    // FASE 2: LIMPIAR MOVIES.SYNOPSIS
    // ════════════════════════════════════════════════════════════════════
    
    console.log('\n' + '─'.repeat(80));
    console.log('🎬 FASE 2: LIMPIANDO MOVIES.SYNOPSIS');
    console.log('─'.repeat(80));
    
    // Obtener todas las sinopsis
    const moviesQuery = `
      SELECT id, title, synopsis
      FROM movies 
      WHERE synopsis IS NOT NULL 
        AND synopsis != ''
      ORDER BY id
    `;
    const moviesResult = await client.query(moviesQuery);
    const movies = moviesResult.rows;
    
    let moviesUpdated = 0;
    let moviesSkipped = 0;
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      
      if (hasStructureTags(movie.synopsis)) {
        const cleanedSynopsis = cleanStructureTags(movie.synopsis);
        
        // Solo actualizar si realmente cambió
        if (cleanedSynopsis !== movie.synopsis) {
          await client.query(
            'UPDATE movies SET synopsis = $1, updated_at = NOW() WHERE id = $2',
            [cleanedSynopsis, movie.id]
          );
          moviesUpdated++;
        }
      } else {
        moviesSkipped++;
      }
      
      // Mostrar progreso cada 100 películas
      if ((i + 1) % 100 === 0 || i === movies.length - 1) {
        const percent = Math.round(((i + 1) / movies.length) * 100);
        process.stdout.write(`\r   🔄 Procesando películas... [${i + 1}/${movies.length}] (${percent}%) - ${moviesUpdated} actualizadas`);
      }
    }
    
    console.log('\n');
    console.log(`   ✅ Películas actualizadas: ${moviesUpdated}`);
    console.log(`   ⏭️  Películas sin cambios: ${moviesSkipped}`);

    // ════════════════════════════════════════════════════════════════════
    // FASE 3: LIMPIAR PEOPLE.BIOGRAPHY
    // ════════════════════════════════════════════════════════════════════
    
    console.log('\n' + '─'.repeat(80));
    console.log('👤 FASE 3: LIMPIANDO PEOPLE.BIOGRAPHY');
    console.log('─'.repeat(80));
    
    // Obtener todas las biografías
    const peopleQuery = `
      SELECT id, first_name, last_name, biography
      FROM people 
      WHERE biography IS NOT NULL 
        AND biography != ''
      ORDER BY id
    `;
    const peopleResult = await client.query(peopleQuery);
    const people = peopleResult.rows;
    
    let peopleUpdated = 0;
    let peopleSkipped = 0;
    
    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      
      if (hasStructureTags(person.biography)) {
        const cleanedBiography = cleanStructureTags(person.biography);
        
        // Solo actualizar si realmente cambió
        if (cleanedBiography !== person.biography) {
          await client.query(
            'UPDATE people SET biography = $1, updated_at = NOW() WHERE id = $2',
            [cleanedBiography, person.id]
          );
          peopleUpdated++;
        }
      } else {
        peopleSkipped++;
      }
      
      // Mostrar progreso cada 100 personas
      if ((i + 1) % 100 === 0 || i === people.length - 1) {
        const percent = Math.round(((i + 1) / people.length) * 100);
        process.stdout.write(`\r   🔄 Procesando personas... [${i + 1}/${people.length}] (${percent}%) - ${peopleUpdated} actualizadas`);
      }
    }
    
    console.log('\n');
    console.log(`   ✅ Personas actualizadas: ${peopleUpdated}`);
    console.log(`   ⏭️  Personas sin cambios: ${peopleSkipped}`);

    // ════════════════════════════════════════════════════════════════════
    // FASE 4: VERIFICACIÓN
    // ════════════════════════════════════════════════════════════════════
    
    console.log('\n' + '─'.repeat(80));
    console.log('🔍 FASE 4: VERIFICACIÓN');
    console.log('─'.repeat(80));
    
    // Verificar que no queden tags de estructura
    const verifyMoviesQuery = `
      SELECT COUNT(*) as count
      FROM movies 
      WHERE synopsis ~ '<(p|li|ul|ol|div|span)[^>]*>'
    `;
    const verifyMovies = await client.query(verifyMoviesQuery);
    
    const verifyPeopleQuery = `
      SELECT COUNT(*) as count
      FROM people 
      WHERE biography ~ '<(p|li|ul|ol|div|span)[^>]*>'
    `;
    const verifyPeople = await client.query(verifyPeopleQuery);
    
    console.log(`\n   Películas con tags de estructura restantes: ${verifyMovies.rows[0].count}`);
    console.log(`   Personas con tags de estructura restantes: ${verifyPeople.rows[0].count}`);
    
    // Verificar que los links se mantienen
    const linksMoviesQuery = `
      SELECT COUNT(*) as count
      FROM movies 
      WHERE synopsis LIKE '%<a %'
    `;
    const linksMovies = await client.query(linksMoviesQuery);
    
    const linksPeopleQuery = `
      SELECT COUNT(*) as count
      FROM people 
      WHERE biography LIKE '%<a %'
    `;
    const linksPeople = await client.query(linksPeopleQuery);
    
    console.log(`\n   Películas con links preservados: ${linksMovies.rows[0].count}`);
    console.log(`   Personas con links preservados: ${linksPeople.rows[0].count}`);

    // ════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ════════════════════════════════════════════════════════════════════
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(80));
    console.log(`\n   🎬 Películas:`);
    console.log(`      - Actualizadas: ${moviesUpdated}`);
    console.log(`      - Sin cambios: ${moviesSkipped}`);
    console.log(`\n   👤 Personas:`);
    console.log(`      - Actualizadas: ${peopleUpdated}`);
    console.log(`      - Sin cambios: ${peopleSkipped}`);
    console.log(`\n   📝 Total de registros modificados: ${moviesUpdated + peopleUpdated}`);
    console.log('═'.repeat(80));

    // Mostrar ejemplos de registros limpiados
    if (moviesUpdated > 0) {
      console.log('\n📋 Ejemplos de sinopsis limpiadas:');
      const examplesQuery = `
        SELECT id, title, LEFT(synopsis, 150) as synopsis_preview
        FROM movies 
        WHERE synopsis IS NOT NULL AND synopsis != ''
        ORDER BY updated_at DESC
        LIMIT 3
      `;
      const examples = await client.query(examplesQuery);
      examples.rows.forEach((row, i) => {
        console.log(`\n   ${i + 1}. ${row.title} (ID: ${row.id})`);
        console.log(`      "${row.synopsis_preview}..."`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🧹 Script para limpiar tags HTML de estructura');
console.log('   Elimina: <p>, <li>, <ul>, <ol>, <div>, <span>');
console.log('   Mantiene: <a>, <i>, <em>, <strong>, <b>, <br>\n');
cleanHtmlTags();