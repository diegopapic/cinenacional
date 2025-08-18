// scripts/migrate-person-locations-to-supabase.js
// Script para migrar lugares de nacimiento y muerte de personas a Supabase

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  });
}

// Función para extraer IDs de strings serializados de PHP
function extractIdsFromSerialized(serializedStr) {
  try {
    if (!serializedStr || serializedStr === '' || serializedStr === '0') {
      return [];
    }
    
    const ids = [];
    const regex = /s:\d+:"(\d+)"/g;
    let match;
    
    while ((match = regex.exec(serializedStr)) !== null) {
      ids.push(parseInt(match[1]));
    }
    
    return ids;
  } catch (error) {
    console.error('Error procesando:', serializedStr, error.message);
    return [];
  }
}

async function migratePersonLocations() {
  console.log('=== MIGRACIÓN DE UBICACIONES DE PERSONAS A SUPABASE ===\n');

  let wpConnection;
  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  try {
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Primero, verificar que las ubicaciones existen en Supabase
    console.log('🔍 1. VERIFICANDO UBICACIONES EN SUPABASE\n');
    
    // Obtener algunas ubicaciones de ejemplo para verificar
    const { data: sampleLocations, error: locError } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', [11229, 11270, 7365, 7367])
      .limit(10);

    if (locError) {
      console.error('❌ Error verificando ubicaciones en Supabase:', locError);
      return;
    }

    console.log('Ubicaciones encontradas en Supabase:');
    sampleLocations.forEach(loc => {
      console.log(`  ✅ ID ${loc.id}: ${loc.name}`);
    });

    // 2. Obtener todas las personas con ubicaciones
    console.log('\n📋 2. OBTENIENDO PERSONAS CON UBICACIONES DE WORDPRESS\n');
    
    const [persons] = await wpConnection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        lnac.meta_value as lugar_nacimiento,
        lmue.meta_value as lugar_muerte
      FROM wp_posts p
      LEFT JOIN wp_postmeta lnac ON p.ID = lnac.post_id AND lnac.meta_key = 'lugar_nacimiento'
      LEFT JOIN wp_postmeta lmue ON p.ID = lmue.post_id AND lmue.meta_key = 'lugar_muerte'
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND (
        (lnac.meta_value IS NOT NULL AND lnac.meta_value != '' AND lnac.meta_value != '0')
        OR 
        (lmue.meta_value IS NOT NULL AND lmue.meta_value != '' AND lmue.meta_value != '0')
      )
      ORDER BY p.ID
    `);

    console.log(`Total de personas con ubicaciones: ${persons.length}\n`);

    // 3. Procesar cada persona
    console.log('🔄 3. PROCESANDO PERSONAS\n');
    
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < persons.length; i += batchSize) {
      batches.push(persons.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\nProcesando batch ${batchIndex + 1}/${batches.length} (${batch.length} personas)...`);
      
      const updates = [];
      
      for (const person of batch) {
        processedCount++;
        
        // Extraer IDs de ubicaciones
        const birthLocationIds = extractIdsFromSerialized(person.lugar_nacimiento);
        const deathLocationIds = extractIdsFromSerialized(person.lugar_muerte);
        
        // Tomar el primer ID (el más específico) si hay múltiples
        const birthLocationId = birthLocationIds.length > 0 ? birthLocationIds[0] : null;
        const deathLocationId = deathLocationIds.length > 0 ? deathLocationIds[0] : null;
        
        if (birthLocationId || deathLocationId) {
          updates.push({
            wordpressId: person.ID,
            name: person.post_title,
            birthLocationId,
            deathLocationId
          });
        }
        
        // Mostrar progreso cada 100 personas
        if (processedCount % 100 === 0) {
          console.log(`  Procesadas: ${processedCount} personas...`);
        }
      }
      
      // Actualizar en Supabase
      if (updates.length > 0) {
        for (const update of updates) {
          try {
            // Primero verificar si la persona existe en Supabase
            const { data: existingPerson, error: fetchError } = await supabase
              .from('people')
              .select('id')
              .eq('wordpressId', update.wordpressId)
              .single();
            
            if (fetchError) {
              // Si no existe, podríamos crearla o simplemente registrar
              console.log(`  ⚠️  Persona no encontrada en Supabase: ${update.name} (WP ID: ${update.wordpressId})`);
              continue;
            }
            
            // Actualizar la persona con las ubicaciones
            const updateData = {};
            if (update.birthLocationId) updateData.birthLocationId = update.birthLocationId;
            if (update.deathLocationId) updateData.deathLocationId = update.deathLocationId;
            
            const { error: updateError } = await supabase
              .from('people')
              .update(updateData)
              .eq('id', existingPerson.id);
            
            if (updateError) {
              console.error(`  ❌ Error actualizando ${update.name}:`, updateError.message);
              errorCount++;
            } else {
              updatedCount++;
              
              // Mostrar algunos ejemplos
              if (updatedCount <= 5) {
                console.log(`  ✅ Actualizado: ${update.name}`);
                if (update.birthLocationId) console.log(`     - Lugar nacimiento ID: ${update.birthLocationId}`);
                if (update.deathLocationId) console.log(`     - Lugar muerte ID: ${update.deathLocationId}`);
              }
            }
          } catch (error) {
            console.error(`  ❌ Error procesando ${update.name}:`, error.message);
            errorCount++;
          }
        }
      }
    }

    // 4. Verificar algunas personas específicas
    console.log('\n🔍 4. VERIFICANDO PERSONAS ESPECÍFICAS\n');
    
    const testNames = ['Jorge Luis Borges', 'Julio Cortázar', 'Graciela Borges'];
    
    for (const name of testNames) {
      const { data: person, error } = await supabase
        .from('people')
        .select(`
          id,
          firstName,
          lastName,
          birthLocationId,
          deathLocationId,
          birthLocation:locations!birthLocationId(id, name),
          deathLocation:locations!deathLocationId(id, name)
        `)
        .or(`firstName.ilike.%${name.split(' ')[0]}%,lastName.ilike.%${name.split(' ').slice(-1)[0]}%`)
        .limit(1)
        .single();
      
      if (!error && person) {
        console.log(`\n${person.firstName} ${person.lastName}:`);
        if (person.birthLocation) {
          console.log(`  📍 Lugar de nacimiento: ${person.birthLocation.name}`);
        }
        if (person.deathLocation) {
          console.log(`  ⚰️  Lugar de muerte: ${person.deathLocation.name}`);
        }
      }
    }

    // 5. Resumen final
    console.log('\n📊 5. RESUMEN DE LA MIGRACIÓN\n');
    console.log(`Total procesadas: ${processedCount} personas`);
    console.log(`✅ Actualizadas exitosamente: ${updatedCount} personas`);
    console.log(`❌ Errores: ${errorCount} personas`);
    
    // Estadísticas de Supabase
    const { count: totalWithBirth } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('birthLocationId', 'is', null);
    
    const { count: totalWithDeath } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('deathLocationId', 'is', null);
    
    console.log(`\nEn Supabase ahora:`);
    console.log(`  • Personas con lugar de nacimiento: ${totalWithBirth || 0}`);
    console.log(`  • Personas con lugar de muerte: ${totalWithDeath || 0}`);

    console.log('\n✅ MIGRACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migratePersonLocations().catch(console.error);
}

module.exports = { migratePersonLocations };