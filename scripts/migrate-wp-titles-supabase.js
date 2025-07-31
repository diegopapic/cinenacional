// migrate-mysql-to-supabase.js
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuración MySQL local
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Tu contraseña de MySQL
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
    this.logs = {
      start: new Date(),
      movies: [],
      errors: [],
      summary: {}
    };
  }

  log(movie, status, error = null) {
    this.logs.movies.push({
      wpId: movie.ID,
      title: movie.post_title,
      status,
      error: error?.message,
      timestamp: new Date()
    });
    this.save();
  }

  save() {
    fs.writeFileSync('mysql-migration-log.json', JSON.stringify(this.logs, null, 2));
  }
}

const logger = new MigrationLogger();

// Funciones auxiliares
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function cleanTitle(title) {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

function extractYearFromTitle(title) {
  const match = title.match(/\((\d{4})\)$/);
  return match ? parseInt(match[1]) : null;
}

function parseReleaseDate(dateString) {
  if (!dateString) return null;
  
  // Manejar formato YYYYMMDD de WordPress
  if (/^\d{8}$/.test(dateString)) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    
    // Validar que los valores sean razonables
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (yearNum < 1800 || yearNum > 2100 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      console.warn(`⚠️  Fecha con valores fuera de rango: ${dateString}`);
      return null;
    }
    
    // Construir fecha en formato YYYY-MM-DD
    return `${year}-${month}-${day}`;
  }
  
  // Si no es formato YYYYMMDD, intentar parsear como fecha normal
  const date = new Date(dateString);
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    console.warn(`⚠️  Fecha inválida: ${dateString}`);
    return null;
  }
  
  // Formatear a YYYY-MM-DD para PostgreSQL
  return date.toISOString().split('T')[0];
}

