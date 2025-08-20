// scripts/migrate-wp-cast-import-priority.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');
const fs = require('fs').promises;

// Configuración Supabase - Verificar que estas variables estén correctas
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

console.log('🔧 Configuración:');
console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function extractPersonId(serializedValue) {
  if (!serializedValue) return null;
  
  try {
    if (serializedValue.startsWith('a:')) {
      const data = unserialize.unserialize(serializedValue);
      if (Array.isArray(data) && data.length > 0) {
        return parseInt(data[0].toString());
      }
      if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0) {
          return parseInt(values[0].toString());
        }
      }
    } else if (!isNaN(serializedValue)) {
      return parseInt(serializedValue);
    }
  } catch (e) {}
  
  return null;
}

async function migrateMovieCast() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('\n🎬 Iniciando migración del cast (prioridad a import en conflictos)...\n');

    // Verificar conexión a Supabase
    console.log('🔍 Verificando conexión a Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('movies')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error conectando a Supabase:', testError);
      return;
    }
    console.log('✅ Conexión a Supabase exitosa\n');

    // 1. Cargar IDs de películas desde WordPress directamente
    console.log('📊 Cargando IDs desde WordPress...');
    
    const [wpMovies] = await connection.execute(`
      SELECT ID 
      FROM wp_posts 
      WHERE post_type = 'pelicula' 
      AND post_status = 'publish'
    `);
    
    const movieIds = new Set(wpMovies.map(m => m.ID));
    console.log(`  ${movieIds.size} películas en WordPress`);
    
    // Verificar cuántas están en Supabase
    const movieIdsArray = Array.from(movieIds);
    const supabaseMovieIds = new Set();
    
    for (let i = 0; i < movieIdsArray.length; i += 1000) {
      const chunk = movieIdsArray.slice(i, i + 1000);
      const { data } = await supabase
        .from('movies')
        .select('id')
        .in('id', chunk);
      
      if (data) {
        data.forEach(m => supabaseMovieIds.add(m.id));
      }
    }
    console.log(`  ${supabaseMovieIds.size} películas en Supabase`);
    
    // Cargar personas desde WordPress
    const [wpPeople] = await connection.execute(`
      SELECT ID 
      FROM wp_posts 
      WHERE post_type = 'persona' 
      AND post_status = 'publish'
    `);
    
    const personIds = new Set(wpPeople.map(p => p.ID));
    console.log(`  ${personIds.size} personas en WordPress`);
    
    // Verificar cuántas están en Supabase
    const personIdsArray = Array.from(personIds);
    const supabasePersonIds = new Set();
    
    for (let i = 0; i < personIdsArray.length; i += 1000) {
      const chunk = personIdsArray.slice(i, i + 1000);
      const { data } = await supabase
        .from('people')
        .select('id')
        .in('id', chunk);
      
      if (data) {
        data.forEach(p => supabasePersonIds.add(p.id));
      }
    }
    console.log(`  ${supabasePersonIds.size} personas en Supabase`);

    // 2. Obtener TODOS los datos de cast
    console.log('\n🔍 Obteniendo datos de cast de WordPress...');
    
    const allCastData = [];
    
    // Usar las películas de WordPress, no las de Supabase
    for (let i = 0; i < movieIdsArray.length; i += 1000) {
      const chunk = movieIdsArray.slice(i, i + 1000);
      if ((i / 1000 + 1) % 5 === 0) {
        console.log(`  Procesando chunk ${i / 1000 + 1}/${Math.ceil(movieIdsArray.length / 1000)}...`);
      }
      
      const [data] = await connection.execute(`
        SELECT 
          post_id as movie_id,
          meta_key,
          meta_value
        FROM wp_postmeta
        WHERE post_id IN (${chunk.join(',')})
        AND (meta_key LIKE 'interpretes_%' OR meta_key = 'interpretes')
      `);
      
      allCastData.push(...data);
    }
    
    console.log(`  ${allCastData.length} registros encontrados`);

    // 3. Organizar datos por película
    console.log('\n📋 Organizando datos...');
    
    const movieCastMap = {};
    allCastData.forEach(row => {
      if (!movieCastMap[row.movie_id]) {
        movieCastMap[row.movie_id] = {};
      }
      movieCastMap[row.movie_id][row.meta_key] = row.meta_value;
    });
    
    console.log(`  ${Object.keys(movieCastMap).length} películas con datos de cast`);

    // 4. Procesar con prioridad a import
    console.log('\n⚙️ Procesando registros...');
    
    const allCastToInsert = [];
    const uniqueKeys = new Set();
    
    let fromNormal = 0;
    let fromImport = 0;
    let fromConflict = 0;
    let skipped = 0;
    let personsNotFound = 0;
    let moviesNotInSupabase = 0;

    for (const [movieId, data] of Object.entries(movieCastMap)) {
      const movieIdNum = parseInt(movieId);
      
      // Solo procesar si la película está en Supabase
      if (!supabaseMovieIds.has(movieIdNum)) {
        moviesNotInSupabase++;
        continue;
      }
      
      // Obtener contadores
      const normalCount = parseInt(data['interpretes'] || 0);
      const importCount = parseInt(data['interpretes_import'] || 0);
      const maxCount = Math.max(normalCount, importCount);

      for (let i = 0; i < maxCount; i++) {
        // Obtener datos normales
        const normalInterprete = data[`interpretes_${i}_interprete`];
        const normalPersonaje = data[`interpretes_${i}_nombre_del_personaje`];
        const normalProtagonista = data[`interpretes_${i}_protagonista`];
        const normalCredited = data[`interpretes_${i}_acreditado_con_su`];
        const normalComentario = data[`interpretes_${i}_comentario`];
        
        // Obtener datos import
        const importInterprete = data[`interpretes_import_${i}_interprete`];
        const importPersonaje = data[`interpretes_import_${i}_nombre_del_personaje`];
        const importProtagonista = data[`interpretes_import_${i}_protagonista`];
        const importCredited = data[`interpretes_import_${i}_acreditado_con_su`];
        
        // Decidir qué datos usar
        let usePersonId = null;
        let usePersonaje = null;
        let useProtagonista = null;
        let useCredited = null;
        let useComentario = normalComentario;
        let source = null;
        
        const normalPersonId = extractPersonId(normalInterprete);
        const importPersonId = extractPersonId(importInterprete);
        
        if (importPersonId) {
          usePersonId = importPersonId;
          usePersonaje = importPersonaje;
          useProtagonista = importProtagonista;
          useCredited = importCredited;
          
          if (normalPersonId && (normalPersonId !== importPersonId || normalPersonaje !== importPersonaje)) {
            source = 'conflict-import';
            fromConflict++;
          } else {
            source = 'import';
            fromImport++;
          }
        } else if (normalPersonId) {
          usePersonId = normalPersonId;
          usePersonaje = normalPersonaje;
          useProtagonista = normalProtagonista;
          useCredited = normalCredited;
          source = 'normal';
          fromNormal++;
        } else {
          continue;
        }
        
        // Verificar que la persona existe en Supabase
        if (!supabasePersonIds.has(usePersonId)) {
          personsNotFound++;
          skipped++;
          continue;
        }
        
        // Evitar duplicados
        const uniqueKey = `${movieIdNum}-${usePersonId}-${usePersonaje || 'sin-personaje'}`;
        if (uniqueKeys.has(uniqueKey)) {
          skipped++;
          continue;
        }
        uniqueKeys.add(uniqueKey);
        
        // Preparar nota
        let notes = useComentario;
        if (useCredited && useCredited !== '2' && useCredited !== '1' && useCredited !== '') {
          notes = notes ? `Acreditado como: ${useCredited}. ${notes}` : `Acreditado como: ${useCredited}`;
        }
        
        // Determinar si es principal
        const isPrincipal = useProtagonista === '1' || useProtagonista === 'true' || useProtagonista === 1;
        
        allCastToInsert.push({
          movie_id: movieIdNum,
          person_id: usePersonId,
          character_name: usePersonaje || null,
          billing_order: i + 1,
          is_principal: isPrincipal,
          notes: notes || null
        });
      }
    }
    
    console.log(`\n📊 Origen de los datos:`);
    console.log(`  ✅ Solo normal: ${fromNormal}`);
    console.log(`  ✅ Import (o idénticos): ${fromImport}`);
    console.log(`  ⚠️ Conflictos (usando import): ${fromConflict}`);
    console.log(`  ❌ Omitidos: ${skipped}`);
    console.log(`    - Personas no encontradas en Supabase: ${personsNotFound}`);
    console.log(`    - Películas no migradas a Supabase: ${moviesNotInSupabase}`);
    console.log(`  📝 Total a insertar: ${allCastToInsert.length}`);

    // 5. Limpiar tabla e insertar
    if (allCastToInsert.length > 0) {
      console.log('\n🗑️ Limpiando tabla movie_cast...');
      const { error: deleteError } = await supabase.from('movie_cast').delete().gte('id', 0);
      
      if (deleteError) {
        console.error('Error limpiando tabla:', deleteError);
      }
      
      console.log('📝 Insertando registros...');
      
      const BATCH_SIZE = 500;
      let inserted = 0;
      let errors = 0;
      
      for (let i = 0; i < allCastToInsert.length; i += BATCH_SIZE) {
        const batch = allCastToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('movie_cast').insert(batch);
        
        if (error) {
          console.error(`Error en batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
          errors++;
        } else {
          inserted += batch.length;
          if (inserted % 10000 === 0 || inserted === allCastToInsert.length) {
            console.log(`  ${inserted}/${allCastToInsert.length} registros insertados...`);
          }
        }
      }
      
      console.log(`\n✅ ${inserted} registros insertados exitosamente`);
      if (errors > 0) {
        console.log(`⚠️ ${errors} lotes con errores`);
      }
    } else {
      console.log('\n⚠️ No hay datos para insertar');
    }

    // 6. Resumen final
    const { count: totalCount } = await supabase
      .from('movie_cast')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log(`  Total en movie_cast: ${totalCount || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
migrateMovieCast();