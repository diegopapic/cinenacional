// scripts/diagnose-crew-omitted-fixed.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');
const fs = require('fs').promises;

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
    console.log('🔍 Diagnosticando registros omitidos...\n');

    // Cargar datos necesarios
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

    console.log(`📊 ${roles.length} roles y ${personIds.size} personas en Supabase\n`);

    // Primero obtener IDs de películas
    const [movieIds] = await connection.execute(`
      SELECT ID 
      FROM wp_posts 
      WHERE post_type = 'pelicula'
      AND post_status = 'publish'
      LIMIT 200
    `);
    
    const movieIdList = movieIds.map(m => m.ID).join(',');
    
    // Luego obtener los datos de crew
    const [sampleData] = await connection.execute(`
      SELECT 
        post_id as movie_id,
        meta_key,
        meta_value
      FROM wp_postmeta
      WHERE post_id IN (${movieIdList})
      AND meta_key LIKE 'ficha_tecnica_%'
      AND (
        meta_key LIKE '%_persona'
        OR meta_key LIKE '%_rol'
      )
    `);

    console.log(`Analizando ${sampleData.length} registros de ${movieIds.length} películas...\n`);

    const omittedReasons = {
      personNotFound: [],
      roleNotFound: [],
      noRole: [],
      noPerson: [],
      duplicates: []
    };

    // Organizar y analizar
    const movieData = {};
    sampleData.forEach(row => {
      if (!movieData[row.movie_id]) {
        movieData[row.movie_id] = {};
      }
      movieData[row.movie_id][row.meta_key] = row.meta_value;
    });

    const uniqueRolesNotFound = new Set();
    const personIdsNotFound = new Set();

    for (const [movieId, data] of Object.entries(movieData)) {
      const processedCombos = new Set();
      
      Object.keys(data).forEach(key => {
        if (key.endsWith('_persona')) {
          const personValue = data[key];
          const roleKey = key.replace('_persona', '_rol');
          const roleValue = data[roleKey];
          
          const personId = extractPersonId(personValue);
          
          if (!personId) {
            // No se pudo extraer el ID
            if (personValue && personValue !== '') {
              omittedReasons.noPerson.push({
                movieId,
                key,
                value: personValue.substring(0, 100)
              });
            }
          } else if (!personIds.has(personId)) {
            // Persona no existe en Supabase
            personIdsNotFound.add(personId);
            omittedReasons.personNotFound.push({
              movieId,
              personId,
              role: roleValue
            });
          } else if (!roleValue || roleValue === '') {
            // No hay rol
            omittedReasons.noRole.push({
              movieId,
              personId,
              key
            });
          } else {
            const roleId = rolesCache.get(roleValue.toLowerCase().trim());
            
            if (!roleId) {
              // Rol no encontrado
              uniqueRolesNotFound.add(roleValue);
              omittedReasons.roleNotFound.push({
                movieId,
                personId,
                role: roleValue
              });
            } else {
              // Verificar duplicados
              const combo = `${personId}-${roleId}`;
              if (processedCombos.has(combo)) {
                omittedReasons.duplicates.push({
                  movieId,
                  personId,
                  role: roleValue
                });
              }
              processedCombos.add(combo);
            }
          }
        }
      });
    }

    console.log('📋 Razones de omisión encontradas:\n');
    
    console.log(`❌ Personas no encontradas en Supabase: ${omittedReasons.personNotFound.length}`);
    if (omittedReasons.personNotFound.length > 0) {
      console.log(`  IDs únicos no encontrados: ${personIdsNotFound.size}`);
      console.log('  Primeros 10 IDs:');
      Array.from(personIdsNotFound).slice(0, 10).forEach(id => {
        console.log(`    - ID ${id}`);
      });
    }

    console.log(`\n❌ Roles no encontrados: ${omittedReasons.roleNotFound.length}`);
    if (uniqueRolesNotFound.size > 0) {
      console.log(`  Roles únicos no encontrados: ${uniqueRolesNotFound.size}`);
      console.log('  Primeros 20:');
      Array.from(uniqueRolesNotFound).slice(0, 20).forEach(role => {
        console.log(`    - "${role}"`);
      });
    }

    console.log(`\n❌ Sin rol especificado: ${omittedReasons.noRole.length}`);
    
    console.log(`\n❌ No se pudo extraer ID de persona: ${omittedReasons.noPerson.length}`);
    if (omittedReasons.noPerson.length > 0) {
      console.log('  Ejemplos de valores problemáticos:');
      omittedReasons.noPerson.slice(0, 5).forEach(o => {
        console.log(`    - ${o.key}: ${o.value}`);
      });
    }

    console.log(`\n❌ Duplicados (mismo persona-rol): ${omittedReasons.duplicates.length}`);

    // Guardar detalles
    await fs.writeFile('crew-omitted-diagnosis.json', JSON.stringify({
      summary: {
        personNotFound: omittedReasons.personNotFound.length,
        roleNotFound: omittedReasons.roleNotFound.length,
        noRole: omittedReasons.noRole.length,
        noPerson: omittedReasons.noPerson.length,
        duplicates: omittedReasons.duplicates.length,
        uniquePersonsNotFound: Array.from(personIdsNotFound),
        uniqueRolesNotFound: Array.from(uniqueRolesNotFound)
      },
      details: omittedReasons
    }, null, 2));
    
    console.log('\n📝 Detalles completos guardados en crew-omitted-diagnosis.json');

    // Proyección total
    if (sampleData.length > 0) {
      const sampleOmitted = omittedReasons.personNotFound.length + 
                          omittedReasons.roleNotFound.length + 
                          omittedReasons.noRole.length + 
                          omittedReasons.noPerson.length +
                          omittedReasons.duplicates.length;
      
      console.log(`\n📊 Proyección basada en muestra:`);
      console.log(`  En ${movieIds.length} películas: ${sampleOmitted} omitidos`);
      console.log(`  Tasa de omisión: ${(sampleOmitted / sampleData.length * 100).toFixed(2)}%`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

diagnoseOmitted();