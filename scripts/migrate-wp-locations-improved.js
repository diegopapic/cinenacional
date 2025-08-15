const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });

// Configuración de WordPress MySQL
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajustar según tu configuración
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

// Configuración Supabase - COPIADA EXACTAMENTE del script general
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapas y estadísticas
const locationIdMap = new Map();
const skippedLocations = [];
const anomalies = [];

async function migrateLocationsImproved() {
  let wpConnection;
  
  try {
    // Conectar a WordPress
    wpConnection = await mysql.createConnection(wpConfig);
    console.log('✅ Conectado a WordPress MySQL\n');

    // 1. Limpiar tabla de locations existente (opcional)
    console.log('🧹 Limpiando tabla locations...');
    const { error: deleteError } = await supabase
      .from('locations')
      .delete()
      .neq('id', 0);
    
    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('Error limpiando locations:', deleteError);
    }

    // 2. Obtener todas las localidades
    console.log('\n📍 Obteniendo localidades de WordPress...');
    const [locations] = await wpConnection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
      ORDER BY t.term_id
    `);

    console.log(`Total de localidades encontradas: ${locations.length}\n`);

    // 3. Crear un mapa de localidades por ID para búsqueda rápida
    const locationsMap = new Map();
    locations.forEach(loc => locationsMap.set(loc.term_id, loc));

    // 4. Función mejorada para calcular profundidad
    const getDepth = (locationId, visited = new Set()) => {
      if (visited.has(locationId)) {
        return -1; // Ciclo detectado
      }
      visited.add(locationId);
      
      const location = locationsMap.get(locationId);
      if (!location) return -1;
      if (location.parent === 0) return 0;
      
      const parentDepth = getDepth(location.parent, visited);
      return parentDepth === -1 ? -1 : parentDepth + 1;
    };

    // 5. Analizar profundidades y detectar anomalías
    console.log('📊 Analizando estructura jerárquica...');
    const depthAnalysis = {};
    let maxDepth = 0;
    
    locations.forEach(location => {
      const depth = getDepth(location.term_id);
      if (depth === -1) {
        anomalies.push({
          location: location.name,
          id: location.term_id,
          issue: 'Ciclo detectado o padre inexistente'
        });
      } else {
        if (!depthAnalysis[depth]) depthAnalysis[depth] = 0;
        depthAnalysis[depth]++;
        maxDepth = Math.max(maxDepth, depth);
      }
    });

    console.log('\nDistribución por niveles:');
    Object.entries(depthAnalysis).forEach(([depth, count]) => {
      console.log(`  Nivel ${depth}: ${count} localidades`);
    });

    // 6. Migrar usando orden topológico (padres antes que hijos)
    console.log('\n🔄 Iniciando migración con orden topológico...');
    
    // Crear lista ordenada por dependencias
    const migrationOrder = [];
    const processed = new Set();
    
    const addToOrder = (locationId) => {
      if (processed.has(locationId)) return;
      
      const location = locationsMap.get(locationId);
      if (!location) return;
      
      // Primero agregar el padre si existe
      if (location.parent !== 0 && locationsMap.has(location.parent)) {
        addToOrder(location.parent);
      }
      
      // Luego agregar esta localidad
      migrationOrder.push(location);
      processed.add(locationId);
    };
    
    // Procesar todas las localidades
    locations.forEach(loc => addToOrder(loc.term_id));
    
    console.log(`\nOrden de migración determinado: ${migrationOrder.length} localidades`);

    // 7. Migrar en orden
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const location of migrationOrder) {
      try {
        // Obtener el ID del padre en Supabase
        let parentId = null;
        if (location.parent > 0) {
          parentId = locationIdMap.get(location.parent);
          if (!parentId) {
            skippedLocations.push({
              name: location.name,
              id: location.term_id,
              parentId: location.parent,
              reason: 'Padre no encontrado en el mapeo'
            });
            skippedCount++;
            continue;
          }
        }

        // Insertar en Supabase
        const { data, error } = await supabase
          .from('locations')
          .insert({
            name: location.name,
            slug: location.slug,
            parent_id: parentId
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error insertando ${location.name}:`, error.message);
          skippedLocations.push({
            name: location.name,
            id: location.term_id,
            error: error.message
          });
          skippedCount++;
        } else {
          locationIdMap.set(location.term_id, data.id);
          migratedCount++;
          
          // Mostrar progreso cada 100 registros
          if (migratedCount % 100 === 0) {
            console.log(`   ✅ ${migratedCount} localidades migradas...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error procesando ${location.name}:`, err.message);
        skippedCount++;
      }
    }

    // 8. Reporte final
    console.log('\n📊 RESUMEN DE MIGRACIÓN:');
    console.log(`✅ Localidades migradas exitosamente: ${migratedCount}`);
    console.log(`⚠️  Localidades saltadas: ${skippedCount}`);
    console.log(`🔍 Anomalías detectadas: ${anomalies.length}`);

    // 9. Guardar mapeo de IDs
    console.log('\n💾 Guardando mapeo de IDs...');
    const mapData = Object.fromEntries(locationIdMap);
    fs.writeFileSync(
      'location-id-mapping.json', 
      JSON.stringify(mapData, null, 2)
    );
    console.log('✅ Mapeo guardado en: scripts/location-id-mapping.json');

    // 10. Guardar reporte de problemas
    if (skippedLocations.length > 0 || anomalies.length > 0) {
      console.log('\n📝 Guardando reporte de problemas...');
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total: locations.length,
          migrated: migratedCount,
          skipped: skippedCount,
          anomalies: anomalies.length
        },
        skippedLocations,
        anomalies,
        depthAnalysis
      };
      
      fs.writeFileSync(
        'location-migration-report.json',
        JSON.stringify(report, null, 2)
      );
      console.log('✅ Reporte guardado en: scripts/location-migration-report.json');
    }

    // 11. Mostrar ejemplos de jerarquía
    console.log('\n📍 EJEMPLOS DE JERARQUÍA MIGRADA:');
    
    // Argentina
    const { data: argentina } = await supabase
      .from('locations')
      .select('id, name')
      .eq('slug', 'argentina')
      .single();
    
    if (argentina) {
      const { data: provinces } = await supabase
        .from('locations')
        .select('id, name')
        .eq('parent_id', argentina.id)
        .limit(3);
      
      console.log(`\nArgentina (ID: ${argentina.id})`);
      for (const province of provinces || []) {
        console.log(`  └─ ${province.name}`);
        
        const { data: cities } = await supabase
          .from('locations')
          .select('name')
          .eq('parent_id', province.id)
          .limit(2);
        
        for (const city of cities || []) {
          console.log(`      └─ ${city.name}`);
        }
      }
    }

    // Verificar casos específicos
    console.log('\n🔍 Verificando casos específicos:');
    
    // Las Palmas (Chaco)
    const { data: lasPalmasChaco } = await supabase
      .from('locations')
      .select('id, name, parent_id')
      .eq('slug', 'las-palmas')
      .single();
    
    if (lasPalmasChaco) {
      console.log(`\n✅ Las Palmas (Chaco) migrada con ID: ${lasPalmasChaco.id}`);
    }
    
    // Las Palmas de Gran Canaria
    const { data: lasPalmasGC } = await supabase
      .from('locations')
      .select('id, name, parent_id')
      .eq('slug', 'las-palmas-de-gran-canaria')
      .single();
    
    if (lasPalmasGC) {
      console.log(`✅ Las Palmas de Gran Canaria migrada con ID: ${lasPalmasGC.id}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar la migración
console.log('🚀 Iniciando migración mejorada de localidades...\n');
migrateLocationsImproved();