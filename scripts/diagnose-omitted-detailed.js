// scripts/diagnose-omitted-detailed.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');

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

async function diagnoseOmitted() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🔍 Diagnóstico detallado de omitidos...\n');

    // Cargar datos
    const { data: roles } = await supabase.from('roles').select('id, name');
    const rolesCache = new Map();
    roles.forEach(role => {
      rolesCache.set(role.name.toLowerCase().trim(), role.id);
    });

    const personIds = new Set();
    let offset = 0;
    while (true) {
      const { data } = await supabase.from('people').select('id').range(offset, offset + 999);
      if (!data || data.length === 0) break;
      data.forEach(p => personIds.add(p.id));
      if (data.length < 1000) break;
      offset += 1000;
    }

    const movieIds = new Set();
    offset = 0;
    while (true) {
      const { data } = await supabase.from('movies').select('id').range(offset, offset + 999);
      if (!data || data.length === 0) break;
      data.forEach(m => movieIds.add(m.id));
      if (data.length < 1000) break;
      offset += 1000;
    }

    console.log(`📊 ${roles.length} roles, ${personIds.size} personas, ${movieIds.size} películas en Supabase\n`);

    // Analizar TODAS las películas para encontrar patrones
    console.log('Analizando TODAS las películas para detectar omisiones...\n');

    const stats = {
      personNotFound: 0,
      roleNotFound: 0,
      movieNotFound: 0,
      duplicates: 0,
      noRole: 0,
      noPerson: 0
    };

    const rolesMissing = new Set();
    const peopleNotFound = new Set();
    const moviesNotFound = new Set();

    // Procesar en chunks
    const movieIdsArray = Array.from(movieIds);
    
    for (let chunk = 0; chunk < movieIdsArray.length; chunk += 1000) {
      const chunkIds = movieIdsArray.slice(chunk, chunk + 1000);
      
      if (chunk % 5000 === 0) {
        console.log(`  Procesando películas ${chunk} - ${Math.min(chunk + 1000, movieIdsArray.length)}...`);
      }

      const [data] = await connection.execute(`
        SELECT 
          post_id as movie_id,
          meta_key,
          meta_value
        FROM wp_postmeta
        WHERE post_id IN (${chunkIds.join(',')})
        AND meta_key LIKE 'ficha_tecnica_%'
      `);

      // Organizar por película
      const movieData = {};
      data.forEach(row => {
        if (!movieData[row.movie_id]) {
          movieData[row.movie_id] = {};
        }
        movieData[row.movie_id][row.meta_key] = row.meta_value;
      });

      // Analizar cada película
      for (const [movieId, fields] of Object.entries(movieData)) {
        const movieIdNum = parseInt(movieId);
        const uniqueInMovie = new Set();

        // Obtener departamentos
        const departments = new Set();
        Object.keys(fields).forEach(key => {
          if (key.match(/^ficha_tecnica_[^_]+$/) && !isNaN(fields[key]) && parseInt(fields[key]) > 0) {
            departments.add(key.replace('ficha_tecnica_', ''));
          }
          if (key.match(/^ficha_tecnica_[^_]+_import$/) && !isNaN(fields[key]) && parseInt(fields[key]) > 0) {
            departments.add(key.replace('ficha_tecnica_', '').replace('_import', ''));
          }
        });

        for (const dept of departments) {
          const normalCount = parseInt(fields[`ficha_tecnica_${dept}`] || 0);
          const importCount = parseInt(fields[`ficha_tecnica_${dept}_import`] || 0);
          const maxCount = Math.max(normalCount, importCount);

          for (let i = 0; i < maxCount; i++) {
            // Priorizar import
            let personValue = fields[`ficha_tecnica_${dept}_import_${i}_persona`] || 
                            fields[`ficha_tecnica_${dept}_${i}_persona`];
            let roleValue = fields[`ficha_tecnica_${dept}_import_${i}_rol`] || 
                           fields[`ficha_tecnica_${dept}_${i}_rol`];

            if (!personValue) continue;

            const personId = extractPersonId(personValue);
            
            // Analizar razón de omisión
            if (!personId) {
              stats.noPerson++;
            } else if (!personIds.has(personId)) {
              stats.personNotFound++;
              peopleNotFound.add(personId);
            } else if (!roleValue) {
              stats.noRole++;
            } else {
              const roleId = rolesCache.get(roleValue.toLowerCase().trim());
              if (!roleId) {
                stats.roleNotFound++;
                rolesMissing.add(roleValue);
              } else {
                const key = `${personId}-${roleId}`;
                if (uniqueInMovie.has(key)) {
                  stats.duplicates++;
                } else {
                  uniqueInMovie.add(key);
                }
              }
            }
          }
        }
      }
    }

    console.log('\n📊 RESUMEN DE OMISIONES:\n');
    console.log(`❌ Personas no encontradas: ${stats.personNotFound}`);
    if (peopleNotFound.size > 0) {
      console.log(`   IDs únicos: ${peopleNotFound.size}`);
      console.log(`   Primeros 10: ${Array.from(peopleNotFound).slice(0, 10).join(', ')}`);
    }

    console.log(`\n❌ Roles no encontrados: ${stats.roleNotFound}`);
    if (rolesMissing.size > 0) {
      console.log(`   Roles únicos faltantes: ${rolesMissing.size}`);
      Array.from(rolesMissing).slice(0, 20).forEach(role => {
        console.log(`   - "${role}"`);
      });
    }

    console.log(`\n❌ Duplicados (mismo persona-rol): ${stats.duplicates}`);
    console.log(`❌ Sin rol especificado: ${stats.noRole}`);
    console.log(`❌ Sin persona extraíble: ${stats.noPerson}`);

    console.log(`\n📝 TOTAL OMITIDOS ESPERADOS: ${stats.personNotFound + stats.roleNotFound + stats.duplicates + stats.noRole + stats.noPerson}`);

    // Si todavía hay roles faltantes, crear script para agregarlos
    if (rolesMissing.size > 0) {
      console.log('\n💡 Para crear los roles faltantes, ejecuta:');
      console.log('   node scripts/create-remaining-roles.js');
      
      // Guardar roles faltantes
      const fs = require('fs').promises;
      await fs.writeFile('remaining-roles.json', JSON.stringify(Array.from(rolesMissing), null, 2));
      console.log('\n   Lista guardada en remaining-roles.json');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

diagnoseOmitted();