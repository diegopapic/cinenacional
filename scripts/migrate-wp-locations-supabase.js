const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
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


// Mapa para relacionar IDs de WordPress con IDs de Supabase
const locationIdMap = new Map();

async function migrateLocations() {
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
      .neq('id', 0); // Elimina todos los registros
    
    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('Error limpiando locations:', deleteError);
    }

    // 2. Obtener todas las localidades de WordPress con su jerarquía
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
      ORDER BY tt.parent, t.name
    `);

    console.log(`Total de localidades encontradas: ${locations.length}\n`);

    // 3. Organizar localidades por nivel
    const locationsByLevel = {
      0: [], // Países (parent = 0)
      1: [], // Provincias/Estados
      2: [], // Ciudades/Localidades
      3: []  // Subdivisiones
    };

    // Función para determinar el nivel
    const getLevel = (location, allLocations) => {
      if (location.parent === 0) return 0;
      
      let level = 1;
      let currentParent = location.parent;
      
      while (currentParent !== 0) {
        const parent = allLocations.find(l => l.term_id === currentParent);
        if (!parent) break;
        currentParent = parent.parent;
        level++;
      }
      
      return level;
    };

    // Clasificar por niveles
    locations.forEach(location => {
      const level = getLevel(location, locations);
      if (locationsByLevel[level]) {
        locationsByLevel[level].push(location);
      } else {
        locationsByLevel[3].push(location); // Si es más profundo, va al nivel 3
      }
    });

    // 4. Migrar por niveles (para respetar la jerarquía)
    for (let level = 0; level <= 3; level++) {
      console.log(`\n🔄 Migrando nivel ${level} (${locationsByLevel[level].length} localidades)...`);
      
      for (const location of locationsByLevel[level]) {
        try {
          // Obtener el ID del padre en Supabase (si tiene)
          let parentId = null;
          if (location.parent > 0) {
            parentId = locationIdMap.get(location.parent);
            if (!parentId) {
              console.warn(`⚠️  No se encontró el padre ${location.parent} para ${location.name}`);
              continue; // Saltear si no se encuentra el padre
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
          } else {
            // Guardar mapeo de IDs
            locationIdMap.set(location.term_id, data.id);
            
            // Mostrar progreso para países y algunas provincias
            if (level === 0 || (level === 1 && locationIdMap.size % 10 === 0)) {
              console.log(`   ✅ ${location.name} (WP: ${location.term_id} → Supabase: ${data.id})`);
            }
          }
        } catch (err) {
          console.error(`❌ Error procesando ${location.name}:`, err.message);
        }
      }
    }

    // 7. Guardar el mapeo de IDs para uso futuro
    console.log('\n💾 Guardando mapeo de IDs para migración futura de personas...');
    
    const fs = require('fs');
    const mapData = Object.fromEntries(locationIdMap);
    fs.writeFileSync(
      'location-id-mapping.json', 
      JSON.stringify(mapData, null, 2)
    );
    console.log('✅ Mapeo guardado en: scripts/location-id-mapping.json');

    console.log(`\n✅ Migración de localidades completada. Total migradas: ${locationIdMap.size}`);

    // 5. Mostrar estadísticas finales
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    
    const { count: totalLocations } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });
    
    const { count: countriesCount } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .is('parent_id', null);

    console.log(`- Total localidades migradas: ${totalLocations}`);
    console.log(`- Países (nivel raíz): ${countriesCount}`);

    // 6. Mostrar algunos ejemplos
    console.log('\n📍 EJEMPLOS DE JERARQUÍA:');
    
    // Buscar Argentina y sus subdivisiones
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
        .limit(5);
      
      console.log(`\nArgentina (ID: ${argentina.id})`);
      for (const province of provinces || []) {
        console.log(`  └─ ${province.name}`);
        
        const { data: cities } = await supabase
          .from('locations')
          .select('name')
          .eq('parent_id', province.id)
          .limit(3);
        
        for (const city of cities || []) {
          console.log(`      └─ ${city.name}`);
        }
      }
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
console.log('🚀 Iniciando migración de localidades de WordPress a Supabase...\n');
migrateLocations();