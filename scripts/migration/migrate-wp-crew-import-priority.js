// scripts/migrate-wp-crew-import-priority.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');
const fs = require('fs').promises;

// Configuración Supabase
const SUPABASE_URL = 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

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

async function migrateMovieCrew() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🚀 Iniciando migración del crew (prioridad a import en conflictos)...\n');

    // 1. Cargar roles
    console.log('📚 Cargando roles...');
    const { data: roles } = await supabase.from('roles').select('id, name');
    const rolesCache = new Map();
    roles.forEach(role => {
      rolesCache.set(role.name.toLowerCase().trim(), role.id);
    });
    console.log(`✅ ${roles.length} roles cargados`);

    // 2. Cargar IDs
    console.log('\n📊 Cargando IDs...');
    
    const movieIds = new Set();
    let offset = 0;
    while (true) {
      const { data } = await supabase.from('movies').select('id').range(offset, offset + 999);
      if (!data || data.length === 0) break;
      data.forEach(m => movieIds.add(m.id));
      if (data.length < 1000) break;
      offset += 1000;
    }
    console.log(`  ${movieIds.size} películas`);
    
    const personIds = new Set();
    offset = 0;
    while (true) {
      const { data } = await supabase.from('people').select('id').range(offset, offset + 999);
      if (!data || data.length === 0) break;
      data.forEach(p => personIds.add(p.id));
      if (data.length < 1000) break;
      offset += 1000;
    }
    console.log(`  ${personIds.size} personas`);

    // 3. Obtener TODOS los datos de crew
    console.log('\n🔍 Obteniendo datos de crew de WordPress...');
    
    const movieIdsArray = Array.from(movieIds);
    const allCrewData = [];
    
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
        AND meta_key LIKE 'ficha_tecnica_%'
      `);
      
      allCrewData.push(...data);
    }
    
    console.log(`  ${allCrewData.length} registros encontrados`);

    // 4. Organizar datos
    console.log('\n📋 Organizando datos...');
    
    const movieCrewMap = {};
    allCrewData.forEach(row => {
      if (!movieCrewMap[row.movie_id]) {
        movieCrewMap[row.movie_id] = {};
      }
      movieCrewMap[row.movie_id][row.meta_key] = row.meta_value;
    });

    // 5. Procesar con prioridad a import
    console.log('\n⚙️ Procesando registros...');
    
    const allCrewToInsert = [];
    const rolesNotFound = new Set();
    const uniqueKeys = new Set();
    
    let fromNormal = 0;
    let fromImport = 0;
    let fromConflict = 0;
    let skipped = 0;

    for (const [movieId, data] of Object.entries(movieCrewMap)) {
      const movieIdNum = parseInt(movieId);
      
      // Obtener todos los departamentos posibles
      const departments = new Set();
      Object.keys(data).forEach(key => {
        // Contadores normales
        if (key.match(/^ficha_tecnica_[^_]+$/) && !isNaN(data[key]) && parseInt(data[key]) > 0) {
          departments.add(key.replace('ficha_tecnica_', ''));
        }
        // Contadores import
        if (key.match(/^ficha_tecnica_[^_]+_import$/) && !isNaN(data[key]) && parseInt(data[key]) > 0) {
          departments.add(key.replace('ficha_tecnica_', '').replace('_import', ''));
        }
      });

      // Procesar cada departamento
      for (const dept of departments) {
        const normalCount = parseInt(data[`ficha_tecnica_${dept}`] || 0);
        const importCount = parseInt(data[`ficha_tecnica_${dept}_import`] || 0);
        const maxCount = Math.max(normalCount, importCount);

        for (let i = 0; i < maxCount; i++) {
          // Obtener datos normales
          const normalPerson = data[`ficha_tecnica_${dept}_${i}_persona`];
          const normalRole = data[`ficha_tecnica_${dept}_${i}_rol`];
          const normalCredited = data[`ficha_tecnica_${dept}_${i}_acreditado_con_su`];
          const normalComment = data[`ficha_tecnica_${dept}_${i}_comentario`];
          
          // Obtener datos import
          const importPerson = data[`ficha_tecnica_${dept}_import_${i}_persona`];
          const importRole = data[`ficha_tecnica_${dept}_import_${i}_rol`];
          const importCredited = data[`ficha_tecnica_${dept}_import_${i}_acreditado_con_su`];
          
          // Decidir qué datos usar
          let usePersonId = null;
          let useRole = null;
          let useCredited = null;
          let useComment = normalComment; // El comentario solo está en normal
          let source = null;
          
          const normalPersonId = extractPersonId(normalPerson);
          const importPersonId = extractPersonId(importPerson);
          
          if (importPersonId) {
            // Si existe import, SIEMPRE usar import (tiene prioridad)
            usePersonId = importPersonId;
            useRole = importRole;
            useCredited = importCredited;
            if (normalPersonId && (normalPersonId !== importPersonId || normalRole !== importRole)) {
              source = 'conflict-import';
              fromConflict++;
            } else {
              source = 'import';
              fromImport++;
            }
          } else if (normalPersonId) {
            // Solo existe normal
            usePersonId = normalPersonId;
            useRole = normalRole;
            useCredited = normalCredited;
            source = 'normal';
            fromNormal++;
          } else {
            // No hay datos
            continue;
          }
          
          // Verificar que la persona existe
          if (!personIds.has(usePersonId)) {
            skipped++;
            continue;
          }
          
          // Verificar rol
          if (!useRole) {
            skipped++;
            continue;
          }
          
          const roleId = rolesCache.get(useRole.toLowerCase().trim());
          if (!roleId) {
            rolesNotFound.add(useRole);
            skipped++;
            continue;
          }
          
          // Evitar duplicados
          const uniqueKey = `${movieIdNum}-${usePersonId}-${roleId}`;
          if (uniqueKeys.has(uniqueKey)) {
            skipped++;
            continue;
          }
          uniqueKeys.add(uniqueKey);
          
          // Preparar nota
          let notes = useComment;
          // Si acreditado no es "2" o "1", es un nombre alternativo
          if (useCredited && useCredited !== '2' && useCredited !== '1' && useCredited !== '') {
            notes = notes ? `Acreditado como: ${useCredited}. ${notes}` : `Acreditado como: ${useCredited}`;
          }
          
          allCrewToInsert.push({
            movie_id: movieIdNum,
            person_id: usePersonId,
            role_id: roleId,
            billing_order: i + 1,
            notes: notes || null
          });
        }
      }
    }
    
    console.log(`\n📊 Origen de los datos:`);
    console.log(`  ✅ Solo normal: ${fromNormal}`);
    console.log(`  ✅ Import (o idénticos): ${fromImport}`);
    console.log(`  ⚠️ Conflictos (usando import): ${fromConflict}`);
    console.log(`  ❌ Omitidos: ${skipped}`);
    console.log(`  📝 Total a insertar: ${allCrewToInsert.length}`);

    // 6. Limpiar tabla e insertar
    if (allCrewToInsert.length > 0) {
      console.log('\n🗑️ Limpiando tabla movie_crew...');
      await supabase.from('movie_crew').delete().gte('id', 0);
      
      console.log('📝 Insertando registros...');
      
      const BATCH_SIZE = 500;
      let inserted = 0;
      let errors = 0;
      
      for (let i = 0; i < allCrewToInsert.length; i += BATCH_SIZE) {
        const batch = allCrewToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('movie_crew').insert(batch);
        
        if (error) {
          console.error(`Error en batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
          errors++;
        } else {
          inserted += batch.length;
          if (inserted % 10000 === 0) {
            console.log(`  ${inserted} registros insertados...`);
          }
        }
      }
      
      console.log(`\n✅ ${inserted} registros insertados exitosamente`);
      if (errors > 0) {
        console.log(`⚠️ ${errors} lotes con errores`);
      }
    }

    // 7. Verificar "Tiempo de revancha"
    console.log('\n🔍 Verificando "Tiempo de revancha" (ID: 1737)...');
    const { data: tiempoCrew, count } = await supabase
      .from('movie_crew')
      .select('*, people(first_name, last_name), roles(name)', { count: 'exact' })
      .eq('movie_id', 1737)
      .order('billing_order');
    
    console.log(`  Crew: ${count} personas`);
    if (tiempoCrew && count > 0) {
      console.log('  Lista completa:');
      tiempoCrew.forEach(c => {
        const note = c.notes ? ` (${c.notes})` : '';
        console.log(`    ${c.billing_order}. ${c.people.first_name} ${c.people.last_name} - ${c.roles.name}${note}`);
      });
    }

    // 8. Resumen final
    const { count: totalCount } = await supabase
      .from('movie_crew')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 RESUMEN FINAL:');
    console.log(`  Total en movie_crew: ${totalCount}`);
    
    if (rolesNotFound.size > 0) {
      console.log(`\n⚠️ Roles no encontrados: ${rolesNotFound.size}`);
      await fs.writeFile('roles-not-found.json', JSON.stringify(Array.from(rolesNotFound), null, 2));
      console.log('  (Lista guardada en roles-not-found.json)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
migrateMovieCrew();