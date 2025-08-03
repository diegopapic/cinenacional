// find-by-creation-date.js
// Buscar las películas creadas el 10/6/2022

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function findByDate() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        console.log('🔍 Buscando películas creadas el 10/6/2022 a las 9:28 am:\n');
        
        // Buscar películas creadas en esa fecha específica
        const [moviesByDate] = await connection.execute(`
            SELECT 
                p.ID,
                p.post_title,
                p.post_name,
                p.post_status,
                p.post_type,
                p.post_date,
                p.post_modified
            FROM wp_posts p
            WHERE p.post_type = 'pelicula'
            AND p.post_date BETWEEN '2022-06-10 09:00:00' AND '2022-06-10 10:00:00'
            ORDER BY p.ID
        `);
        
        console.log(`Encontradas ${moviesByDate.length} películas creadas el 10/6/2022:\n`);
        
        for (const movie of moviesByDate) {
            console.log(`═══════════════════════════════════════════`);
            console.log(`ID: ${movie.ID}`);
            console.log(`Título: "${movie.post_title}"`);
            console.log(`Slug: ${movie.post_name}`);
            console.log(`Estado: ${movie.post_status}`);
            console.log(`Creada: ${movie.post_date}`);
            console.log(`Modificada: ${movie.post_modified}`);
            
            // Obtener metadatos clave
            const [metadata] = await connection.execute(`
                SELECT meta_key, meta_value
                FROM wp_postmeta
                WHERE post_id = ?
                AND meta_key IN ('ano', 'duracion_minutos', 'fecha_de_estreno')
                ORDER BY meta_key
            `, [movie.ID]);
            
            console.log(`\nMetadatos:`);
            metadata.forEach(m => {
                console.log(`  ${m.meta_key}: ${m.meta_value}`);
            });
            console.log('');
        }
        
        console.log('\n═══════════════════════════════════════════');
        console.log('🔍 Buscando TODAS las películas con "Adolescencia" ordenadas por fecha:\n');
        
        const [allAdolescencia] = await connection.execute(`
            SELECT 
                p.ID,
                p.post_title,
                p.post_name,
                p.post_status,
                p.post_date,
                pm_year.meta_value as year,
                pm_duration.meta_value as duration
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm_year 
                ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
            LEFT JOIN wp_postmeta pm_duration 
                ON p.ID = pm_duration.post_id AND pm_duration.meta_key = 'duracion_minutos'
            WHERE p.post_type = 'pelicula'
            AND p.post_title LIKE '%Adolescencia%'
            ORDER BY p.post_date DESC
        `);
        
        console.log(`Todas las "Adolescencia" (${allAdolescencia.length} total):\n`);
        allAdolescencia.forEach(movie => {
            console.log(`ID ${movie.ID}: "${movie.post_title}"`);
            console.log(`  Slug: ${movie.post_name}`);
            console.log(`  Año: ${movie.year || '?'}, Duración: ${movie.duration || '?'} min`);
            console.log(`  Creada: ${movie.post_date}`);
            console.log('');
        });
        
        console.log('═══════════════════════════════════════════');
        console.log('🔍 Verificando los IDs más recientes:\n');
        
        // Ver los últimos IDs creados
        const [recentMovies] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name,
                post_date
            FROM wp_posts
            WHERE post_type = 'pelicula'
            ORDER BY ID DESC
            LIMIT 10
        `);
        
        console.log('Últimas 10 películas por ID:');
        recentMovies.forEach(m => {
            console.log(`  ID ${m.ID}: ${m.post_title} (${m.post_date})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

findByDate();