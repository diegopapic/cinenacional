// find-adolescencia-by-slugs.js
// Buscar las tres películas Adolescencia por sus slugs exactos

import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    port: 3306
};

async function findBySlugs() {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    
    try {
        console.log('🔍 Buscando las tres películas "Adolescencia" por sus slugs exactos:\n');
        
        const slugs = ['adolescencia', 'adolescencia-2', 'adolescencia-3'];
        
        for (const slug of slugs) {
            console.log(`\n═══════════════════════════════════════════`);
            console.log(`🎬 Buscando slug: "${slug}"`);
            console.log(`═══════════════════════════════════════════\n`);
            
            // Buscar el post
            const [posts] = await connection.execute(`
                SELECT 
                    ID,
                    post_title,
                    post_name,
                    post_status,
                    post_type,
                    post_date
                FROM wp_posts
                WHERE post_name = ?
                AND post_type = 'pelicula'
            `, [slug]);
            
            if (posts.length === 0) {
                console.log(`❌ No encontrado con post_type='pelicula'`);
                
                // Intentar buscar sin filtro de post_type
                const [allPosts] = await connection.execute(`
                    SELECT 
                        ID,
                        post_title,
                        post_name,
                        post_status,
                        post_type
                    FROM wp_posts
                    WHERE post_name = ?
                `, [slug]);
                
                if (allPosts.length > 0) {
                    console.log(`⚠️  Encontrado pero con post_type diferente:`);
                    allPosts.forEach(p => {
                        console.log(`   ID ${p.ID}: ${p.post_title} (tipo: ${p.post_type}, estado: ${p.post_status})`);
                    });
                } else {
                    console.log(`   No existe ningún post con este slug`);
                }
            } else {
                posts.forEach(post => {
                    console.log(`✅ ENCONTRADO:`);
                    console.log(`   ID: ${post.ID}`);
                    console.log(`   Título: ${post.post_title}`);
                    console.log(`   Slug: ${post.post_name}`);
                    console.log(`   Estado: ${post.post_status}`);
                    console.log(`   Tipo: ${post.post_type}`);
                    console.log(`   Fecha creación: ${post.post_date}`);
                    
                    // Obtener metadatos
                    console.log(`\n   METADATOS:`);
                });
                
                // Para cada post encontrado, obtener sus metadatos
                for (const post of posts) {
                    const [metadata] = await connection.execute(`
                        SELECT meta_key, meta_value
                        FROM wp_postmeta
                        WHERE post_id = ?
                        AND meta_key IN ('ano', 'duracion_minutos', 'fecha_de_estreno', 'titulo_original')
                        ORDER BY meta_key
                    `, [post.ID]);
                    
                    if (metadata.length === 0) {
                        console.log(`   (Sin metadatos relevantes)`);
                    } else {
                        metadata.forEach(m => {
                            let value = m.meta_value || '(vacío)';
                            if (m.meta_key === 'fecha_de_estreno' && value !== '(vacío)' && /^\d{8}$/.test(value)) {
                                const year = value.substring(0, 4);
                                const month = value.substring(4, 6);
                                const day = value.substring(6, 8);
                                value = `${value} → ${year}-${month}-${day}`;
                            }
                            console.log(`   - ${m.meta_key}: ${value}`);
                        });
                    }
                }
            }
        }
        
        console.log(`\n\n═══════════════════════════════════════════`);
        console.log(`📊 RESUMEN: Buscando TODAS las películas que contengan "adolescencia" en el slug:`);
        console.log(`═══════════════════════════════════════════\n`);
        
        const [allAdolescencia] = await connection.execute(`
            SELECT 
                ID,
                post_title,
                post_name,
                post_status,
                post_type
            FROM wp_posts
            WHERE post_name LIKE '%adolescencia%'
            AND post_type = 'pelicula'
            ORDER BY ID
        `);
        
        console.log(`Encontradas ${allAdolescencia.length} películas:\n`);
        allAdolescencia.forEach(p => {
            console.log(`ID ${p.ID}: "${p.post_title}"`);
            console.log(`   Slug: ${p.post_name}`);
            console.log(`   Estado: ${p.post_status}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

findBySlugs();