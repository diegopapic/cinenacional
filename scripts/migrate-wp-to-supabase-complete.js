// migrate-wp-to-supabase-complete.js
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

// Mapeo de IDs de WordPress a slugs de color_types
const WP_COLOR_MAPPING = {
  '9214': 'blanco-y-negro',           // Blanco y Negro
  '5': 'color',                        // Color
  '9212': 'color-eastmancolor',       // Color (Eastmancolor)
  '9300': 'blanco-y-negro-color',     // Blanco y Negro / Color
  '9260': 'color-ferraniacolor',      // Color (FerraniaColor)
  '9219': 'color-agfacolor',          // Color (Agfacolor)
  '9249': 'color-fujicolor',          // Color (FujiColor)
  '9315': 'color-technicolor',        // Color (Technicolor)
  '9289': 'color-gevacolor',          // Color (GevaColor)
  '9325': 'color-kodak-color',        // Color (Kodak Color)
  '9247': 'color-super-eastmancolor', // Color (Super Eastmancolor)
  '9229': 'n-d'                        // n/d
};

// Mapeo de valores de sonido desde postmeta
const WP_SOUND_MAPPING = {
  '3': 'sonora',    // Sonora (10,390 películas)
  '2': 'muda',      // Muda (172 películas)
  '1': 'n-d'        // n/d - no disponible (20 películas)
};

// Logger mejorado
class MigrationLogger {
  constructor() {
    this.logs = {
      start: new Date(),
      movies: [],
      errors: [],
      colors: {
        mapped: 0,
        notFound: 0,
        errors: 0
      },
      sound: {
        mapped: 0,
        notFound: 0,
        errors: 0
      },
      summary: {}
    };
  }

  logMovie(movie, status, error = null) {
    this.logs.movies.push({
      wpId: movie.ID,
      title: movie.post_title,
      status,
      error: error?.message,
      timestamp: new Date()
    });
  }

  logColor(movieTitle, colorName, status) {
    if (status === 'mapped') this.logs.colors.mapped++;
    else if (status === 'not_found') this.logs.colors.notFound++;
    else if (status === 'error') this.logs.colors.errors++;
  }

  logSound(movieTitle, soundValue, status) {
    if (status === 'mapped') this.logs.sound.mapped++;
    else if (status === 'not_found') this.logs.sound.notFound++;
    else if (status === 'error') this.logs.sound.errors++;
  }

