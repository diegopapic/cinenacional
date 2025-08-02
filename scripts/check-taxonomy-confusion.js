// check-taxonomy-confusion.js
import mysql from 'mysql2/promise';

// Configuración MySQL local
const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '', // Tu contraseña de MySQL
    database: 'wordpress_cine',
    port: 3306
};

// Verificar términos de diferentes taxonomías
async function checkTaxonomyConfusion() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    console.log('🔍 Verificando posible confusión de taxonomías...\n');
    
    // Buscar términos que podrían causar confusión
    const [confusingTerms] = await connection.execute(`
        SELECT 
            t.name as term_name,
            tt.taxonomy,
            COUNT(DISTINCT tr.object_id) as usage_count
        FROM wp_terms t
        INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
        INNER JOIN wp_posts p ON tr.object_id = p.ID
        WHERE (t.name LIKE '%Inconveniente%' 
           OR t.name LIKE '%niños%'
           OR t.name LIKE '%inédita%')
        AND p.post_type = 'pelicula'
        GROUP BY t.name, tt.taxonomy
        ORDER BY tt.taxonomy, t.name
    `);
    
    console.log('Términos encontrados que podrían causar confusión:');
    console.log('================================================\n');
    confusingTerms.forEach(term => {
        console.log(`- "${term.term_name}" en taxonomía "${term.taxonomy}" (${term.usage_count} películas)`);
    });
    
    // Verificar específicamente las películas mencionadas
    const testMovies = [
        'Asesinato en tres variantes con dos incógnitas y un maniquí', 
        "Academia 'El tango argentino'"
    ];
    
    for (const title of testMovies) {
        console.log(`\n\n📽️  Verificando: "${title}"`);
        console.log('================================');
        
        const [movieTerms] = await connection.execute(`
            SELECT 
                p.ID,
                t.name as term_name,
                tt.taxonomy,
                t.term_id
            FROM wp_posts p
            INNER JOIN wp_term_relationships tr ON p.ID = tr.object_id
            INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            INNER JOIN wp_terms t ON tt.term_id = t.term_id
            WHERE p.post_title = ?
              AND p.post_type = 'pelicula'
            ORDER BY tt.taxonomy
        `, [title]);
        
        console.log('Términos asociados:');
        movieTerms.forEach(term => {
            console.log(`  - [${term.taxonomy}] ${term.term_name} (ID: ${term.term_id})`);
        });
        
        // Verificar también el valor en postmeta
        const [metaData] = await connection.execute(`
            SELECT 
                pm.meta_key,
                pm.meta_value
            FROM wp_posts p
            INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
            WHERE p.post_title = ?
              AND p.post_type = 'pelicula'
              AND pm.meta_key = 'clasificacion'
        `, [title]);
        
        console.log('\nValor en postmeta:');
        metaData.forEach(meta => {
            console.log(`  - ${meta.meta_key}: "${meta.meta_value}"`);
        });
    }
    
    // Buscar específicamente términos "Inconveniente" en diferentes taxonomías
    console.log('\n\n🔍 Términos "Inconveniente" por taxonomía:');
    console.log('=========================================');
    
    const [inconvenienteTerms] = await connection.execute(`
        SELECT 
            t.term_id,
            t.name,
            tt.taxonomy,
            COUNT(DISTINCT tr.object_id) as count
        FROM wp_terms t
        INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        INNER JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
        WHERE t.name LIKE '%Inconveniente%'
        GROUP BY t.term_id, t.name, tt.taxonomy
        ORDER BY tt.taxonomy, count DESC
    `);
    
    inconvenienteTerms.forEach(term => {
        console.log(`ID ${term.term_id}: "${term.name}" - Taxonomía: ${term.taxonomy} (${term.count} usos)`);
    });
    
    await connection.end();
}

// Ejecutar
checkTaxonomyConfusion().catch(console.error);