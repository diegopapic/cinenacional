// scripts/verify-person-locations.js
// Script para verificar el resultado de la migración de ubicaciones

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
  console.log('=== VERIFICACIÓN DE MIGRACIÓN DE UBICACIONES ===\n');
  
  try {
    // 1. Estadísticas generales
    console.log('📊 1. ESTADÍSTICAS GENERALES\n');
    
    const { count: totalPeople } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    const { count: withBirthLocation } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('birth_location_id', 'is', null);
    
    const { count: withDeathLocation } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('death_location_id', 'is', null);
    
    const { count: withBothLocations } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('birth_location_id', 'is', null)
      .not('death_location_id', 'is', null);
    
    console.log(`Total de personas: ${totalPeople}`);
    console.log(`Con lugar de nacimiento: ${withBirthLocation} (${((withBirthLocation/totalPeople)*100).toFixed(1)}%)`);
    console.log(`Con lugar de muerte: ${withDeathLocation} (${((withDeathLocation/totalPeople)*100).toFixed(1)}%)`);
    console.log(`Con ambos lugares: ${withBothLocations}`);
    
    // 2. Ejemplos de personas con ubicaciones
    console.log('\n🎬 2. EJEMPLOS DE PERSONAS CON UBICACIONES\n');
    
    const { data: examples } = await supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        birth_location_id,
        death_location_id,
        birth_location:locations!birth_location_id(name),
        death_location:locations!death_location_id(name)
      `)
      .not('birth_location_id', 'is', null)
      .limit(10);
    
    if (examples && examples.length > 0) {
      examples.forEach(person => {
        console.log(`\n${person.first_name} ${person.last_name}:`);
        if (person.birth_location) {
          console.log(`  📍 Nacimiento: ${person.birth_location.name}`);
        }
        if (person.death_location) {
          console.log(`  ⚰️ Muerte: ${person.death_location.name}`);
        }
      });
    }
    
    // 3. Buscar personas específicas
    console.log('\n🔍 3. VERIFICANDO PERSONAS ESPECÍFICAS\n');
    
    const knownPeople = [
      { firstName: 'Jorge Luis', lastName: 'Borges' },
      { firstName: 'Julio', lastName: 'Cortázar' },
      { firstName: 'Ricardo', lastName: 'Darín' },
      { firstName: 'Graciela', lastName: 'Borges' },
      { firstName: 'Luis', lastName: 'Puenzo' }
    ];
    
    for (const person of knownPeople) {
      const { data } = await supabase
        .from('people')
        .select(`
          first_name,
          last_name,
          birth_location:locations!birth_location_id(name),
          death_location:locations!death_location_id(name)
        `)
        .ilike('first_name', person.firstName)
        .ilike('last_name', person.lastName)
        .limit(1)
        .single();
      
      if (data) {
        console.log(`\n${data.first_name} ${data.last_name}:`);
        if (data.birth_location) {
          console.log(`  📍 Nacimiento: ${data.birth_location.name}`);
        } else {
          console.log(`  📍 Nacimiento: Sin datos`);
        }
        if (data.death_location) {
          console.log(`  ⚰️ Muerte: ${data.death_location.name}`);
        }
      } else {
        console.log(`\n${person.firstName} ${person.lastName}: No encontrado`);
      }
    }
    
    // 4. Top ubicaciones más comunes
    console.log('\n🌍 4. TOP UBICACIONES MÁS COMUNES\n');
    
    // Para lugar de nacimiento
    const { data: birthLocations } = await supabase
      .from('people')
      .select('birth_location_id')
      .not('birth_location_id', 'is', null);
    
    if (birthLocations) {
      const birthCounts = {};
      birthLocations.forEach(p => {
        birthCounts[p.birth_location_id] = (birthCounts[p.birth_location_id] || 0) + 1;
      });
      
      const topBirthIds = Object.entries(birthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log('\nTop 5 lugares de nacimiento:');
      for (const [locationId, count] of topBirthIds) {
        const { data: location } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();
        
        if (location) {
          console.log(`  • ${location.name}: ${count} personas`);
        }
      }
    }
    
    // Para lugar de muerte
    const { data: deathLocations } = await supabase
      .from('people')
      .select('death_location_id')
      .not('death_location_id', 'is', null);
    
    if (deathLocations) {
      const deathCounts = {};
      deathLocations.forEach(p => {
        deathCounts[p.death_location_id] = (deathCounts[p.death_location_id] || 0) + 1;
      });
      
      const topDeathIds = Object.entries(deathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log('\nTop 5 lugares de muerte:');
      for (const [locationId, count] of topDeathIds) {
        const { data: location } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single();
        
        if (location) {
          console.log(`  • ${location.name}: ${count} personas`);
        }
      }
    }
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar
verifyMigration().catch(console.error);