  save() {
    fs.writeFileSync('wp-complete-migration-log.json', JSON.stringify(this.logs, null, 2));
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

// Función principal de migración completa
async function migrateComplete() {
  let connection;
  
  try {
    console.log('🚀 Iniciando migración completa MySQL → Supabase\n');
    
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
    
    // Obtener mapeo de color_types desde Supabase
    console.log('🎨 Obteniendo tipos de color desde Supabase...');
    const { data: colorTypes, error: colorError } = await supabase
      .from('color_types')
      .select('id, slug');
      
    if (colorError) throw colorError;
    
    // Crear mapa slug -> id
    const colorTypeMap = {};
    colorTypes.forEach(ct => {
      colorTypeMap[ct.slug] = ct.id;
    });
    
    console.log(`✅ ${colorTypes.length} tipos de color encontrados\n`);
    
    // Limpiar tabla movies antes de migrar (opcional)
    if (process.argv.includes('--clean')) {
      console.log('🧹 Limpiando tabla movies...');
      const { error: deleteError } = await supabase
        .from('movies')
        .delete()
        .neq('id', 0);
      
      if (deleteError) {
        console.error('❌ Error al limpiar tabla:', deleteError);
        throw deleteError;
      }
      console.log('✅ Tabla movies limpiada\n');
    }
    
    // Obtener películas de MySQL con información de color y sonido
    console.log('📊 Obteniendo películas de WordPress con datos de color y sonido...');
    const [movies] = await connection.execute(`
      SELECT 
        p.*,
        -- Campos meta
        pm_year.meta_value as year_meta,
        pm_duration.meta_value as duration_meta,
        pm_original.meta_value as original_title_meta,
        pm_release_date.meta_value as release_date_meta,
        pm_sound.meta_value as sound_meta,
        -- Color desde taxonomía
        t_color.term_id as color_term_id,
        t_color.name as color_name,
        t_color.slug as color_slug
      FROM wp_posts p
      -- Meta fields
      LEFT JOIN wp_postmeta pm_year 
        ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_postmeta pm_duration 
        ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
      LEFT JOIN wp_postmeta pm_original 
        ON p.ID = pm_original.post_id AND pm_original.meta_key = 'titulo_original'
      LEFT JOIN wp_postmeta pm_release_date 
        ON p.ID = pm_release_date.post_id AND pm_release_date.meta_key = 'fecha_de_estreno'
      LEFT JOIN wp_postmeta pm_sound 
        ON p.ID = pm_sound.post_id AND pm_sound.meta_key = 'sonido'
      -- Color taxonomy
      LEFT JOIN wp_term_relationships tr_color 
        ON p.ID = tr_color.object_id
      LEFT JOIN wp_term_taxonomy tt_color 
        ON tr_color.term_taxonomy_id = tt_color.term_taxonomy_id AND tt_color.taxonomy = 'color'
      LEFT JOIN wp_terms t_color 
        ON tt_color.term_id = t_color.term_id
      WHERE p.post_type = 'pelicula' 
      AND p.post_status IN ('publish', 'draft')
      ORDER BY p.ID
    `);
    
    console.log(`✅ ${movies.length} registros encontrados\n`);
    
    // Agrupar por película (puede haber duplicados por múltiples colores)
    const moviesMap = new Map();
    movies.forEach(movie => {
      if (!moviesMap.has(movie.ID)) {
        moviesMap.set(movie.ID, movie);
      }
    });
    
    console.log(`📽️  ${moviesMap.size} películas únicas para migrar\n`);
    
    // Migrar cada película
    let migrated = 0;
    let errors = 0;
    
    for (const [wpId, movie] of moviesMap) {
      try {
        // Preparar datos básicos
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
        
        // Determinar color_type_id
        let colorTypeId = null;
        if (movie.color_term_id) {
          const mappedSlug = WP_COLOR_MAPPING[movie.color_term_id.toString()];
          if (mappedSlug && colorTypeMap[mappedSlug]) {
            colorTypeId = colorTypeMap[mappedSlug];
            logger.logColor(cleanedTitle, movie.color_name, 'mapped');
          } else {
            console.warn(`⚠️  Color no mapeado: ${movie.color_name} (ID: ${movie.color_term_id})`);
            logger.logColor(cleanedTitle, movie.color_name, 'not_found');
          }
        } else {
          // Si no tiene color, asignar "No disponible"
          colorTypeId = colorTypeMap['n-d'];
          logger.logColor(cleanedTitle, 'Sin color', 'mapped');
        }
        
        // Determinar sound_type
        let soundType = null;
        if (movie.sound_meta) {
          const mappedSound = WP_SOUND_MAPPING[movie.sound_meta.toString()];
          if (mappedSound) {
            // Capitalizar correctamente para que coincida con el dropdown del ABM
            if (mappedSound === 'sonora') {
              soundType = 'Sonora';
            } else if (mappedSound === 'muda') {
              soundType = 'Muda';
            } else {
              soundType = 'n/d'; // o podrías usar null si prefieres
            }
            logger.logSound(cleanedTitle, movie.sound_meta, 'mapped');
          } else {
            console.warn(`⚠️  Sonido no mapeado: valor ${movie.sound_meta}`);
            logger.logSound(cleanedTitle, movie.sound_meta, 'not_found');
            soundType = null; // Por defecto null si no se puede mapear
          }
        } else {
          // Si no tiene sonido, dejar como null
          soundType = null;
          logger.logSound(cleanedTitle, 'Sin sonido', 'mapped');
        }
        
        // Datos para Supabase
        const movieData = {
          title: cleanedTitle,
          slug: slug,
          year: parseInt(year),
          release_date: releaseDate,
          status: movie.post_status === 'publish' ? 'PUBLISHED' : 'DRAFT',
          synopsis: movie.post_content || null,
          meta_description: movie.post_excerpt || null,
          created_at: movie.post_date,
          updated_at: movie.post_modified,
          // Campos adicionales
          original_title: movie.original_title_meta || null,
          duration: movie.duration_meta ? parseInt(movie.duration_meta) : null,
          // Color migrado
          color_type_id: colorTypeId,
          // Sonido migrado
          sound_type: soundType,
          // Valores por defecto
          duration_seconds: null,
          tipo_duracion: null,
          tagline: null,
          poster_url: null,
          trailer_url: null,
          imdb_id: null,
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
        console.log(`   - Color: ${movie.color_name || 'No disponible'}`);
        console.log(`   - Sonido: ${soundType}`);
        console.log(`   - Fecha de estreno: ${releaseDate || 'No especificada'}`);
        
        // Insertar en Supabase
        const { data, error } = await supabase
          .from('movies')
          .insert([movieData])
          .select()
          .single();
          
        if (error) throw error;
        
        console.log(`   ✅ Migrada con ID: ${data.id}`);
        logger.logMovie(movie, 'success');
        migrated++;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        logger.logMovie(movie, 'error', error);
        logger.logColor(movie.post_title, movie.color_name, 'error');
        logger.logSound(movie.post_title, movie.sound_meta, 'error');
        errors++;
      }
    }
    
    // Resumen
    console.log('\n\n📊 RESUMEN DE MIGRACIÓN COMPLETA');
    console.log('════════════════════════════════');
    console.log(`Total de películas: ${moviesMap.size}`);
    console.log(`✅ Migradas: ${migrated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('\n🎨 Colores:');
    console.log(`   - Mapeados correctamente: ${logger.logs.colors.mapped}`);
    console.log(`   - No encontrados: ${logger.logs.colors.notFound}`);
    console.log(`   - Errores: ${logger.logs.colors.errors}`);
    console.log('\n🔊 Sonido:');
    console.log(`   - Mapeados correctamente: ${logger.logs.sound.mapped}`);
    console.log(`   - No encontrados: ${logger.logs.sound.notFound}`);
    console.log(`   - Errores: ${logger.logs.sound.errors}`);
    
    // Verificar distribución de colores
    console.log('\n📊 Verificando distribución de colores en Supabase...');
    const { data: colorStats } = await supabase
      .from('color_types_with_counts')
      .select('name, category, movie_count')
      .order('movie_count', { ascending: false });
      
    if (colorStats) {
      console.log('\nDistribución final:');
      colorStats.forEach(stat => {
        if (stat.movie_count > 0) {
          console.log(`  - ${stat.name}: ${stat.movie_count} películas`);
        }
      });
    }
    
    // Verificar distribución de sonido
    console.log('\n📊 Verificando distribución de sonido en Supabase...');
    const { data: soundStats } = await supabase
      .from('movies')
      .select('sound_type')
      .not('sound_type', 'is', null);
      
    if (soundStats) {
      const soundCounts = soundStats.reduce((acc, movie) => {
        acc[movie.sound_type] = (acc[movie.sound_type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nDistribución de sonido:');
      Object.entries(soundCounts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} películas`);
      });
    }
    
    logger.logs.summary = {
      total: moviesMap.size,
      migrated,
      errors,
      colors: logger.logs.colors,
      sound: logger.logs.sound,
      completed: new Date()
    };
    logger.save();
    
    console.log('\n✅ Log guardado en: wp-complete-migration-log.json');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Conexión MySQL cerrada');
    }
  }
}

