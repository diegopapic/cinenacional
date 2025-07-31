// import-via-supabase-api.js
// Importar películas usando la API REST de Supabase

const fs = require('fs').promises;
const path = require('path');

// Necesitas estos valores de tu proyecto Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

async function importViaAPI() {
  try {
    console.log('Leyendo archivo JSON...');
    const filePath = path.join(__dirname, '..', 'dumps', 'movies-titles.json');
    const content = await fs.readFile(filePath, 'utf8');
    const movies = JSON.parse(content);
    
    console.log(`Películas a importar: ${movies.length}`);
    
    let migrated = 0;
    let errors = 0;
    const batchSize = 50; // Supabase permite hasta 1000 pero mejor ir de a poco
    
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      console.log(`\nProcesando lote ${Math.floor(i/batchSize) + 1}...`);
      
      // Limpiar los datos - quitar wp_id que no existe en la tabla
      const cleanBatch = batch.map(movie => ({
        title: movie.title,
        slug: movie.slug,
        year: movie.year,
        status: movie.status
      }));
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/movies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal' // No retornar los datos insertados
          },
          body: JSON.stringify(cleanBatch)
        });
        
        if (response.ok) {
          console.log(`✓ Lote insertado: ${batch.length} películas`);
          migrated += batch.length;
        } else {
          const error = await response.text();
          console.error(`✗ Error en lote: ${error}`);
          errors += batch.length;
        }
        
      } catch (error) {
        console.error(`✗ Error de conexión: ${error.message}`);
        errors += batch.length;
      }
      
      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Películas migradas: ${migrated}`);
    console.log(`Errores: ${errors}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar
importViaAPI();