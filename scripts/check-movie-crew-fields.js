// scripts/check-movie-crew-fields.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFields() {
  console.log('🔍 Verificando estructura de la tabla movie_crew...\n');
  
  // Primero, intentar obtener un registro existente
  const { data, error } = await supabase
    .from('movie_crew')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error al consultar:', error);
  }
  
  if (data && data.length > 0) {
    console.log('✅ Campos disponibles en movie_crew:');
    const fields = Object.keys(data[0]);
    fields.forEach(field => {
      console.log(`  - ${field}: ${typeof data[0][field]} (ejemplo: ${data[0][field]})`);
    });
  } else {
    console.log('La tabla movie_crew está vacía');
    
    // Intentar insertar un registro de prueba para ver qué campos acepta
    console.log('\nIntentando insertar registro de prueba para detectar campos...');
    
    const testRecord = {
      movie_id: 30,  // Usamos el ID de la película que sabemos que existe
      person_id: 159044,  // ID del director que sabemos que existe
      role_id: 2,  // ID del rol "Director"
      role: 'Director',
      billing_order: 1,
      note: 'Test'
    };
    
    console.log('Intentando insertar:', testRecord);
    
    const { data: insertData, error: insertError } = await supabase
      .from('movie_crew')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.log('\n❌ Error de inserción:');
      console.log(insertError);
      
      // El error nos puede dar pistas sobre qué campos faltan o están mal
      if (insertError.message) {
        console.log('\nMensaje de error:', insertError.message);
      }
    } else {
      console.log('\n✅ Registro insertado exitosamente!');
      console.log('Campos del registro insertado:');
      console.log(insertData[0]);
      
      // Limpiar el registro de prueba
      await supabase
        .from('movie_crew')
        .delete()
        .eq('id', insertData[0].id);
      console.log('(Registro de prueba eliminado)');
    }
  }
}

checkFields();