// debug-dates.js
// Script mínimo para ver qué está pasando con fecha_de_estreno

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function debug() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        // 1. Verificar que la tabla wp_postmeta existe y tiene datos
        console.log('1. Verificando tabla wp_postmeta...');
        const [metaCount] = await connection.execute(`
            SELECT COUNT(*) as total FROM wp_postmeta
        `);
        console.log(`   Total registros en wp_postmeta: ${metaCount[0].total}\n`);
        
        // 2. Buscar TODOS los meta_key que existen para películas
        console.log('2. Buscando TODOS los meta_key para películas...');
        const [allKeys] = await connection.execute(`
            SELECT DISTINCT meta_key, COUNT(*) as count
            FROM wp_postmeta pm
            JOIN wp_posts p ON pm.post_id = p.ID
            WHERE p.post_type = 'pelicula'
            GROUP BY meta_key
            ORDER BY count DESC
            LIMIT 20
        `);
        console.log('   Meta keys más comunes:');
        allKeys.forEach(key => {
            console.log(`   - ${key.meta_key}: ${key.count} registros`);
        });
        
        // 3. Buscar específicamente fecha_de_estreno
        console.log('\n3. Buscando específicamente "fecha_de_estreno"...');
        const [fechaCount] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM wp_postmeta
            WHERE meta_key = 'fecha_de_estreno'
        `);
        console.log(`   Total registros con meta_key='fecha_de_estreno': ${fechaCount[0].total}`);
        
        // 4. Si existe, ver algunos valores
        if (fechaCount[0].total > 0) {
            const [samples] = await connection.execute(`
                SELECT post_id, meta_value
                FROM wp_postmeta
                WHERE meta_key = 'fecha_de_estreno'
                AND meta_value IS NOT NULL
                AND meta_value != ''
                LIMIT 5
            `);
            console.log('\n   Ejemplos de valores:');
            samples.forEach(s => {
                console.log(`   - Post ${s.post_id}: "${s.meta_value}"`);
            });
        }
        
        // 5. Verificar la codificación de caracteres
        console.log('\n4. Verificando codificación...');
        const [encoding] = await connection.execute(`
            SHOW VARIABLES LIKE 'character_set%'
        `);
        console.log('   Configuración de caracteres:');
        encoding.forEach(e => {
            console.log(`   - ${e.Variable_name}: ${e.Value}`);
        });
        
        // 6. Probar con BINARY para ver si es un problema de encoding
        console.log('\n5. Buscando "fecha_de_estreno" con comparación BINARY...');
        const [binarySearch] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM wp_postmeta
            WHERE BINARY meta_key = 'fecha_de_estreno'
        `);
        console.log(`   Con BINARY: ${binarySearch[0].total} registros`);
        
        // 7. Buscar variaciones del nombre
        console.log('\n6. Buscando variaciones del nombre...');
        const [variations] = await connection.execute(`
            SELECT DISTINCT meta_key, COUNT(*) as count
            FROM wp_postmeta
            WHERE meta_key LIKE '%fecha%' 
               OR meta_key LIKE '%estreno%'
               OR meta_key LIKE '%release%'
               OR meta_key LIKE '%date%'
            GROUP BY meta_key
        `);
        console.log('   Posibles variaciones encontradas:');
        variations.forEach(v => {
            console.log(`   - "${v.meta_key}": ${v.count} registros`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debug();