// scripts/migrate-countries-final.js
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

async function migrarPaises() {
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  
  try {
    console.log('🚀 MIGRACIÓN FINAL DE PAÍSES\n');
    console.log('📌 Configuración:');
    console.log('   - Todas las películas tendrán countries = ["Argentina"]');
    console.log('   - is_coproduction = false');
    console.log('   - production_type = "national"\n');

    // 1. Verificar/crear Argentina en la tabla countries
    console.log('🇦🇷 Verificando país Argentina...');
    const { data: argentinaCheck } = await supabase
      .from('countries')
      .select('*')
      .or('code.eq.AR,name.eq.Argentina')
      .single();

    let argentinaId;
    if (!argentinaCheck) {
      const { data: newCountry, error } = await supabase
        .from('countries')
        .insert({ code: 'AR', name: 'Argentina' })
        .select()
        .single();
      
      if (error) {
        console.error('Error creando Argentina:', error);
        return;
      }
      argentinaId = newCountry.id;
      console.log('✅ Argentina creada con ID:', argentinaId);
    } else {
      argentinaId = argentinaCheck.id;
      console.log('✅ Argentina ya existe con ID:', argentinaId);
    }

    // 2. Obtener todas las películas de WordPress
    console.log('\n📋 Obteniendo películas de WordPress...');
    const [wpMovies] = await connection.execute(`
      SELECT 
        p.ID as wp_id,
        p.post_title as title
      FROM wp_posts p
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
      ORDER BY p.ID
    `);
    
    console.log(`📊 Total de películas en WordPress: ${wpMovies.length}`);

    // 3. Obtener películas de Supabase para mapear wp_id -> id
    console.log('\n🔄 Obteniendo películas de Supabase...');
    const { data: supabaseMovies, error: fetchError } = await supabase
      .from('movies')
      .select('id, wp_id, title')
      .order('id');

    if (fetchError) {
      console.error('Error obteniendo películas:', fetchError);
      return;
    }

    console.log(`✅ Películas en Supabase: ${supabaseMovies.length}`);

    // Crear mapa wp_id -> id
    const wpIdMap = {};
    supabaseMovies.forEach(movie => {
      if (movie.wp_id) {
        wpIdMap[movie.wp_id] = movie.id;
      }
    });

    // 4. Actualizar en lotes
    const BATCH_SIZE = 100;
    let updatedCount = 0;
    let skippedCount = 0;
    let errors = 0;

    console.log('\n⏳ Iniciando actualización...\n');

    for (let i = 0; i < wpMovies.length; i += BATCH_SIZE) {
      const batch = wpMovies.slice(i, i + BATCH_SIZE);
      
      // Preparar actualizaciones
      const updates = [];
      const movieCountryInserts = [];
      
      for (const wpMovie of batch) {
        const supabaseId = wpIdMap[wpMovie.wp_id];
        
        if (!supabaseId) {
          skippedCount++;
          continue;
        }
        
        // Actualización para la tabla movies
        updates.push({
          id: supabaseId,
          countries: ['Argentina'],
          is_coproduction: false,
          production_type: 'national'
        });
        
        // Inserción para movie_countries
        movieCountryInserts.push({
          movie_id: supabaseId,
          country_id: argentinaId
        });
      }
      
      // Ejecutar actualizaciones en movies
      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('movies')
          .upsert(updates, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
        
        if (updateError) {
          console.error(`❌ Error actualizando movies:`, updateError.message);
          errors += updates.length;
        } else {
          updatedCount += updates.length;
        }
      }
      
      // Ejecutar inserciones en movie_countries
      if (movieCountryInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('movie_countries')
          .upsert(movieCountryInserts, {
            onConflict: 'movie_id,country_id',
            ignoreDuplicates: true
          });
        
        if (insertError) {
          console.error(`❌ Error en movie_countries:`, insertError.message);
        }
      }
      
      const progress = ((i + batch.length) / wpMovies.length * 100).toFixed(1);
      console.log(`✅ Progreso: ${progress}% - Actualizadas: ${updatedCount}, Omitidas: ${skippedCount}`);
    }

    // 5. Mostrar estadísticas finales
    console.log('\n📊 MIGRACIÓN COMPLETADA');
    console.log('=====================================');
    console.log(`✅ Películas actualizadas: ${updatedCount}`);
    console.log(`⚠️  Películas omitidas (sin match en Supabase): ${skippedCount}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`\n📌 Todas las películas ahora tienen:`);
    console.log(`   - countries = ['Argentina']`);
    console.log(`   - is_coproduction = false`);
    console.log(`   - production_type = 'national'`);

    // 6. Verificar algunos resultados
    console.log('\n🔍 Verificando algunos resultados...');
    const { data: samples } = await supabase
      .from('movies')
      .select(`
        id,
        title,
        countries,
        is_coproduction,
        production_type,
        movieCountries:movie_countries(
          country:countries(name)
        )
      `)
      .limit(5);

    if (samples) {
      console.log('\nEjemplos de películas actualizadas:');
      samples.forEach(movie => {
        const countryNames = movie.movieCountries?.map(mc => mc.country?.name).join(', ') || 'Sin relación';
        console.log(`- ${movie.title}`);
        console.log(`  Array: ${JSON.stringify(movie.countries)}, Tipo: ${movie.production_type}, Relación: ${countryNames}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar
console.log('🎬 MIGRACIÓN FINAL DE PAÍSES\n');
console.log('Como no hay información de países en WordPress,');
console.log('todas las películas serán marcadas como producciones nacionales.\n');

migrarPaises();