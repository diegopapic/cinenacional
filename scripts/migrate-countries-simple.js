// scripts/migrate-countries-simple.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuración MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Tu contraseña de MySQL si la tienes
  database: 'wordpress_cine',
  port: 3306
};

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateOnlyCountries() {
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  
  try {
    console.log('🚀 Migración SIMPLE - Solo actualizando columna countries\n');
    
    // 1. Primero verificar qué columnas existen en Supabase
    console.log('🔍 Verificando estructura de Supabase...');
    const { data: sampleMovie, error: checkError } = await supabase
      .from('movies')
      .select('*')
      .limit(1)
      .single();

    if (checkError) {
      console.error('❌ Error conectando a Supabase:', checkError.message);
      return;
    }

    const existingColumns = Object.keys(sampleMovie || {});
    console.log('📊 Columnas encontradas:', existingColumns.join(', '));
    
    const hasCountries = existingColumns.includes('countries');
    const hasIsCoproduction = existingColumns.includes('is_coproduction');
    const hasProductionType = existingColumns.includes('production_type');
    
    console.log(`\n✅ countries: ${hasCountries ? 'SI existe' : 'NO existe'}`);
    console.log(`✅ is_coproduction: ${hasIsCoproduction ? 'SI existe' : 'NO existe'}`);
    console.log(`✅ production_type: ${hasProductionType ? 'SI existe' : 'NO existe'}`);

    if (!hasCountries) {
      console.error('\n❌ La columna "countries" NO existe en Supabase');
      console.error('   Debes agregarla primero con este SQL:');
      console.error('   ALTER TABLE movies ADD COLUMN countries TEXT[] DEFAULT ARRAY[\'Argentina\'];');
      return;
    }

    // 2. Obtener todas las películas de WordPress
    console.log('\n📋 Obteniendo películas de WordPress...');
    const [movies] = await connection.execute(`
      SELECT 
        p.ID as wp_id,
        p.post_title as title
      FROM wp_posts p
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
      ORDER BY p.ID
    `);

    console.log(`📊 Total de películas: ${movies.length}`);

    // 3. Actualizar en lotes SOLO la columna countries
    const BATCH_SIZE = 100;
    let processedCount = 0;
    let errors = 0;

    console.log('\n⏳ Iniciando actualización...');
    console.log('   (Todas las películas tendrán countries = [\'Argentina\'])\n');

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      
      // Crear objeto de actualización con SOLO los campos que existen
      const updates = batch.map(movie => {
        const update = {
          wp_id: movie.wp_id,
          countries: ['Argentina']
        };
        
        // Agregar otros campos SOLO si existen
        if (hasIsCoproduction) {
          update.is_coproduction = false;
        }
        if (hasProductionType) {
          update.production_type = 'national';
        }
        
        return update;
      });

      try {
        const { data, error } = await supabase
          .from('movies')
          .upsert(updates, { 
            onConflict: 'wp_id',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Error en lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
          errors += batch.length;
        } else {
          processedCount += batch.length;
          const percentage = ((processedCount / movies.length) * 100).toFixed(1);
          console.log(`✅ Procesadas ${processedCount}/${movies.length} (${percentage}%)`);
        }
      } catch (err) {
        console.error(`❌ Error inesperado:`, err.message);
        errors += batch.length;
      }
    }

    // 4. Mostrar resultados
    console.log('\n📊 Migración completada!');
    console.log('=====================================');
    console.log(`✅ Películas procesadas: ${processedCount}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`\n📌 Todas las películas ahora tienen countries = ['Argentina']`);
    
    if (!hasIsCoproduction || !hasProductionType) {
      console.log('\n⚠️  IMPORTANTE:');
      console.log('   Las columnas is_coproduction y production_type NO existen.');
      console.log('   Si quieres usar estas funcionalidades, agrégalas con:');
      console.log('\n   ALTER TABLE movies ADD COLUMN is_coproduction BOOLEAN DEFAULT FALSE;');
      console.log('   ALTER TABLE movies ADD COLUMN production_type VARCHAR(50) DEFAULT \'national\';');
    }

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
console.log('🎬 MIGRACIÓN SIMPLE DE PAÍSES\n');
console.log('Como no hay países en WordPress, todas las películas serán');
console.log('marcadas como producciones 100% argentinas.\n');

migrateOnlyCountries();