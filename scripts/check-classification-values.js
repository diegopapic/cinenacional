// check-classification-values.js
import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function checkClassificationValues() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    console.log('🔍 Analizando valores de clasificación en postmeta vs taxonomía...\n');
    
    // Ver todos los valores únicos en postmeta que NO son numéricos
    const [textValues] = await connection.execute(`
        SELECT 
            pm.meta_value,
            COUNT(DISTINCT p.ID) as count
        FROM wp_postmeta pm
        INNER JOIN wp_posts p ON pm.post_id = p.ID
        WHERE pm.meta_key = 'clasificacion'
          AND p.post_type = 'pelicula'
          AND pm.meta_value IS NOT NULL
          AND pm.meta_value != ''
          AND pm.meta_value NOT REGEXP '^[0-9]+$'
        GROUP BY pm.meta_value
        ORDER BY count DESC
    `);
    
    console.log('Valores de texto en postmeta (no numéricos):');
    console.log('==========================================');
    textValues.forEach(val => {
        console.log(`"${val.meta_value}" - ${val.count} películas`);
    });
    
    // Verificar películas que tienen "Inconveniente para niños" en meta pero NO en taxonomía
    console.log('\n\n📽️  Películas con "Inconveniente para niños" en meta pero SIN término en taxonomía:');
    console.log('================================================================================');
    
    const [moviesWithProblem] = await connection.execute(`
        SELECT 
            p.ID,
            p.post_title,
            p.post_date,
            pm.meta_value as clasificacion_meta,
            t_class.name as clasificacion_taxonomia
        FROM wp_posts p
        INNER JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
        LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
        LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
        LEFT JOIN wp_terms t_class ON tt.term_id = t_class.term_id
        WHERE p.post_type = 'pelicula'
          AND pm.meta_value = 'Inconveniente para niños'
          AND t_class.name IS NULL
        ORDER BY p.post_date DESC
    `);
    
    moviesWithProblem.forEach(movie => {
        console.log(`\n- "${movie.post_title}" (ID: ${movie.ID})`);
        console.log(`  Fecha: ${movie.post_date}`);
        console.log(`  Meta: "${movie.clasificacion_meta}"`);
        console.log(`  Taxonomía: ${movie.clasificacion_taxonomia || 'SIN CLASIFICACIÓN EN TAXONOMÍA'}`);
    });
    
    console.log(`\nTotal: ${moviesWithProblem.length} películas con este problema`);
    
    await connection.end();
}

checkClassificationValues().catch(console.error);