const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env.local' });

// Configuración
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajustar según tu configuración
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyLasPalmasGC() {
  let wpConnection;
  
  try {
    wpConnection = await mysql.createConnection(wpConfig);
    console.log('🔍 Verificando Las Palmas de Gran Canaria...\n');

    // 1. Verificar en WordPress
    console.log('=== EN WORDPRESS ===');
    const [wpData] = await wpConnection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        tt.taxonomy
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.slug LIKE '%las-palmas%'
      AND tt.taxonomy = 'localidad'
      ORDER BY t.name
    `);

    console.log('Localidades con "las-palmas" en el slug:');
    wpData.forEach(loc => {
      console.log(`- ${loc.name} (ID: ${loc.term_id}, slug: ${loc.slug}, parent: ${loc.parent})`);
    });

    // 2. Verificar jerarquía específica
    console.log('\n=== JERARQUÍA EN WORDPRESS ===');
    const lasPalmasGC = wpData.find(l => l.slug === 'las-palmas-de-gran-canaria');
    if (lasPalmasGC) {
      console.log(`\nLas Palmas de Gran Canaria (ID: ${lasPalmasGC.term_id})`);
      
      // Buscar su padre
      if (lasPalmasGC.parent > 0) {
        const [parent] = await wpConnection.execute(`
          SELECT t.term_id, t.name, t.slug, tt.parent
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id = ?
        `, [lasPalmasGC.parent]);
        
        if (parent.length > 0) {
          console.log(`└─ Padre: ${parent[0].name} (ID: ${parent[0].term_id})`);
          
          // Buscar el abuelo
          if (parent[0].parent > 0) {
            const [grandparent] = await wpConnection.execute(`
              SELECT t.term_id, t.name, t.slug
              FROM wp_terms t
              JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
              WHERE t.term_id = ?
            `, [parent[0].parent]);
            
            if (grandparent.length > 0) {
              console.log(`   └─ Abuelo: ${grandparent[0].name} (ID: ${grandparent[0].term_id})`);
            }
          }
        }
      }
    }

    // 3. Verificar en Supabase
    console.log('\n=== EN SUPABASE ===');
    
    // Buscar por slug exacto
    const { data: exactMatch, error: exactError } = await supabase
      .from('locations')
      .select('id, name, slug, parent_id')
      .eq('slug', 'las-palmas-de-gran-canaria');
    
    if (exactMatch && exactMatch.length > 0) {
      console.log('\n✅ Encontrada por slug exacto:');
      console.log(exactMatch[0]);
    } else {
      console.log('\n❌ NO encontrada por slug exacto');
    }

    // Buscar por nombre
    const { data: nameMatch, error: nameError } = await supabase
      .from('locations')
      .select('id, name, slug, parent_id')
      .ilike('name', '%Las Palmas de Gran Canaria%');
    
    if (nameMatch && nameMatch.length > 0) {
      console.log('\n✅ Encontrada por nombre:');
      nameMatch.forEach(loc => {
        console.log(`- ${loc.name} (ID: ${loc.id}, slug: ${loc.slug})`);
      });
    } else {
      console.log('\n❌ NO encontrada por nombre');
    }

    // Buscar todas las que contengan "palmas"
    const { data: palmasLocations } = await supabase
      .from('locations')
      .select('id, name, slug, parent_id')
      .ilike('name', '%palmas%')
      .order('name');
    
    console.log('\n📍 Todas las localidades con "palmas" en Supabase:');
    if (palmasLocations && palmasLocations.length > 0) {
      for (const loc of palmasLocations) {
        console.log(`- ${loc.name} (ID: ${loc.id}, slug: ${loc.slug})`);
        
        // Buscar el padre si existe
        if (loc.parent_id) {
          const { data: parent } = await supabase
            .from('locations')
            .select('name')
            .eq('id', loc.parent_id)
            .single();
          
          if (parent) {
            console.log(`  └─ Padre: ${parent.name}`);
          }
        }
      }
    }

    // 4. Verificar el mapeo
    console.log('\n=== VERIFICANDO MAPEO ===');
    const fs = require('fs');
    try {
      const mapping = JSON.parse(fs.readFileSync('location-id-mapping.json', 'utf8'));
      
      if (lasPalmasGC) {
        const supabaseId = mapping[lasPalmasGC.term_id.toString()];
        if (supabaseId) {
          console.log(`✅ En el mapeo: WordPress ID ${lasPalmasGC.term_id} → Supabase ID ${supabaseId}`);
          
          // Verificar si existe con ese ID
          const { data: mappedLocation } = await supabase
            .from('locations')
            .select('*')
            .eq('id', supabaseId)
            .single();
          
          if (mappedLocation) {
            console.log('Datos en Supabase:', mappedLocation);
          } else {
            console.log('❌ No existe en Supabase con ese ID');
          }
        } else {
          console.log(`❌ NO está en el mapeo`);
        }
      }
    } catch (e) {
      console.log('Error leyendo el mapeo:', e.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
    }
  }
}

// Ejecutar
verifyLasPalmasGC();