// Función principal
async function migrateTitles() {
  let connection;
  
  try {
    console.log('🚀 Iniciando migración MySQL → Supabase\n');
    
    // Conectar a MySQL
    console.log('🔌 Conectando a MySQL local...');
    connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Conectado a MySQL\n');
    
    // Verificar conexión Supabase
    console.log('🔌 Verificando Supabase...');
    const { count } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Conectado a Supabase (${count} películas actuales)\n`);
    
    // Limpiar tabla movies antes de migrar
    console.log('🧹 Limpiando tabla movies...');
    const { error: deleteError } = await supabase
      .from('movies')
      .delete()
      .neq('id', 0); // Esto borra todos los registros
    
    if (deleteError) {
      console.error('❌ Error al limpiar tabla:', deleteError);
      throw deleteError;
    }
    console.log('✅ Tabla movies limpiada\n');
    
    // Obtener películas de MySQL
    console.log('📊 Obteniendo películas de WordPress...');
    const [movies] = await connection.execute(`
      SELECT 
        p.*,
        -- Campos meta más comunes (ajusta según tu estructura)
        pm_year.meta_value as year_meta,
        pm_duration.meta_value as duration_meta,
        pm_original.meta_value as original_title_meta,
        pm_release_date.meta_value as release_date_meta
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_year 
        ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_postmeta pm_duration 
        ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
      LEFT JOIN wp_postmeta pm_original 
        ON p.ID = pm_original.post_id AND pm_original.meta_key = 'titulo_original'
      LEFT JOIN wp_postmeta pm_release_date 
        ON p.ID = pm_release_date.post_id AND pm_release_date.meta_key = 'fecha_de_estreno'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status IN ('publish', 'draft')
      ORDER BY p.ID
    `);
    
    console.log(`✅ ${movies.length} películas encontradas\n`);
    
    // Migrar cada película
    let migrated = 0;
    let errors = 0;
    
    for (const movie of movies) {
      try {
        // Preparar datos
        const cleanedTitle = cleanTitle(movie.post_title);
        const yearFromTitle = extractYearFromTitle(movie.post_title);
        const year = movie.year_meta || yearFromTitle || new Date().getFullYear();
        
        // Parsear fecha de estreno
        const releaseDate = parseReleaseDate(movie.release_date_meta);
        
        // Generar slug único
        let slug = movie.post_name || createSlug(cleanedTitle);
        
        // Verificar duplicados
        const { data: existing } = await supabase
          .from('movies')
          .select('id')
          .eq('slug', slug)
          .single();
          
        if (existing) {
          let counter = 1;
          while (true) {
            const newSlug = `${slug}-${counter}`;
            const { data } = await supabase
              .from('movies')
              .select('id')
              .eq('slug', newSlug)
              .single();
            if (!data) {
              slug = newSlug;
              break;
            }
            counter++;
          }
        }
        
        // Datos para Supabase
        const movieData = {
          title: cleanedTitle,
          slug: slug,
          year: parseInt(year),
          release_date: releaseDate, // Fecha de estreno migrada
          status: movie.post_status === 'publish' ? 'PUBLISHED' : 'DRAFT',
          synopsis: movie.post_content || null,
          meta_description: movie.post_excerpt || null,
          created_at: movie.post_date,
          updated_at: movie.post_modified,
          // Campos adicionales de ACF
          original_title: movie.original_title_meta || null,
          duration: movie.duration_meta ? parseInt(movie.duration_meta) : null,
          // Valores por defecto
          duration_seconds: null,
          tipo_duracion: null,
          tagline: null,
          poster_url: null,
          trailer_url: null,
          imdb_id: null,
          color_type: null,
          sound_type: null,
          certificate_number: null,
          rating_id: null,
          data_completeness: 'BASIC_PRESS_KIT',
          filming_start_date: null,
          filming_end_date: null,
          meta_keywords: []
        };
        
        console.log(`\n📽️  Migrando: "${cleanedTitle}"`);
        console.log(`   - WP ID: ${movie.ID}`);
        console.log(`   - Slug: ${slug}`);
        console.log(`   - Año: ${movieData.year}`);
        console.log(`   - Fecha de estreno: ${releaseDate || 'No especificada'}`);
        
        // Insertar en Supabase
        const { data, error } = await supabase
          .from('movies')
          .insert([movieData])
          .select()
          .single();
          
        if (error) throw error;
        
        console.log(`   ✅ Migrada con ID: ${data.id}`);
        logger.log(movie, 'success');
        migrated++;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        logger.log(movie, 'error', error);
        errors++;
      }
    }
    
    // Resumen
    console.log('\n\n📊 RESUMEN DE MIGRACIÓN');
    console.log('═══════════════════════');
    console.log(`Total de películas: ${movies.length}`);
    console.log(`✅ Migradas: ${migrated}`);
    console.log(`❌ Errores: ${errors}`);
    
    logger.logs.summary = {
      total: movies.length,
      migrated,
      errors,
      completed: new Date()
    };
    logger.save();
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Conexión MySQL cerrada');
    }
  }
}

// Función para explorar la estructura
async function exploreStructure() {
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  
  console.log('🔍 Explorando estructura de WordPress...\n');
  
  // Ver tipos de post
  const [postTypes] = await connection.execute(`
    SELECT post_type, COUNT(*) as count 
    FROM wp_posts 
    WHERE post_status = 'publish' 
    GROUP BY post_type
    ORDER BY count DESC
  `);
  
  console.log('📋 Tipos de post:');
  console.table(postTypes);
  
  // Ver meta keys para películas
  const [metaKeys] = await connection.execute(`
    SELECT DISTINCT pm.meta_key, COUNT(*) as count
    FROM wp_postmeta pm
    JOIN wp_posts p ON pm.post_id = p.ID
    WHERE p.post_type = 'pelicula'
    AND pm.meta_key NOT LIKE '\_%' -- Excluir campos ACF de referencia
    GROUP BY pm.meta_key
    ORDER BY count DESC
    LIMIT 20
  `);
  
  console.log('\n🔑 Meta keys más comunes en películas:');
  console.table(metaKeys);
  
  // Ver una película de ejemplo
  const [sample] = await connection.execute(`
    SELECT p.ID, p.post_title, pm.meta_key, pm.meta_value
    FROM wp_posts p
    LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'pelicula'
    AND p.ID = (SELECT MIN(ID) FROM wp_posts WHERE post_type = 'pelicula')
  `);
  
  if (sample.length > 0) {
    console.log('\n📽️  Ejemplo de película:');
    console.log(`ID: ${sample[0].ID}`);
    console.log(`Título: ${sample[0].post_title}`);
    console.log('\nMeta fields:');
    sample.forEach(row => {
      if (row.meta_key) {
        console.log(`  ${row.meta_key}: ${row.meta_value?.substring(0, 50)}${row.meta_value?.length > 50 ? '...' : ''}`);
      }
    });
  }
  
  await connection.end();
}

// Ejecutar
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Migración MySQL Local → Supabase
================================

Uso: node migrate-mysql-to-supabase.js [opciones]

Opciones:
  --explore   Explorar estructura de WordPress
  --clean     Limpiar películas antes de migrar
  --help      Mostrar esta ayuda

Configuración MySQL:
  Host: ${MYSQL_CONFIG.host}
  User: ${MYSQL_CONFIG.user}
  Database: ${MYSQL_CONFIG.database}
`);
} else if (args.includes('--explore')) {
  exploreStructure().catch(console.error);
} else if (args.includes('--clean')) {
  supabase
    .from('movies')
    .delete()
    .neq('id', 0)
    .then(() => {
      console.log('✅ Películas eliminadas\n');
      return migrateTitles();
    })
    .catch(console.error);
} else {
  migrateTitles().catch(console.error);
}