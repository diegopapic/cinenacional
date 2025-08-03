// test-fechas.js
// Script simple para verificar las fechas

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function test() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        console.log('🔍 Verificando campos de fecha...\n');
        
        // 1. Contar películas con fecha_estreno
        const [count1] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM wp_posts p
            JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'pelicula'
            AND pm.meta_key = 'fecha_estreno'
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
        `);
        console.log(`Películas con fecha_estreno: ${count1[0].total}`);
        
        // 2. Contar películas con fecha_estreno_import
        const [count2] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM wp_posts p
            JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'pelicula'
            AND pm.meta_key = 'fecha_estreno_import'
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
        `);
        console.log(`Películas con fecha_estreno_import: ${count2[0].total}`);
        
        // 3. Ver 5 ejemplos de cada campo
        console.log('\n📅 Ejemplos de fecha_estreno:');
        const [samples1] = await connection.execute(`
            SELECT p.ID, p.post_title, pm.meta_value
            FROM wp_posts p
            JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'pelicula'
            AND pm.meta_key = 'fecha_estreno'
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
            LIMIT 5
        `);
        samples1.forEach(s => {
            console.log(`  ID ${s.ID}: "${s.meta_value}" - ${s.post_title.substring(0, 40)}...`);
        });
        
        console.log('\n📅 Ejemplos de fecha_estreno_import:');
        const [samples2] = await connection.execute(`
            SELECT p.ID, p.post_title, pm.meta_value
            FROM wp_posts p
            JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_type = 'pelicula'
            AND pm.meta_key = 'fecha_estreno_import'
            AND pm.meta_value IS NOT NULL
            AND pm.meta_value != ''
            LIMIT 5
        `);
        samples2.forEach(s => {
            console.log(`  ID ${s.ID}: "${s.meta_value}" - ${s.post_title.substring(0, 40)}...`);
        });
        
        // 4. Ver películas que tienen ambos campos
        console.log('\n🔍 Verificando películas con ambos campos...');
        const [both] = await connection.execute(`
            SELECT COUNT(DISTINCT p.ID) as total
            FROM wp_posts p
            JOIN wp_postmeta pm1 ON p.ID = pm1.post_id AND pm1.meta_key = 'fecha_estreno'
            JOIN wp_postmeta pm2 ON p.ID = pm2.post_id AND pm2.meta_key = 'fecha_estreno_import'
            WHERE p.post_type = 'pelicula'
            AND pm1.meta_value IS NOT NULL AND pm1.meta_value != ''
            AND pm2.meta_value IS NOT NULL AND pm2.meta_value != ''
        `);
        console.log(`Películas con AMBOS campos: ${both[0].total}`);
        
        // 5. Total de películas con al menos una fecha
        console.log('\n📊 Resumen:');
        const [total] = await connection.execute(`
            SELECT COUNT(DISTINCT p.ID) as total
            FROM wp_posts p
            WHERE p.post_type = 'pelicula'
            AND p.post_status IN ('publish', 'draft')
        `);
        
        const [withDate] = await connection.execute(`
            SELECT COUNT(DISTINCT p.ID) as total
            FROM wp_posts p
            LEFT JOIN wp_postmeta pm1 ON p.ID = pm1.post_id AND pm1.meta_key = 'fecha_estreno'
            LEFT JOIN wp_postmeta pm2 ON p.ID = pm2.post_id AND pm2.meta_key = 'fecha_estreno_import'
            WHERE p.post_type = 'pelicula'
            AND p.post_status IN ('publish', 'draft')
            AND (
                (pm1.meta_value IS NOT NULL AND pm1.meta_value != '')
                OR (pm2.meta_value IS NOT NULL AND pm2.meta_value != '')
            )
        `);
        
        console.log(`Total películas: ${total[0].total}`);
        console.log(`Con alguna fecha: ${withDate[0].total}`);
        console.log(`Sin fecha: ${total[0].total - withDate[0].total}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

test();