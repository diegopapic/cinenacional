// 01-migrate-movies-core.js
// Migración BÁSICA de películas WordPress → Supabase preservando IDs, slugs y fechas

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

// Configuración Supabase - COPIADA EXACTAMENTE del script general
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logger simple
class BasicMigrationLogger {
    constructor() {
        this.logs = {
            start: new Date(),
            movies: [],
            errors: [],
            stats: {
                withReleaseDate: 0,
                withoutReleaseDate: 0,
                invalidDates: 0
            },
            summary: {}
        };
    }

    logMovie(wpId, title, status, error = null, releaseDate = null) {
        this.logs.movies.push({
            wpId,
            title,
            status,
            releaseDate,
            error: error?.message,
            timestamp: new Date()
        });
        
        if (status === 'success' || status === 'updated') {
            if (releaseDate) {
                this.logs.stats.withReleaseDate++;
            } else {
                this.logs.stats.withoutReleaseDate++;
            }
        }
    }

    save() {
        fs.writeFileSync('migration-basic-log.json', JSON.stringify(this.logs, null, 2));
    }
}

const logger = new BasicMigrationLogger();

// Función auxiliar - EXACTAMENTE del script general
function cleanTitle(title) {
    return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

// Función auxiliar - EXACTAMENTE del script general
function extractYearFromTitle(title) {
    const match = title.match(/\((\d{4})\)$/);
    return match ? parseInt(match[1]) : null;
}

// Función parseReleaseDate - COPIADA EXACTAMENTE del script general
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

// Función principal de migración básica
async function migrateBasic() {
    let connection;

    try {
        console.log('🚀 Iniciando migración BÁSICA MySQL → Supabase (preservando IDs, slugs y fechas)\n');

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

        // Limpiar tabla si se especifica
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

        // Obtener películas de MySQL - CONSULTA COPIADA EXACTAMENTE DEL SCRIPT GENERAL
        console.log('📊 Obteniendo películas de WordPress con datos básicos...');
        const [movies] = await connection.execute(`
            SELECT 
                p.*,
                -- Campos meta existentes
                pm_year.meta_value as year_meta,
                pm_duration.meta_value as duration_meta,
                pm_original.meta_value as original_title_meta,
                pm_release_date.meta_value as release_date_meta,
                pm_release_date_import.meta_value as release_date_import_meta,
                pm_sound.meta_value as sound_meta,
                -- Clasificación
                pm_classification.meta_value as classification_meta,
                -- Coproducción
                pm_coproduction.meta_value as coproduction_data,
                -- Color desde taxonomía
                t_color.term_id as color_term_id,
                t_color.name as color_name,
                t_color.slug as color_slug,
                -- Clasificación desde taxonomía
                t_class.name as classification_taxonomy_name,
                t_class.term_id as classification_term_id
            FROM wp_posts p
            -- Meta fields existentes
            LEFT JOIN wp_postmeta pm_year 
                ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
            LEFT JOIN wp_postmeta pm_duration 
                ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
            LEFT JOIN wp_postmeta pm_original 
                ON p.ID = pm_original.post_id AND pm_original.meta_key = 'titulo_original'
            LEFT JOIN wp_postmeta pm_release_date 
                ON p.ID = pm_release_date.post_id AND pm_release_date.meta_key = 'fecha_estreno'
            LEFT JOIN wp_postmeta pm_release_date_import 
                ON p.ID = pm_release_date_import.post_id AND pm_release_date_import.meta_key = 'fecha_estreno_import'
            LEFT JOIN wp_postmeta pm_sound 
                ON p.ID = pm_sound.post_id AND pm_sound.meta_key = 'sonido'
            -- Clasificación meta
            LEFT JOIN wp_postmeta pm_classification 
                ON p.ID = pm_classification.post_id AND pm_classification.meta_key = 'clasificacion'
            -- Coproducción meta
            LEFT JOIN wp_postmeta pm_coproduction 
                ON p.ID = pm_coproduction.post_id AND pm_coproduction.meta_key = 'coproduccion'
            -- Color taxonomy
            LEFT JOIN wp_term_relationships tr_color 
                ON p.ID = tr_color.object_id
            LEFT JOIN wp_term_taxonomy tt_color 
                ON tr_color.term_taxonomy_id = tt_color.term_taxonomy_id AND tt_color.taxonomy = 'color'
            LEFT JOIN wp_terms t_color 
                ON tt_color.term_id = t_color.term_id
            -- Clasificación taxonomy
            LEFT JOIN wp_term_relationships tr_class 
                ON p.ID = tr_class.object_id
            LEFT JOIN wp_term_taxonomy tt_class 
                ON tr_class.term_taxonomy_id = tt_class.term_taxonomy_id AND tt_class.taxonomy = 'clasificacion'
            LEFT JOIN wp_terms t_class 
                ON tt_class.term_id = t_class.term_id
            WHERE p.post_type = 'pelicula' 
            AND p.post_status IN ('publish', 'draft')
            ORDER BY p.ID
        `);

        console.log(`✅ ${movies.length} películas encontradas\n`);

        // Migrar cada película
        let migrated = 0;
        let updated = 0;
        let errors = 0;
        let withDate = 0;
        let withoutDate = 0;

        for (const movie of movies) {
            try {
                // Preparar datos básicos - EXACTAMENTE como el script general
                const cleanedTitle = cleanTitle(movie.post_title);
                const yearFromTitle = extractYearFromTitle(movie.post_title);
                const year = movie.year_meta || yearFromTitle || null;

                // Parsear fecha de estreno - Primero intenta fecha_estreno, luego fecha_estreno_import
                const releaseDate = parseReleaseDate(movie.release_date_meta || movie.release_date_import_meta);
                
                // Contar estadísticas
                if (releaseDate) {
                    withDate++;
                } else {
                    withoutDate++;
                }

                // Usar el slug de WordPress tal cual
                const slug = movie.post_name;

                // Verificar si el ID ya existe
                const { data: existingById } = await supabase
                    .from('movies')
                    .select('id, slug')
                    .eq('id', parseInt(movie.ID))
                    .single();

                // Datos para Supabase
                const movieData = {
                    id: parseInt(movie.ID),
                    title: cleanedTitle,
                    slug: slug,
                    status: movie.post_status === 'publish' ? 'PUBLISHED' : 'DRAFT',
                    synopsis: movie.post_content || null,
                    created_at: movie.post_date,
                    updated_at: movie.post_modified,
                    year: year ? parseInt(year) : null,
                    duration: movie.duration_meta ? parseInt(movie.duration_meta) : null,
                    release_date: releaseDate,
                    original_title: movie.original_title_meta || null,
                    // Campos que necesita la tabla pero no migraremos ahora
                    meta_description: null,
                    duration_seconds: null,
                    tipo_duracion: null,
                    tagline: null,
                    poster_url: null,
                    trailer_url: null,
                    imdb_id: null,
                    data_completeness: 'BASIC_PRESS_KIT',
                    filming_start_date: null,
                    filming_end_date: null,
                    meta_keywords: []
                };

                console.log(`\n📽️  Procesando: "${cleanedTitle}"`);
                console.log(`   - WP ID: ${movie.ID}`);
                console.log(`   - Slug: ${slug}`);
                console.log(`   - Año: ${year || 'No especificado'}`);
                if (movie.duration_meta) {
                    console.log(`   - Duración: ${movie.duration_meta} minutos`);
                }
                if (releaseDate) {
                    console.log(`   - Fecha de estreno: ${releaseDate} (de ${movie.release_date_meta ? 'fecha_estreno' : 'fecha_estreno_import'})`);
                }

                if (existingById) {
                    // Actualizar registro existente
                    console.log(`   ⚠️  ID ${movie.ID} ya existe, actualizando...`);
                    
                    const { data, error } = await supabase
                        .from('movies')
                        .update(movieData)
                        .eq('id', parseInt(movie.ID))
                        .select()
                        .single();

                    if (error) throw error;

                    console.log(`   ✅ Actualizada`);
                    logger.logMovie(movie.ID, cleanedTitle, 'updated', null, releaseDate);
                    updated++;
                } else {
                    // Insertar nuevo registro
                    const { data, error } = await supabase
                        .from('movies')
                        .insert([movieData])
                        .select()
                        .single();

                    if (error) throw error;

                    console.log(`   ✅ Migrada con ID: ${data.id}`);
                    logger.logMovie(movie.ID, cleanedTitle, 'success', null, releaseDate);
                    migrated++;
                }

            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                logger.logMovie(movie.ID, movie.post_title, 'error', error);
                errors++;
            }
        }

        // Actualizar la secuencia de PostgreSQL
        console.log('\n🔧 Actualizando secuencia de IDs...');
        const { data: maxIdResult } = await supabase
            .from('movies')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (maxIdResult) {
            console.log(`   ID máximo encontrado: ${maxIdResult.id}`);
            console.log(`   ⚠️  IMPORTANTE: Ejecuta este SQL en Supabase:`);
            console.log(`   SELECT setval('movies_id_seq', ${maxIdResult.id + 1});`);
        }

        // Resumen
        console.log('\n\n📊 RESUMEN DE MIGRACIÓN BÁSICA');
        console.log('═══════════════════════════════');
        console.log(`Total de películas procesadas: ${movies.length}`);
        console.log(`✅ Nuevas migradas: ${migrated}`);
        console.log(`🔄 Actualizadas: ${updated}`);
        console.log(`❌ Errores: ${errors}`);
        console.log('\n📅 Estadísticas de fechas:');
        console.log(`   - Con fecha de estreno: ${withDate}`);
        console.log(`   - Sin fecha de estreno: ${withoutDate}`);

        logger.logs.summary = {
            total: movies.length,
            migrated,
            updated,
            errors,
            dates: {
                withDate,
                withoutDate
            },
            completed: new Date()
        };
        logger.save();

        console.log('\n✅ Log guardado en: migration-basic-log.json');

    } catch (error) {
        console.error('❌ Error fatal:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Conexión MySQL cerrada');
        }
    }
}

