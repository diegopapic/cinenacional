// find-all-adolescencia-wp.js
// Buscar TODAS las películas Adolescencia sin restricciones

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function findAll() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        console.log('🔍 BÚSQUEDA 1: TODAS las Adolescencia (sin filtros de estado):\n');
        
        const [allAdolescencia] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name,
                post_status,
                post_type,
                post_date,
                post_modified
            FROM wp_posts
            WHERE post_type = 'pelicula'
            AND (
                post_title LIKE '%adolescencia%' 
                OR post_title LIKE '%Adolescencia%'
                OR post_title LIKE '%ADOLESCENCIA%'
            )
            ORDER BY ID
        `);
        
        console.log(`Encontradas ${allAdolescencia.length} películas:\n`);
        
        for (const movie of allAdolescencia) {
            console.log(`═══════════════════════════════════════════`);
            console.log(`ID: ${movie.ID}`);
            console.log(`Título: "${movie.post_title}"`);
            console.log(`Slug: ${movie.post_name}`);
            console.log(`Estado: ${movie.post_status} ← IMPORTANTE`);
            console.log(`Tipo: ${movie.post_type}`);
            console.log(`Creado: ${movie.post_date}`);
            console.log(`Modificado: ${movie.post_modified}`);
            
            // Obtener metadatos
            const [metadata] = await connection.execute(`
                SELECT meta_key, meta_value
                FROM wp_postmeta
                WHERE post_id = ?
                AND meta_key IN ('ano', 'duracion_minutos', 'fecha_de_estreno')
                ORDER BY meta_key
            `, [movie.ID]);
            
            console.log(`\nMetadatos:`);
            metadata.forEach(m => {
                console.log(`  - ${m.meta_key}: ${m.meta_value || '(vacío)'}`);
            });
            console.log('');
        }
        
        console.log(`\n═══════════════════════════════════════════`);
        console.log('🔍 BÚSQUEDA 2: Verificando todos los post_status posibles:\n');
        
        const [statusCount] = await connection.execute(`
            SELECT 
                post_status,
                COUNT(*) as cantidad
            FROM wp_posts
            WHERE post_type = 'pelicula'
            GROUP BY post_status
            ORDER BY cantidad DESC
        `);
        
        console.log('Estados de las películas:');
        statusCount.forEach(s => {
            console.log(`  - ${s.post_status}: ${s.cantidad} películas`);
        });
        
        console.log(`\n═══════════════════════════════════════════`);
        console.log('🔍 BÚSQUEDA 3: Buscando por título EXACTO:\n');
        
        const [exactTitle] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name,
                post_status
            FROM wp_posts
            WHERE post_type = 'pelicula'
            AND post_title = 'Adolescencia'
            ORDER BY ID
        `);
        
        console.log(`Películas con título EXACTO "Adolescencia": ${exactTitle.length}`);
        exactTitle.forEach(m => {
            console.log(`  ID ${m.ID}: slug="${m.post_name}", estado="${m.post_status}"`);
        });
        
        console.log(`\n═══════════════════════════════════════════`);
        console.log('🔍 BÚSQUEDA 4: Buscando con TRIM para limpiar espacios:\n');
        
        const [trimmed] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                LENGTH(post_title) as longitud,
                post_name,
                post_status
            FROM wp_posts
            WHERE post_type = 'pelicula'
            AND TRIM(post_title) LIKE '%Adolescencia%'
            ORDER BY ID
        `);
        
        console.log(`Encontradas ${trimmed.length} películas (con TRIM):`);
        trimmed.forEach(m => {
            console.log(`  ID ${m.ID}: "${m.post_title}" (${m.longitud} caracteres)`);
            console.log(`    Slug: ${m.post_name}, Estado: ${m.post_status}`);
        });
        
        console.log(`\n═══════════════════════════════════════════`);
        console.log('🔍 BÚSQUEDA 5: Buscando caracteres especiales en el título:\n');
        
        const [special] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                HEX(post_title) as hex_title,
                post_name
            FROM wp_posts
            WHERE post_type = 'pelicula'
            AND post_title LIKE '%dolescencia%'
            ORDER BY ID
            LIMIT 5
        `);
        
        if (special.length > 0) {
            console.log('Títulos en hexadecimal (para detectar caracteres ocultos):');
            special.forEach(m => {
                console.log(`  ID ${m.ID}: "${m.post_title}"`);
                console.log(`    HEX: ${m.hex_title}`);
                // Decodificar hex para ver caracteres especiales
                const decoded = Buffer.from(m.hex_title, 'hex').toString('utf8');
                if (decoded !== m.post_title) {
                    console.log(`    ⚠️ Diferencia detectada: "${decoded}"`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

findAll();