const mysql = require('mysql2/promise');
const fs = require('fs').promises;

// ============================================
// CONFIGURACIÓN
// ============================================

const dbConfig = {
    host: 'localhost',
    database: 'wordpress_cine',
    user: 'root',
    password: '', // Ajustar si tienes password
    port: 3306
};

const CONFIG = {
    outputCSV: 'wp_personas_imagen_destacada.csv',
    outputJSON: 'wp_personas_imagen_destacada_stats.json'
};

// ============================================
// FUNCIONES
// ============================================

async function conectarBD() {
    console.log('📊 Conectando a base de datos WordPress...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✓ Conexión establecida\n');
    return connection;
}

async function analizarImagenesDestacadas(connection) {
    console.log('🔍 Analizando imágenes destacadas de personas...\n');

    // Query principal: obtener personas con sus imágenes destacadas
    const query = `
        SELECT 
            p.ID as persona_id,
            p.post_title as persona_nombre,
            p.post_status,
            p.post_date,
            pm.meta_value as thumbnail_id,
            img.guid as imagen_url,
            img.post_mime_type as mime_type
        FROM wp_posts p
        LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = '_thumbnail_id'
        LEFT JOIN wp_posts img ON pm.meta_value = img.ID
        WHERE p.post_type = 'persona'
        ORDER BY p.ID
    `;

    const [rows] = await connection.execute(query);

    // Estadísticas
    const stats = {
        total_personas: rows.length,
        con_imagen: 0,
        sin_imagen: 0,
        por_estado: {},
        por_mime_type: {},
        por_año: {},
        urls_problematicas: []
    };

    const personasConImagen = [];

    // Procesar resultados
    rows.forEach(row => {
        // Contador por estado
        stats.por_estado[row.post_status] = (stats.por_estado[row.post_status] || 0) + 1;

        // Contador por año de creación
        const año = new Date(row.post_date).getFullYear();
        stats.por_año[año] = (stats.por_año[año] || 0) + 1;

        // Verificar si tiene imagen
        if (row.imagen_url) {
            stats.con_imagen++;

            // Contador por tipo MIME
            stats.por_mime_type[row.mime_type] = (stats.por_mime_type[row.mime_type] || 0) + 1;

            // Verificar URLs problemáticas
            if (!row.imagen_url.includes('wp-content/uploads/')) {
                stats.urls_problematicas.push({
                    persona_id: row.persona_id,
                    nombre: row.persona_nombre,
                    url: row.imagen_url
                });
            }

            personasConImagen.push(row);
        } else {
            stats.sin_imagen++;
        }
    });

    return { stats, personasConImagen, todasLasPersonas: rows };
}

async function generarCSV(personas, outputPath) {
    console.log(`\n📄 Generando CSV: ${outputPath}`);

    const csvLines = [
        'persona_id,persona_nombre,imagen_url,post_status,thumbnail_id,mime_type'
    ];

    personas.forEach(p => {
        const nombre = (p.persona_nombre || '').replace(/"/g, '""'); // Escapar comillas
        const url = (p.imagen_url || '').replace(/"/g, '""');
        csvLines.push(
            `${p.persona_id},"${nombre}","${url}",${p.post_status},${p.thumbnail_id || ''},"${p.mime_type || ''}"`
        );
    });

    await fs.writeFile(outputPath, csvLines.join('\n'), 'utf8');
    console.log(`✓ CSV generado: ${personas.length} personas con imagen\n`);
}

async function generarJSON(stats, outputPath) {
    console.log(`📄 Generando JSON de estadísticas: ${outputPath}`);
    await fs.writeFile(outputPath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`✓ JSON generado\n`);
}

function mostrarResumen(stats) {
    console.log('='.repeat(70));
    console.log('📊 RESUMEN DE ANÁLISIS - IMÁGENES DESTACADAS DE PERSONAS');
    console.log('='.repeat(70));
    
    console.log('\n🎭 PERSONAS:');
    console.log(`  Total de personas:        ${stats.total_personas.toLocaleString()}`);
    console.log(`  ✓ Con imagen destacada:   ${stats.con_imagen.toLocaleString()} (${((stats.con_imagen/stats.total_personas)*100).toFixed(2)}%)`);
    console.log(`  ✗ Sin imagen destacada:   ${stats.sin_imagen.toLocaleString()} (${((stats.sin_imagen/stats.total_personas)*100).toFixed(2)}%)`);

    console.log('\n📌 POR ESTADO:');
    Object.entries(stats.por_estado)
        .sort((a, b) => b[1] - a[1])
        .forEach(([estado, count]) => {
            console.log(`  ${estado.padEnd(20)} ${count.toLocaleString()}`);
        });

    console.log('\n🖼️  POR TIPO DE ARCHIVO:');
    Object.entries(stats.por_mime_type)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tipo, count]) => {
            console.log(`  ${tipo.padEnd(20)} ${count.toLocaleString()}`);
        });

    console.log('\n📅 POR AÑO DE CREACIÓN (Top 10):');
    Object.entries(stats.por_año)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 10)
        .forEach(([año, count]) => {
            console.log(`  ${año}:  ${count.toLocaleString()}`);
        });

    if (stats.urls_problematicas.length > 0) {
        console.log('\n⚠️  URLS PROBLEMÁTICAS:');
        console.log(`  Encontradas ${stats.urls_problematicas.length} URLs sin patrón wp-content/uploads/`);
        console.log('  (Ver detalles en el archivo JSON)');
    }

    console.log('\n' + '='.repeat(70));
}

// ============================================
// PROCESO PRINCIPAL
// ============================================

async function main() {
    let connection;

    try {
        console.log('🎬 ANÁLISIS DE IMÁGENES DESTACADAS - PERSONAS\n');
        console.log('Base de datos:', dbConfig.database);
        console.log('Post type: persona\n');

        // Conectar
        connection = await conectarBD();

        // Analizar
        const { stats, personasConImagen, todasLasPersonas } = await analizarImagenesDestacadas(connection);

        // Generar archivos
        await generarCSV(personasConImagen, CONFIG.outputCSV);
        await generarJSON(stats, CONFIG.outputJSON);

        // Mostrar resumen
        mostrarResumen(stats);

        console.log('\n✅ Análisis completado!\n');
        console.log('📁 Archivos generados:');
        console.log(`   - ${CONFIG.outputCSV}`);
        console.log(`   - ${CONFIG.outputJSON}\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada\n');
        }
    }
}

// ============================================
// EJECUTAR
// ============================================

main();