// Función para verificar fechas antes de migrar
async function checkDates() {
    let connection;
    
    try {
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('📅 Verificando fechas en WordPress...\n');
        
        // Contar películas con fecha_de_estreno
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT p.ID) as total_movies,
                COUNT(DISTINCT CASE 
                    WHEN pm.meta_value IS NOT NULL AND pm.meta_value != '' 
                    THEN p.ID 
                END) as with_release_date
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm 
                ON p.ID = pm.post_id AND pm.meta_key = 'fecha_estreno'
            WHERE p.post_type = 'pelicula' 
            AND p.post_status IN ('publish', 'draft')
        `);
        
        console.log('Estadísticas:');
        console.log(`- Total películas: ${stats[0].total_movies}`);
        console.log(`- Con fecha_estreno: ${stats[0].with_fecha_estreno}`);
        console.log(`- Con fecha_estreno_import: ${stats[0].with_fecha_estreno_import}`);
        console.log(`- Con alguna fecha de estreno: ${stats[0].with_any_release_date}`);
        console.log(`- Sin fecha de estreno: ${stats[0].total_movies - stats[0].with_any_release_date}`);
        
        // Ver algunas muestras
        const [samples] = await connection.execute(`
            SELECT 
                p.ID,
                p.post_title,
                pm.meta_value as fecha_estreno
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm 
                ON p.ID = pm.post_id AND pm.meta_key = 'fecha_de_estreno'
            WHERE p.post_type = 'pelicula' 
            AND p.post_status IN ('publish', 'draft')
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
            ORDER BY p.ID DESC
            LIMIT 10
        `);
        
        if (samples.length > 0) {
            console.log('\nMuestras de fechas encontradas:');
            samples.forEach(sample => {
                const fecha = sample.fecha_estreno || sample.fecha_estreno_import;
                const origen = sample.fecha_estreno ? 'fecha_estreno' : 'fecha_estreno_import';
                const parsed = parseReleaseDate(fecha);
                console.log(`ID ${sample.ID}: "${fecha}" (${origen}) → ${parsed || 'INVÁLIDA'}`);
            });
        }
        
    } finally {
        if (connection) await connection.end();
    }
}

// Ejecutar
const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log(`
Migración Básica WordPress → Supabase (Campos Core)
====================================================

Uso: node 01-migrate-movies-core.js [opciones]

Opciones:
  --migrate        Ejecutar migración básica
  --clean          Limpiar tabla movies antes de migrar
  --check-dates    Verificar fechas antes de migrar
  --help           Mostrar esta ayuda

Campos migrados:
  - id (preservado de WordPress)
  - title
  - slug (preservado de WordPress)
  - year
  - duration
  - release_date
  - original_title
  - synopsis
  - status
  - created_at
  - updated_at

Configuración:
  MySQL Host: ${MYSQL_CONFIG.host}
  MySQL Database: ${MYSQL_CONFIG.database}
  Supabase URL: ${SUPABASE_URL}
`);
} else if (args.includes('--migrate')) {
    migrateBasic().catch(console.error);
} else if (args.includes('--check-dates')) {
    checkDates().catch(console.error);
} else {
    console.log('Usa --help para ver las opciones disponibles');
    console.log('Para verificar fechas: node 01-migrate-movies-core.js --check-dates');
    console.log('Para ejecutar la migración: node 01-migrate-movies-core.js --migrate --clean');
}