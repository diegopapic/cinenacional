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
        WHERE t.name LIKE '%Inconveniente%' 
           OR t.name LIKE '%niños%'
           OR t.name LIKE '%inédita%'
        AND p.post_type = 'pelicula'
        GROUP BY t.name, tt.taxonomy
        ORDER BY tt.taxonomy, t.name
    `);
    
    console.log('Términos encontrados:');
    confusingTerms.forEach(term => {
        console.log(`- "${term.term_name}" en taxonomía "${term.taxonomy}" (${term.usage_count} películas)`);
    });
    
    // Verificar específicamente las películas mencionadas
    const testMovies = ['Asesinato en tres variantes con dos incógnitas y un maniquí', 'Academia "El tango argentino"'];
    
    for (const title of testMovies) {
        console.log(`\n\nVerificando: "${title}"`);
        
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
        
        movieTerms.forEach(term => {
            console.log(`  - [${term.taxonomy}] ${term.term_name} (ID: ${term.term_id})`);
        });
    }
    
    await connection.end();
}

// Ejecutar con: node script.js --check-confusion
if (args.includes('--check-confusion')) {
    checkTaxonomyConfusion().catch(console.error);
}