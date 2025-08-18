// scripts/check-supabase-locations.js
// Script para verificar el estado de las ubicaciones en Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!supabase) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  console.log('Asegúrate de tener en .env.local:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=... (o NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

async function checkSupabaseLocations() {
  console.log('=== VERIFICANDO UBICACIONES EN SUPABASE ===\n');
  
  try {
    // 1. Contar total de ubicaciones
    console.log('📊 1. ESTADÍSTICAS DE LA TABLA LOCATIONS\n');
    
    const { count: totalLocations, error: countError } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error contando ubicaciones:', countError);
      return;
    }
    
    console.log(`Total de ubicaciones en Supabase: ${totalLocations || 0}\n`);
    
    if (!totalLocations || totalLocations === 0) {
      console.log('⚠️  No hay ubicaciones en Supabase. Necesitas migrarlas primero.');
      console.log('\n💡 SUGERENCIA: Crea un script para migrar las ubicaciones desde WordPress.');
      return;
    }
    
    // 2. Obtener algunas ubicaciones de muestra
    console.log('🔍 2. MUESTRA DE UBICACIONES\n');
    
    const { data: sampleLocations, error: sampleError } = await supabase
      .from('locations')
      .select('id, name, type, parentId')
      .limit(20);
    
    if (sampleError) {
      console.error('❌ Error obteniendo muestra:', sampleError);
      return;
    }
    
    console.log('Primeras 20 ubicaciones:');
    sampleLocations.forEach(loc => {
      console.log(`  ID ${loc.id}: ${loc.name} (tipo: ${loc.type || 'sin tipo'}, parent: ${loc.parentId || 'ninguno'})`);
    });
    
    // 3. Buscar ubicaciones específicas por ID
    console.log('\n🎯 3. BUSCANDO IDs ESPECÍFICOS DE WORDPRESS\n');
    
    const wpIds = [11229, 11270, 7365, 7367, 11721, 12508];
    
    const { data: specificLocations, error: specificError } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', wpIds);
    
    if (specificError) {
      console.error('❌ Error buscando IDs específicos:', specificError);
    } else if (specificLocations && specificLocations.length > 0) {
      console.log('Ubicaciones encontradas con IDs de WordPress:');
      specificLocations.forEach(loc => {
        console.log(`  ✅ ID ${loc.id}: ${loc.name}`);
      });
    } else {
      console.log('❌ No se encontraron ubicaciones con los IDs de WordPress');
      console.log(`   IDs buscados: ${wpIds.join(', ')}`);
    }
    
    // 4. Buscar por nombre
    console.log('\n📍 4. BUSCANDO UBICACIONES POR NOMBRE\n');
    
    const locationNames = ['Argentina', 'Buenos Aires', 'Chile', 'Uruguay', 'París', 'Madrid'];
    
    for (const name of locationNames) {
      const { data: namedLocation, error: nameError } = await supabase
        .from('locations')
        .select('id, name, type')
        .ilike('name', `%${name}%`)
        .limit(5);
      
      if (!nameError && namedLocation && namedLocation.length > 0) {
        console.log(`\n"${name}" encontrado:`);
        namedLocation.forEach(loc => {
          console.log(`  • ID ${loc.id}: ${loc.name} (tipo: ${loc.type || 'sin tipo'})`);
        });
      } else {
        console.log(`\n"${name}": No encontrado`);
      }
    }
    
    // 5. Ver estructura de la tabla
    console.log('\n🔧 5. VERIFICANDO ESTRUCTURA DE LA TABLA\n');
    
    const { data: oneLocation, error: structError } = await supabase
      .from('locations')
      .select('*')
      .limit(1)
      .single();
    
    if (!structError && oneLocation) {
      console.log('Campos disponibles en la tabla locations:');
      Object.keys(oneLocation).forEach(key => {
        console.log(`  • ${key}: ${typeof oneLocation[key]} (ejemplo: ${oneLocation[key]})`);
      });
    }
    
    // 6. Verificar tabla people
    console.log('\n👥 6. VERIFICANDO TABLA PEOPLE\n');
    
    const { count: totalPeople, error: peopleCountError } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    if (!peopleCountError) {
      console.log(`Total de personas en Supabase: ${totalPeople || 0}`);
      
      // Verificar si tienen campos de ubicación
      const { data: samplePerson, error: personError } = await supabase
        .from('people')
        .select('*')
        .limit(1)
        .single();
      
      if (!personError && samplePerson) {
        console.log('\nCampos de ubicación en people:');
        const locationFields = ['birthLocationId', 'deathLocationId', 'birthLocation', 'deathLocation', 'wordpressId'];
        locationFields.forEach(field => {
          if (field in samplePerson) {
            console.log(`  ✅ ${field}: ${typeof samplePerson[field]} (valor: ${samplePerson[field]})`);
          } else {
            console.log(`  ❌ ${field}: NO EXISTE`);
          }
        });
      }
    }
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar
checkSupabaseLocations().catch(console.error);