// Función para verificar el mapeo de colores
async function verifyColorMapping() {
  let connection;
  
  try {
    connection = await mysql.createConnection(MYSQL_CONFIG);
    
    console.log('🔍 Verificando mapeo de colores...\n');
    
    const [colors] = await connection.execute(`
      SELECT DISTINCT
        t.term_id,
        t.name,
        t.slug,
        COUNT(DISTINCT tr.object_id) as movie_count
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      INNER JOIN wp_posts p ON tr.object_id = p.ID
      WHERE tt.taxonomy = 'color'
      AND p.post_type = 'pelicula'
      GROUP BY t.term_id, t.name, t.slug
      ORDER BY movie_count DESC
    `);
    
    console.log('Colores en WordPress vs Mapeo:');
    console.log('================================\n');
    
    let mapped = 0;
    let notMapped = 0;
    
    colors.forEach(color => {
      const mappedSlug = WP_COLOR_MAPPING[color.term_id.toString()];
      const status = mappedSlug ? '✅' : '❌';
      
      console.log(`${status} ID: ${color.term_id}`);
      console.log(`   Nombre: ${color.name}`);
      console.log(`   Slug WP: ${color.slug}`);
      console.log(`   Películas: ${color.movie_count}`);
      
      if (mappedSlug) {
        console.log(`   → Mapea a: ${mappedSlug}`);
        mapped++;
      } else {
        console.log(`   ⚠️  NO MAPEADO`);
        notMapped++;
      }
      console.log('');
    });
    
    console.log('================================');
    console.log(`Total: ${colors.length} colores`);
    console.log(`✅ Mapeados: ${mapped}`);
    console.log(`❌ Sin mapear: ${notMapped}`);
    
  } finally {
    if (connection) await connection.end();
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
  
  // Ver taxonomías
  const [taxonomies] = await connection.execute(`
    SELECT DISTINCT taxonomy, COUNT(*) as count
    FROM wp_term_taxonomy
    GROUP BY taxonomy
    ORDER BY count DESC
  `);
  
  console.log('\n📁 Taxonomías:');
  console.table(taxonomies);
  
  // Ver meta keys para películas
  const [metaKeys] = await connection.execute(`
    SELECT DISTINCT pm.meta_key, COUNT(*) as count
    FROM wp_postmeta pm
    JOIN wp_posts p ON pm.post_id = p.ID
    WHERE p.post_type = 'pelicula'
    AND pm.meta_key NOT LIKE '\_%'
    GROUP BY pm.meta_key
    ORDER BY count DESC
    LIMIT 30
  `);
  
  console.log('\n🔑 Meta keys más comunes en películas:');
  console.table(metaKeys);
  
  await connection.end();
}

// Ejecutar
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Migración Completa WordPress → Supabase
======================================

Uso: node migrate-wp-to-supabase-complete.js [opciones]

Opciones:
  --migrate        Ejecutar migración completa (películas + colores + sonido)
  --clean          Limpiar tabla movies antes de migrar
  --verify-colors  Verificar mapeo de colores
  --explore        Explorar estructura de WordPress
  --help           Mostrar esta ayuda

Configuración:
  MySQL Host: ${MYSQL_CONFIG.host}
  MySQL Database: ${MYSQL_CONFIG.database}
  Supabase URL: ${SUPABASE_URL}

Nota: Asegúrate de haber ejecutado las migraciones de Prisma
      para crear la estructura de color_types antes de migrar.
`);
} else if (args.includes('--verify-colors')) {
  verifyColorMapping().catch(console.error);
} else if (args.includes('--explore')) {
  exploreStructure().catch(console.error);
} else if (args.includes('--migrate')) {
  migrateComplete().catch(console.error);
} else {
  console.log('Usa --help para ver las opciones disponibles');
  console.log('Para ejecutar la migración completa: node migrate-wp-to-supabase-complete.js --migrate');
}