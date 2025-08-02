// scripts/migrate-wp-countries-correct.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuración MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: process.env.MYSQL_PASSWORD || '', // Tu contraseña de MySQL
  database: 'wordpress_cine',
  port: 3306
};

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logger
class MigrationLogger {
  constructor() {
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const symbols = {
      info: '📌',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '⏳'
    };
    console.log(`[${timestamp}] ${symbols[type] || ''} ${message}`);
  }

  logProgress(current, total, message = '') {
    const percentage = ((current / total) * 100).toFixed(1);
    this.log(`Progreso: ${current}/${total} (${percentage}%) ${message}`, 'progress');
  }

  logStats(stats) {
    console.log('\n📊 Estadísticas de la migración:');
    console.log('=====================================');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
  }

  logElapsedTime() {
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = ((elapsed % 60000) / 1000).toFixed(0);
    console.log(`\n⏱️ Tiempo total: ${minutes}m ${seconds}s`);
  }
}

async function migrateCountriesCorrectLogic() {
  const logger = new MigrationLogger();
  const connection = await mysql.createConnection(MYSQL_CONFIG);

  try {
    logger.log('Iniciando migración de países con lógica correcta...', 'info');
    logger.log('Lógica:', 'info');
    logger.log('   - Sin países en WP = Producción 100% argentina', 'info');
    logger.log('   - Con países en WP = Coproducción (Argentina + esos países)', 'info');

    // 1. Verificar/crear columnas en Supabase
    logger.log('Verificando estructura de la tabla movies...', 'info');
    
    // 2. Obtener todas las películas CON sus países (si los tienen)
    const [movies] = await connection.execute(`
      SELECT 
        p.ID as wp_id,
        p.post_title as title,
        p.post_name as slug,
        pm_year.meta_value as year,
        GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '|') as countries
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id 
        AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
      GROUP BY p.ID
      ORDER BY p.ID
    `);

    logger.log(`Total de películas a procesar: ${movies.length}`, 'info');

    // 3. Analizar distribución antes de migrar
    let previewNational = 0;
    let previewCoproduction = 0;
    
    movies.forEach(movie => {
      if (!movie.countries || movie.countries === '') {
        previewNational++;
      } else {
        previewCoproduction++;
      }
    });

    logger.log(`Distribución encontrada:`, 'info');
    logger.log(`   - Producciones nacionales (sin países): ${previewNational} (${(previewNational/movies.length*100).toFixed(1)}%)`, 'info');
    logger.log(`   - Coproducciones (con países): ${previewCoproduction} (${(previewCoproduction/movies.length*100).toFixed(1)}%)`, 'info');

    // 4. Confirmar antes de proceder
    logger.log('Iniciando migración en 3 segundos...', 'warning');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Procesar en lotes
    const BATCH_SIZE = 100;
    let processedCount = 0;
    let nationalCount = 0;
    let coproductionCount = 0;
    let errors = 0;

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      const updates = [];

      for (const movie of batch) {
        let allCountries = [];
        let isCoproduction = false;
        let productionType = 'national';

        if (movie.countries && movie.countries !== '') {
          // ES COPRODUCCIÓN: tiene países asignados
          const wpCountries = movie.countries.split('|').filter(c => c);
          
          // Argentina siempre primero, luego los demás países
          allCountries = ['Argentina'];
          wpCountries.forEach(country => {
            if (country !== 'Argentina' && !allCountries.includes(country)) {
              allCountries.push(country);
            }
          });
          
          isCoproduction = true;
          productionType = 'coproduction';
          coproductionCount++;
        } else {
          // PRODUCCIÓN NACIONAL: no tiene países asignados
          allCountries = ['Argentina'];
          isCoproduction = false;
          productionType = 'national';
          nationalCount++;
        }

        updates.push({
          wp_id: movie.wp_id,
          countries: allCountries,
          is_coproduction: isCoproduction,
          production_type: productionType
        });
      }

      // 6. Actualizar en Supabase
      try {
        const { data, error } = await supabase
          .from('movies')
          .upsert(
            updates.map(u => ({
              wp_id: u.wp_id,
              countries: u.countries,
              is_coproduction: u.is_coproduction,
              production_type: u.production_type
            })),
            { 
              onConflict: 'wp_id',
              ignoreDuplicates: false 
            }
          );

        if (error) {
          logger.log(`Error en lote ${i / BATCH_SIZE + 1}: ${error.message}`, 'error');
          errors += batch.length;
        } else {
          processedCount += batch.length;
          logger.logProgress(processedCount, movies.length, `(${errors} errores)`);
        }
      } catch (err) {
        logger.log(`Error inesperado: ${err.message}`, 'error');
        errors += batch.length;
      }
    }

    // 7. Mostrar estadísticas finales
    const stats = {
      'Total procesadas': processedCount,
      'Producciones nacionales': `${nationalCount} (${(nationalCount/processedCount*100).toFixed(1)}%)`,
      'Coproducciones': `${coproductionCount} (${(coproductionCount/processedCount*100).toFixed(1)}%)`,
      'Errores': errors
    };
    
    logger.logStats(stats);

    // 8. Mostrar algunos ejemplos de coproducciones
    if (coproductionCount > 0) {
      logger.log('\nBuscando ejemplos de coproducciones...', 'info');
      
      const [coproductionExamples] = await connection.execute(`
        SELECT 
          p.post_title as title,
          pm_year.meta_value as year,
          GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') as countries
        FROM wp_posts p
        LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
        JOIN wp_term_relationships tr ON p.ID = tr.object_id
        JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id 
          AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
        JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE p.post_type = 'pelicula'
          AND p.post_status = 'publish'
        GROUP BY p.ID
        HAVING COUNT(DISTINCT t.term_id) > 0
        ORDER BY RAND()
        LIMIT 10
      `);

      if (coproductionExamples.length > 0) {
        console.log('\n🎬 Ejemplos de coproducciones encontradas:');
        console.table(coproductionExamples);
      }
    }

    logger.log('Migración completada exitosamente!', 'success');
    logger.logElapsedTime();

  } catch (error) {
    logger.log(`Error en la migración: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await connection.end();
  }
}

// Script para verificar si hay países en WordPress antes de migrar
async function checkWordPressCountries() {
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  const logger = new MigrationLogger();

  try {
    // Buscar películas que SÍ tienen países asignados
    const [moviesWithCountries] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        GROUP_CONCAT(t.name SEPARATOR ', ') as countries
      FROM wp_posts p
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
      GROUP BY p.ID
      LIMIT 20
    `);

    if (moviesWithCountries.length > 0) {
      logger.log('Películas con países asignados (coproducciones):', 'info');
      console.table(moviesWithCountries);
      return true;
    } else {
      logger.log('No se encontraron películas con países asignados', 'warning');
      logger.log('Todas las películas serán marcadas como producciones nacionales', 'warning');
      return false;
    }
  } finally {
    await connection.end();
  }
}

// Ejecutar verificación primero
console.log('🔍 Verificando si existen coproducciones en WordPress...\n');
checkWordPressCountries().then(hasCountries => {
  if (!hasCountries) {
    console.log('\n⚠️  IMPORTANTE: No se encontraron países asignados en WordPress.');
    console.log('   Esto significa que TODAS las películas serán marcadas como producciones nacionales.');
    console.log('   Si esto no es correcto, verifica la estructura de la base de datos.\n');
  }
  
  console.log('\n¿Continuar con la migración? (Ctrl+C para cancelar)');
  console.log('La migración comenzará en 5 segundos...\n');
  
  setTimeout(() => {
    migrateCountriesCorrectLogic();
  }, 5000);
});