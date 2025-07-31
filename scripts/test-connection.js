// test-connection.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Buscando tablas en Supabase...\n');
  
  // Lista de posibles nombres de tabla para películas
  const possibleTables = [
    'movies',
    'Movies', 
    'movie',
    'Movie',
    'pelicula',
    'peliculas',
    'film',
    'films'
  ];
  
  console.log('Probando tablas comunes:');
  console.log('========================');
  
  for (const tableName of possibleTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${tableName} - ENCONTRADA (${count || 0} registros)`);
      } else if (error.code === '42P01') {
        console.log(`❌ ${tableName} - No existe`);
      } else {
        console.log(`⚠️  ${tableName} - Error: ${error.message}`);
      }
    } catch (e) {
      console.log(`⚠️  ${tableName} - Error inesperado`);
    }
  }
  
  // Intentar obtener la estructura de la tabla encontrada
  console.log('\n📋 Intentando obtener estructura de tabla movies:');
  console.log('=================================================');
  
  const { data: sampleData, error: sampleError } = await supabase
    .from('movies')
    .select('*')
    .limit(1);
  
  if (!sampleError && sampleData && sampleData.length > 0) {
    console.log('\nColumnas encontradas:');
    Object.keys(sampleData[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof sampleData[0][key]}`);
    });
  } else if (sampleError) {
    console.log('No se pudo obtener la estructura:', sampleError.message);
  }
}

// Ejecutar
testConnection().catch(console.error);