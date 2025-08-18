// scripts/check-supabase-locations-fixed.js
// Script corregido para verificar el estado de las ubicaciones en Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSupabaseLocations() {
  console.log('=== VERIFICANDO UBICACIONES EN SUPABASE ===\n');
  console.log(`Conectando a: ${SUPABASE_URL}\n`);
  
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
    
    // 2. Obtener la estructura de la tabla primero
    console.log('🔧 2. ESTRUCTURA DE LA TABLA LOCATIONS\n');
    
    const { data: oneLocation, error: structError } = await supabase
      .from('locations')
      .select('*')
      .limit(1)
      .single();
    
    if (structError) {
      console.error('❌ Error obteniendo estructura:', structError);
    } else if (oneLocation) {
      console.log('Campos disponibles:');
      Object.keys(oneLocation).forEach(key => {
        const value = oneLocation[key];
        const valuePreview = value !== null && value !== undefined ? 
          (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : 
          'null';
        console.log(`  • ${key}: ${typeof value} = "${valuePreview}"`);
      });
    }
    
    // 3. Obtener algunas ubicaciones de muestra
    console.log('\n🔍 3. MUESTRA DE UBICACIONES\n');
    
    const { data: sampleLocations, error: sampleError } = await supabase
      .from('locations')
      .select('*')
      .limit(20);
    
    if (sampleError) {
      console.error('❌ Error obteniendo muestra:', sampleError);
    } else if (sampleLocations && sampleLocations.length > 0) {
      console.log('Primeras 20 ubicaciones:');
      sampleLocations.forEach(loc => {
        // Usar los campos que realmente existen
        const id = loc.id || loc.ID || loc.wordpressId || '?';
        const name = loc.name || loc.title || loc.post_title || 'Sin nombre';
        const parent = loc.parentId || loc.parent_id || loc.parent || 'N/A';
        console.log(`  ID ${id}: ${name} (parent: ${parent})`);
      });
    }
    
    // 4. Buscar ubicaciones específicas por ID
    console.log('\n🎯 4. BUSCANDO IDs ESPECÍFICOS DE WORDPRESS\n');
    
    const wpIds = [11229, 11270, 7365, 7367, 11721, 12508];
    console.log(`Buscando IDs: ${wpIds.join(', ')}\n`);
    
    const { data: specificLocations, error: specificError } = await supabase
      .from('locations')
      .select('*')
      .in('id', wpIds);
    
    if (specificError) {
      console.error('❌ Error buscando IDs específicos:', specificError);
    } else if (specificLocations && specificLocations.length > 0) {
      console.log('Ubicaciones encontradas con IDs de WordPress:');
      specificLocations.forEach(loc => {
        const name = loc.name || loc.title || loc.post_title || 'Sin nombre';
        console.log(`  ✅ ID ${loc.id}: ${name}`);
      });
    } else {
      console.log('❌ No se encontraron ubicaciones con los IDs de WordPress');
    }
    
    // 5. Buscar por nombre
    console.log('\n📍 5. BUSCANDO UBICACIONES POR NOMBRE\n');
    
    const locationNames = ['Argentina', 'Buenos Aires', 'Chile', 'Uruguay', 'París', 'Madrid'];
    
    // Determinar qué campo usar para el nombre
    let nameField = 'name';
    if (oneLocation) {
      if ('title' in oneLocation) nameField = 'title';
      else if ('post_title' in oneLocation) nameField = 'post_title';
    }
    
    console.log(`Usando campo "${nameField}" para búsqueda por nombre\n`);
    
    for (const name of locationNames) {
      const { data: namedLocation, error: nameError } = await supabase
        .from('locations')
        .select('*')
        .ilike(nameField, `%${name}%`)
        .limit(3);
      
      if (!nameError && namedLocation && namedLocation.length > 0) {
        console.log(`"${name}" encontrado:`);
        namedLocation.forEach(loc => {
          const locName = loc[nameField] || 'Sin nombre';
          const id = loc.id || loc.ID || loc.wordpressId || '?';
          console.log(`  • ID ${id}: ${locName}`);
        });
      } else if (nameError) {
        console.log(`"${name}": Error - ${nameError.message}`);
      } else {
        console.log(`"${name}": No encontrado`);
      }
    }
    
    // 6. Verificar tabla people
    console.log('\n👥 6. VERIFICANDO TABLA PEOPLE\n');
    
    const { count: totalPeople, error: peopleCountError } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    if (!peopleCountError) {
      console.log(`Total de personas en Supabase: ${totalPeople || 0}`);
      
      // Verificar estructura de people
      const { data: samplePerson, error: personError } = await supabase
        .from('people')
        .select('*')
        .limit(1)
        .single();
      
      if (!personError && samplePerson) {
        console.log('\nTodos los campos de la tabla people:');
        Object.keys(samplePerson).forEach(field => {
          const value = samplePerson[field];
          const valueType = typeof value;
          const valueDisplay = value !== null ? 
            (valueType === 'string' && value.length > 30 ? value.substring(0, 30) + '...' : value) : 
            'null';
          
          // Resaltar campos relevantes
          if (field.toLowerCase().includes('location') || 
              field.toLowerCase().includes('wordpress') ||
              field.toLowerCase().includes('birth') ||
              field.toLowerCase().includes('death')) {
            console.log(`  ⭐ ${field}: ${valueType} = ${valueDisplay}`);
          } else {
            console.log(`  • ${field}: ${valueType} = ${valueDisplay}`);
          }
        });
      }
    } else {
      console.error('❌ Error accediendo a tabla people:', peopleCountError);
    }
    
    // 7. Verificar algunos IDs en el rango esperado
    console.log('\n🔢 7. VERIFICANDO FORMATO DE IDs\n');
    
    const { data: idCheck, error: idError } = await supabase
      .from('locations')
      .select('*')
      .gte('id', 7000)
      .lte('id', 13000)
      .limit(10);
    
    if (!idError && idCheck && idCheck.length > 0) {
      console.log('Muestra de IDs en el rango de WordPress (7000-13000):');
      idCheck.forEach(loc => {
        const name = loc.name || loc.title || loc.post_title || 'Sin nombre';
        const parent = loc.parentId || loc.parent_id || loc.parent || 'N/A';
        console.log(`  • ID ${loc.id}: ${name} (parent: ${parent})`);
      });
    } else if (idError) {
      console.error('❌ Error verificando rango de IDs:', idError);
    } else {
      console.log('⚠️  No se encontraron ubicaciones en el rango 7000-13000');
    }
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    console.log('\n💡 Con esta información podemos ajustar el script de migración.');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar
checkSupabaseLocations().catch(console.error);