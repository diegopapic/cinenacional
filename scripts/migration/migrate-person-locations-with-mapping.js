// scripts/migrate-person-locations-batch-fixed.js
// Script corregido - usa UPDATE en lugar de UPSERT

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración Supabase
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
    return [];
  }
}

// Función para obtener TODAS las ubicaciones de Supabase
async function getAllSupabaseLocations() {
  const allLocations = [];
  let start = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, slug')
      .range(start, start + pageSize - 1)
      .order('id');
    
    if (error) {
      console.error('Error obteniendo ubicaciones:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allLocations.push(...data);
      start += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  return allLocations;
}

// Función para obtener TODAS las personas de Supabase
async function getAllSupabasePeople() {
  console.log('Obteniendo todas las personas de Supabase...');
  const allPeople = [];
  let start = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('people')
      .select('id, slug, first_name, last_name')
      .range(start, start + pageSize - 1)
      .order('id');
    
    if (error) {
      console.error('Error obteniendo personas:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allPeople.push(...data);
      if (allPeople.length % 10000 === 0) {
        console.log(`  • Obtenidas ${allPeople.length} personas...`);
      }
      start += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`  • Total: ${allPeople.length} personas obtenidas\n`);
  return allPeople;
}

async function migratePersonLocations() {
  console.log('=== MIGRACIÓN BATCH DE UBICACIONES DE PERSONAS ===\n');
  
  let wpConnection;
  
  try {
    const startTime = Date.now();
    
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Obtener mapeo de ubicaciones
    console.log('📍 1. CREANDO MAPEO DE UBICACIONES\n');
    
    const [wpLocations] = await wpConnection.execute(`
      SELECT 
        t.term_id as wp_id,
        t.name,
        t.slug
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
    `);

    console.log(`  • ${wpLocations.length} ubicaciones de WordPress\n`);

    const wpLocationMap = new Map();
    wpLocations.forEach(loc => {
      wpLocationMap.set(loc.wp_id, {
        name: loc.name,
        slug: loc.slug
      });
    });

    // 2. Obtener todas las ubicaciones de Supabase
    console.log('🗺️ 2. OBTENIENDO UBICACIONES DE SUPABASE\n');
    const supabaseLocations = await getAllSupabaseLocations();
    console.log(`  • ${supabaseLocations.length} ubicaciones de Supabase\n`);

    // Crear mapas para búsqueda rápida
    const supabaseByName = new Map();
    const supabaseBySlug = new Map();
    
    supabaseLocations.forEach(loc => {
      supabaseByName.set(loc.name.toLowerCase(), loc.id);
      supabaseBySlug.set(loc.slug, loc.id);
      if (loc.name.includes('(')) {
        const nameWithoutParenthesis = loc.name.split('(')[0].trim().toLowerCase();
        if (!supabaseByName.has(nameWithoutParenthesis)) {
          supabaseByName.set(nameWithoutParenthesis, loc.id);
        }
      }
    });

    // Función para mapear
    function mapWpIdToSupabaseId(wpId) {
      const wpLocation = wpLocationMap.get(wpId);
      if (!wpLocation) return null;
      
      return supabaseByName.get(wpLocation.name.toLowerCase()) ||
             supabaseBySlug.get(wpLocation.slug) ||
             null;
    }

    // 3. Obtener TODAS las personas con ubicaciones de WordPress
    console.log('👥 3. OBTENIENDO TODAS LAS PERSONAS DE WORDPRESS\n');
    
    const [wpPeople] = await wpConnection.execute(`
      SELECT 
        p.ID as wp_id,
        p.post_title as name,
        MAX(CASE WHEN pm.meta_key = 'slug' THEN pm.meta_value END) as slug,
        MAX(CASE WHEN pm.meta_key = 'lugar_nacimiento' THEN pm.meta_value END) as lugar_nacimiento,
        MAX(CASE WHEN pm.meta_key = 'lugar_muerte' THEN pm.meta_value END) as lugar_muerte
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id 
        AND pm.meta_key IN ('slug', 'lugar_nacimiento', 'lugar_muerte')
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      GROUP BY p.ID
      HAVING lugar_nacimiento IS NOT NULL 
         OR lugar_muerte IS NOT NULL
    `);
    
    console.log(`  • ${wpPeople.length} personas con ubicaciones en WordPress\n`);

    // 4. Obtener TODAS las personas de Supabase
    console.log('🔍 4. OBTENIENDO TODAS LAS PERSONAS DE SUPABASE\n');
    const supabasePeople = await getAllSupabasePeople();
    
    // Crear mapa para búsqueda rápida
    const supabasePeopleBySlug = new Map();
    const supabasePeopleByName = new Map();
    
    supabasePeople.forEach(person => {
      if (person.slug) {
        supabasePeopleBySlug.set(person.slug, person.id);
      }
      const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim().toLowerCase();
      if (fullName) {
        supabasePeopleByName.set(fullName, person.id);
      }
    });

    // 5. Procesar y preparar actualizaciones
    console.log('⚙️ 5. PROCESANDO MAPEOS\n');
    
    const updates = [];
    let mappedCount = 0;
    let notFoundCount = 0;
    
    for (const wpPerson of wpPeople) {
      // Generar slug si no existe
      let personSlug = wpPerson.slug;
      if (!personSlug && wpPerson.name) {
        personSlug = wpPerson.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
      }
      
      // Buscar ID de la persona en Supabase
      let supabasePersonId = null;
      if (personSlug) {
        supabasePersonId = supabasePeopleBySlug.get(personSlug);
      }
      if (!supabasePersonId && wpPerson.name) {
        supabasePersonId = supabasePeopleByName.get(wpPerson.name.toLowerCase());
      }
      
      if (supabasePersonId) {
        // Mapear ubicaciones
        const birthWpIds = extractIdsFromSerialized(wpPerson.lugar_nacimiento);
        const deathWpIds = extractIdsFromSerialized(wpPerson.lugar_muerte);
        
        const birthSupabaseId = birthWpIds.length > 0 ? mapWpIdToSupabaseId(birthWpIds[0]) : null;
        const deathSupabaseId = deathWpIds.length > 0 ? mapWpIdToSupabaseId(deathWpIds[0]) : null;
        
        if (birthSupabaseId || deathSupabaseId) {
          updates.push({
            id: supabasePersonId,
            birthLocationId: birthSupabaseId,
            deathLocationId: deathSupabaseId
          });
          mappedCount++;
        }
      } else {
        notFoundCount++;
        if (notFoundCount <= 10) {
          console.log(`  ⚠️ No encontrada: ${wpPerson.name}`);
        }
      }
      
      // Mostrar progreso
      if ((mappedCount + notFoundCount) % 1000 === 0) {
        console.log(`  Procesadas: ${mappedCount + notFoundCount}/${wpPeople.length}`);
      }
    }
    
    console.log(`\n  ✅ Mapeadas: ${mappedCount} personas`);
    console.log(`  ⚠️ No encontradas: ${notFoundCount} personas\n`);

    // 6. Actualizar en Supabase en batches
    if (updates.length > 0) {
      console.log('💾 6. ACTUALIZANDO EN SUPABASE\n');
      
      const batchSize = 100; // Reducido para ser más conservador
      let updatedTotal = 0;
      let errorCount = 0;
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const batchNum = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(updates.length/batchSize);
        
        // Actualizar cada registro individualmente en el batch
        let batchSuccess = 0;
        let batchErrors = 0;
        
        for (const update of batch) {
          try {
            const updateData = {};
            if (update.birthLocationId) updateData.birth_location_id = update.birthLocationId;
            if (update.deathLocationId) updateData.death_location_id = update.deathLocationId;
            
            const { error } = await supabase
              .from('people')
              .update(updateData)
              .eq('id', update.id);
            
            if (error) {
              batchErrors++;
              errorCount++;
              if (errorCount <= 5) {
                console.error(`    ❌ Error actualizando ID ${update.id}:`, error.message);
              }
            } else {
              batchSuccess++;
              updatedTotal++;
            }
          } catch (error) {
            batchErrors++;
            errorCount++;
          }
        }
        
        console.log(`  Batch ${batchNum}/${totalBatches}: ✅ ${batchSuccess} actualizadas, ❌ ${batchErrors} errores`);
      }
      
      console.log(`\n  Total actualizado: ${updatedTotal} personas`);
      if (errorCount > 0) {
        console.log(`  Total errores: ${errorCount} personas`);
      }
    }

    // 7. Verificación final - contar cuántas personas tienen ubicaciones ahora
    console.log('\n🔍 7. VERIFICACIÓN FINAL\n');
    
    const { count: withBirth } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('birth_location_id', 'is', null);
    
    const { count: withDeath } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('death_location_id', 'is', null);
    
    console.log(`  Personas con lugar de nacimiento: ${withBirth || 0}`);
    console.log(`  Personas con lugar de muerte: ${withDeath || 0}`);

    // 8. Resumen final
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 8. RESUMEN FINAL\n');
    console.log(`✅ Migración completada en ${duration.toFixed(1)} segundos`);
    console.log(`📍 ${mappedCount} personas con ubicaciones mapeadas`);
    console.log(`💾 ${updatedTotal} personas actualizadas en Supabase`);
    console.log(`⚠️ ${notFoundCount} personas no encontradas en Supabase`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errores durante la actualización`);
    }

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

// Ejecutar
migratePersonLocations().catch(console.error);