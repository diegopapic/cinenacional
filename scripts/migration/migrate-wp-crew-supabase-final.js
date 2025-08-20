// scripts/migrate-wp-crew-with-import.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');
const fs = require('fs').promises;

// Configuración Supabase
const SUPABASE_URL = 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función para extraer el ID de persona del valor serializado
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
    console.log('🚀 Iniciando migración del crew con manejo de import...\n');

    // 1. Cargar roles de Supabase
    console.log('📚 Cargando roles...');
    const { data: roles } = await supabase.from('roles').select('id, name');
    const rolesCache = new Map();
    roles.forEach(role => {
      rolesCache.set(role.name.toLowerCase().trim(), role.id);
    });
    console.log(`✅ ${roles.length} roles cargados`);

    // 2. Cargar IDs de películas y personas existentes
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
    console.log(`  ${movieIds.size} películas en Supabase`);
    
    const personIds = new Set();
    offset = 0;
    while (true) {
      const { data } = await supabase.from('people').select('id').range(offset, offset + 999);
      if (!data || data.length === 0) break;
      data.forEach(p => personIds.add(p.id));
      if (data.length < 1000) break;
      offset += 1000;
    }
    console.log(`  ${personIds.size} personas en Supabase`);

    // 3. Obtener TODOS los registros de crew de WordPress
    console.log('\n🔍 Obteniendo todos los datos de crew de WordPress...');
    
    // Dividir en chunks para evitar problemas de memoria
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
        AND (
          meta_key LIKE '%_persona'
          OR meta_key LIKE '%_rol'
          OR meta_key LIKE '%_acreditado_con_su'
          OR meta_key LIKE '%_comentario'
        )
      `);
      
      allCrewData.push(...data);
    }
    
    console.log(`  ${allCrewData.length} registros totales encontrados`);

    // 4. Organizar todos los datos
    console.log('\n📋 Organizando datos...');
    
    const movieCrewData = {};
    allCrewData.forEach(row => {
      if (!movieCrewData[row.movie_id]) {
        movieCrewData[row.movie_id] = {};
      }
      movieCrewData[row.movie_id][row.meta_key] = row.meta_value;
    });
    
    console.log(`  ${Object.keys(movieCrewData).length} películas con datos de crew`);

    // 5. Procesar con lógica de import
    console.log('\n⚙️ Procesando registros con lógica de import...');
    
    const allCrewToInsert = [];
    const conflicts = [];
    const rolesNotFound = new Set();
    const uniqueKeys = new Set();
    
    let normalOnly = 0;
    let importOnly = 0;
    let duplicates = 0;
    let conflictCount = 0;
    let skipped = 0;

    for (const [movieId, data] of Object.entries(movieCrewData)) {
      const movieIdNum = parseInt(movieId);
      
      // Encontrar todos los campos de persona (normales y de import)
      const personKeys = Object.keys(data).filter(k => k.endsWith('_persona'));
      
      // Separar en normales e import
      const normalKeys = personKeys.filter(k => !k.includes('_import_'));
      const importKeys = personKeys.filter(k => k.includes('_import_'));
      
      // Procesar todos los campos posibles
      const processedKeys = new Set();
      
      // Primero procesar los normales
      for (const personKey of normalKeys) {
        const match = personKey.match(/^ficha_tecnica_(.+)_(\d+)_persona$/);
        if (!match) continue;
        
        const department = match[1];
        const index = match[2];
        const keyBase = `${department}_${index}`;
        
        if (processedKeys.has(keyBase)) continue;
        processedKeys.add(keyBase);
        
        // Obtener datos normales
        const normalPerson = data[`ficha_tecnica_${department}_${index}_persona`];
        const normalRole = data[`ficha_tecnica_${department}_${index}_rol`];
        const normalCredited = data[`ficha_tecnica_${department}_${index}_acreditado_con_su`];
        const normalComment = data[`ficha_tecnica_${department}_${index}_comentario`];
        
        // Obtener datos import
        const importPerson = data[`ficha_tecnica_${department}_import_${index}_persona`];
        const importRole = data[`ficha_tecnica_${department}_import_${index}_rol`];
        const importCredited = data[`ficha_tecnica_${department}_import_${index}_acreditado_con_su`];
        
        // Decidir qué datos usar
        let usePersonId = null;
        let useRole = null;
        let useCredited = null;
        let useComment = normalComment; // El comentario solo está en normal
        let source = null;
        
        const normalPersonId = extractPersonId(normalPerson);
        const importPersonId = extractPersonId(importPerson);
        
        if (normalPersonId && importPersonId) {
          // Ambos existen, verificar si son iguales
          if (normalPersonId === importPersonId && 
              normalRole === importRole && 
              normalCredited === importCredited) {
            // Son iguales, usar normal
            usePersonId = normalPersonId;
            useRole = normalRole;
            useCredited = normalCredited;
            source = 'duplicate';
            duplicates++;
          } else {
            // CONFLICTO: son diferentes
            conflicts.push({
              movieId: movieIdNum,
              department: department,
              index: index,
              normal: {
                personId: normalPersonId,
                role: normalRole,
                credited: normalCredited,
                comment: normalComment
              },
              import: {
                personId: importPersonId,
                role: importRole,
                credited: importCredited
              }
            });
            conflictCount++;
            continue; // Saltar este registro
          }
        } else if (normalPersonId) {
          // Solo existe el normal
          usePersonId = normalPersonId;
          useRole = normalRole;
          useCredited = normalCredited;
          source = 'normal';
          normalOnly++;
        } else if (importPersonId) {
          // Solo existe el import
          usePersonId = importPersonId;
          useRole = importRole;
          useCredited = importCredited;
          source = 'import';
          importOnly++;
        } else {
          // No hay datos
          continue;
        }
        
        // Verificar que la persona existe en Supabase
        if (!personIds.has(usePersonId)) {
          skipped++;
          continue;
        }
        
        // Verificar que tenemos un rol
        if (!useRole) {
          skipped++;
          continue;
        }
        
        // Buscar el rol en el cache
        const roleId = rolesCache.get(useRole.toLowerCase().trim());
        if (!roleId) {
          rolesNotFound.add(useRole);
          skipped++;
          continue;
        }
        
        // Crear clave única para evitar duplicados
        const uniqueKey = `${movieIdNum}-${usePersonId}-${roleId}`;
        if (uniqueKeys.has(uniqueKey)) {
          skipped++;
          continue;
        }
        uniqueKeys.add(uniqueKey);
        
        // Preparar nota
        let notes = useComment;
        if (useCredited && useCredited !== '2' && useCredited !== '1') {
          notes = notes ? `Acreditado como: ${useCredited}. ${notes}` : `Acreditado como: ${useCredited}`;
        }
        
        // Agregar al array para insertar
        allCrewToInsert.push({
          movie_id: movieIdNum,
          person_id: usePersonId,
          role_id: roleId,
          billing_order: parseInt(index) + 1,
          notes: notes || null
        });
      }
      
      // Procesar los import que no tienen normal correspondiente
      for (const personKey of importKeys) {
        const match = personKey.match(/^ficha_tecnica_(.+)_import_(\d+)_persona$/);
        if (!match) continue;
        
        const department = match[1];
        const index = match[2];
        const keyBase = `${department}_${index}`;
        
        if (processedKeys.has(keyBase)) continue;
        processedKeys.add(keyBase);
        
        // Solo datos import (no hay normal)
        const importPerson = data[`ficha_tecnica_${department}_import_${index}_persona`];
        const importRole = data[`ficha_tecnica_${department}_import_${index}_rol`];
        const importCredited = data[`ficha_tecnica_${department}_import_${index}_acreditado_con_su`];
        
        const personId = extractPersonId(importPerson);
        if (!personId || !personIds.has(personId)) {
          skipped++;
          continue;
        }
        
        if (!importRole) {
          skipped++;
          continue;
        }
        
        const roleId = rolesCache.get(importRole.toLowerCase().trim());
        if (!roleId) {
          rolesNotFound.add(importRole);
          skipped++;
          continue;
        }
        
        const uniqueKey = `${movieIdNum}-${personId}-${roleId}`;
        if (uniqueKeys.has(uniqueKey)) {
          skipped++;
          continue;
        }
        uniqueKeys.add(uniqueKey);
        
        let notes = null;
        if (importCredited && importCredited !== '2' && importCredited !== '1') {
          notes = `Acreditado como: ${importCredited}`;
        }
        
        allCrewToInsert.push({
          movie_id: movieIdNum,
          person_id: personId,
          role_id: roleId,
          billing_order: parseInt(index) + 1,
          notes: notes
        });
        
        importOnly++;
      }
    }
    
    console.log(`\n📊 Análisis de datos:`);
    console.log(`  ✅ Solo en normal: ${normalOnly}`);
    console.log(`  ✅ Solo en import: ${importOnly}`);
    console.log(`  ✅ Duplicados (idénticos): ${duplicates}`);
    console.log(`  ❌ Conflictos: ${conflictCount}`);
    console.log(`  ⚠️ Omitidos: ${skipped}`);
    console.log(`  📝 Total a insertar: ${allCrewToInsert.length}`);

    // Guardar conflictos
    if (conflicts.length > 0) {
      await fs.writeFile('crew-conflicts.json', JSON.stringify(conflicts, null, 2));
      console.log(`\n📝 ${conflicts.length} conflictos guardados en crew-conflicts.json`);
      
      // Mostrar algunos ejemplos
      console.log('\nEjemplos de conflictos:');
      conflicts.slice(0, 3).forEach(c => {
        console.log(`  Película ${c.movieId}, ${c.department}[${c.index}]:`);
        console.log(`    Normal: Persona ${c.normal.personId}, Rol "${c.normal.role}"`);
        console.log(`    Import: Persona ${c.import.personId}, Rol "${c.import.role}"`);
      });
    }

    // 6. Limpiar tabla e insertar
    if (allCrewToInsert.length > 0) {
      console.log('\n🗑️ Limpiando tabla movie_crew...');
      await supabase.from('movie_crew').delete().gte('id', 0);
      
      console.log('📝 Insertando registros...');
      
      const BATCH_SIZE = 500;
      let inserted = 0;
      
      for (let i = 0; i < allCrewToInsert.length; i += BATCH_SIZE) {
        const batch = allCrewToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('movie_crew').insert(batch);
        
        if (error) {
          console.error(`Error en batch:`, error.message);
        } else {
          inserted += batch.length;
          if (inserted % 10000 === 0) {
            console.log(`  ${inserted} registros insertados...`);
          }
        }
      }
      
      console.log(`\n✅ ${inserted} registros insertados exitosamente`);
    }

    // 7. Verificación
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