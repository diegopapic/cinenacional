// diagnose-adolescencia.js
// Script para diagnosticar el problema con las películas "Adolescencia"

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function diagnose() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        console.log('🔍 Buscando todas las películas con "Adolescencia" en el título...\n');
        
        // Buscar todos los posts con "Adolescencia"
        const [posts] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name,
                post_status,
                post_date
            FROM wp_posts
            WHERE post_type = 'pelicula'
            AND post_title LIKE '%Adolescencia%'
            ORDER BY ID
        `);
        
        console.log(`Encontradas ${posts.length} películas:\n`);
        
        // Para cada película, obtener sus metadatos
        for (const post of posts) {
            console.log('═══════════════════════════════════════════');
            console.log(`📽️  ID: ${post.ID}`);
            console.log(`   Título: ${post.post_title}`);
            console.log(`   Slug: ${post.post_name}`);
            console.log(`   Estado: ${post.post_status}`);
            console.log(`   Fecha creación: ${post.post_date}`);
            console.log('\n   METADATOS:');
            
            // Obtener TODOS los metadatos de esta película
            const [metadata] = await connection.execute(`
                SELECT meta_key, meta_value
                FROM wp_postmeta
                WHERE post_id = ?
                AND meta_key IN ('ano', 'duracion_minutos', 'fecha_de_estreno', 'titulo_original')
                ORDER BY meta_key
            `, [post.ID]);
            
            if (metadata.length === 0) {
                console.log('   (Sin metadatos)');
            } else {
                metadata.forEach(m => {
                    let value = m.meta_value || '(vacío)';
                    if (m.meta_key === 'fecha_de_estreno' && value !== '(vacío)') {
                        // Mostrar fecha en formato legible
                        if (/^\d{8}$/.test(value)) {
                            const year = value.substring(0, 4);
                            const month = value.substring(4, 6);
                            const day = value.substring(6, 8);
                            value = `${value} → ${year}-${month}-${day}`;
                        }
                    }
                    console.log(`   - ${m.meta_key}: ${value}`);
                });
            }
            console.log('');
        }
        
        // Ahora probar el query original con LEFT JOINs para ver qué trae
        console.log('═══════════════════════════════════════════');
        console.log('\n🔍 Probando query con LEFT JOINs:\n');
        
        const [joined] = await connection.execute(`
            SELECT 
                p.ID,
                p.post_title,
                p.post_name,
                pm_year.meta_value as year_meta,
                pm_duration.meta_value as duration_meta,
                pm_release_date.meta_value as release_date_meta
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm_year 
                ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
            LEFT JOIN wp_postmeta pm_duration 
                ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
            LEFT JOIN wp_postmeta pm_release_date 
                ON p.ID = pm_release_date.post_id AND pm_release_date.meta_key = 'fecha_de_estreno'
            WHERE p.post_type = 'pelicula'
            AND p.post_title LIKE '%Adolescencia%'
            ORDER BY p.ID
        `);
        
        joined.forEach(movie => {
            console.log(`ID ${movie.ID}: ${movie.post_title}`);
            console.log(`   Slug: ${movie.post_name}`);
            console.log(`   Año (meta): ${movie.year_meta || '(sin dato)'}`);
            console.log(`   Duración: ${movie.duration_meta || '(sin dato)'} min`);
            console.log(`   Fecha estreno: ${movie.release_date_meta || '(sin dato)'}`);
            if (movie.release_date_meta && /^\d{8}$/.test(movie.release_date_meta)) {
                const year = movie.release_date_meta.substring(0, 4);
                const month = movie.release_date_meta.substring(4, 6);
                const day = movie.release_date_meta.substring(6, 8);
                console.log(`   → Fecha parseada: ${year}-${month}-${day}`);
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

diagnose();