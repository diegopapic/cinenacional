const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const { createReadStream, createWriteStream } = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// ============================================
// CONFIGURACIÓN
// ============================================

// Cloudinary
cloudinary.config({
    cloud_name: 'dzndglyjr',
    api_key: '916999397279161',
    api_secret: '6K7EQkELG4dgl4RgdA5wsTwSPpI'
});

// PostgreSQL (opcional - comentar si no quieres actualizar la BD)
const pool = new Pool({
    host: 'localhost',
    database: 'tu_base_de_datos',
    user: 'tu_usuario',
    password: 'tu_password',
    port: 5432
});

// Opciones
const CONFIG = {
    inputCSV: 'wp_posts_imagen_destacada.csv',
    outputCSV: 'cloudinary_results_imagen_destacada.csv',
    updateDatabase: false, // Cambiar a true para actualizar PostgreSQL automáticamente
    batchSize: 10, // Procesar en lotes para evitar rate limits
    delayBetweenUploads: 100, // ms entre cada upload
    uploadsBasePath: 'C:/Users/diego/cinenacional/uploads/' // Ruta base donde están los archivos
};

// ============================================
// FUNCIONES
// ============================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function convertirURLaRutaLocal(urlWordpress) {
    // Manejar diferentes variantes de URL:
    // - http://nuevo.cinenacional.com/wp-content/uploads/...
    // - https://cinenacional.com/wp-content/uploads/...
    // - Cualquier otra variante

    // Extraer solo la parte después de wp-content/uploads/
    const match = urlWordpress.match(/wp-content\/uploads\/(.+)$/);

    if (match) {
        return CONFIG.uploadsBasePath + match[1];
    }

    // Si no tiene el patrón esperado, devolver la URL original
    // (esto causará un error, pero al menos sabemos qué URL es problemática)
    return urlWordpress;
}

async function verificarArchivoExiste(ruta) {
    try {
        await fs.access(ruta);
        return true;
    } catch {
        return false;
    }
}

async function leerCSV(filePath) {
    return new Promise((resolve, reject) => {
        const movies = [];

        createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                movies.push({
                    movieId: parseInt(row.pelicula_id),
                    titulo: row.pelicula_titulo,
                    urlWordpress: row.imagen_url
                });
            })
            .on('end', () => {
                console.log(`✓ CSV leído: ${movies.length} películas encontradas`);
                resolve(movies);
            })
            .on('error', reject);
    });
}

async function subirACloudinary(movie) {
    try {
        // Convertir URL a ruta local
        const rutaLocal = convertirURLaRutaLocal(movie.urlWordpress);

        // Verificar que el archivo existe
        const existe = await verificarArchivoExiste(rutaLocal);
        if (!existe) {
            throw new Error(`Archivo no encontrado: ${rutaLocal}`);
        }

        // Subir desde archivo local
        const result = await cloudinary.uploader.upload(rutaLocal, {
            folder: `cinenacional/posters/${movie.movieId}`,
            public_id: `poster`,
            overwrite: false,
            resource_type: 'image',
            timeout: 60000 // 60 segundos de timeout
        });

        return {
            movieId: movie.movieId,
            titulo: movie.titulo,
            urlWordpress: movie.urlWordpress,
            rutaLocal: rutaLocal,
            urlCloudinary: result.secure_url,
            publicId: result.public_id,
            success: true,
            error: null
        };

    } catch (error) {
        return {
            movieId: movie.movieId,
            titulo: movie.titulo,
            urlWordpress: movie.urlWordpress,
            rutaLocal: convertirURLaRutaLocal(movie.urlWordpress),
            urlCloudinary: null,
            publicId: null,
            success: false,
            error: error.message
        };
    }
}

async function actualizarPostgreSQL(movieId, cloudinaryUrl) {
    try {
        await pool.query(
            'UPDATE movies SET poster_url = $1 WHERE id = $2',
            [cloudinaryUrl, movieId]
        );
        return true;
    } catch (error) {
        console.error(`Error actualizando BD para película ${movieId}:`, error.message);
        return false;
    }
}

async function guardarResultados(results, outputPath) {
    const csvLines = [
        'movie_id,titulo,url_wordpress,ruta_local,url_cloudinary,success,error'
    ];

    results.forEach(r => {
        const titulo = r.titulo.replace(/"/g, '""'); // Escapar comillas
        const error = (r.error || '').replace(/"/g, '""');
        csvLines.push(
            `${r.movieId},"${titulo}","${r.urlWordpress}","${r.rutaLocal}","${r.urlCloudinary || ''}",${r.success},"${error}"`
        );
    });

    await fs.writeFile(outputPath, csvLines.join('\n'), 'utf8');
    console.log(`\n✓ Resultados guardados en: ${outputPath}`);
}

// ============================================
// PROCESO PRINCIPAL
// ============================================

async function migrarPosters() {
    console.log('🎬 Iniciando migración de posters a Cloudinary\n');
    console.log(`📁 Leyendo CSV: ${CONFIG.inputCSV}`);

    // Leer el CSV
    const movies = await leerCSV(CONFIG.inputCSV);

    console.log(`\n🚀 Procesando ${movies.length} películas...`);
    console.log(`⚙️  Modo: ${CONFIG.updateDatabase ? 'CON' : 'SIN'} actualización automática de BD\n`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar por lotes
    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const progress = `[${i + 1}/${movies.length}]`;

        console.log(`${progress} Procesando película ${movie.movieId}: ${movie.titulo}`);

        // Subir a Cloudinary
        const result = await subirACloudinary(movie);

        if (result.success) {
            successCount++;
            console.log(`  ✓ ${result.rutaLocal}`);
            console.log(`  → ${result.urlCloudinary}`);

            // Actualizar PostgreSQL si está habilitado
            if (CONFIG.updateDatabase && result.urlCloudinary) {
                const updated = await actualizarPostgreSQL(result.movieId, result.urlCloudinary);
                if (updated) {
                    console.log(`  ✓ BD actualizada`);
                }
            }
        } else {
            errorCount++;
            console.log(`  ✗ ${result.rutaLocal}`);
            console.log(`  ✗ Error: ${result.error}`);
        }

        results.push(result);

        // Delay entre uploads para evitar rate limits
        if (i < movies.length - 1) {
            await delay(CONFIG.delayBetweenUploads);
        }

        // Mostrar progreso cada 100 películas
        if ((i + 1) % 100 === 0) {
            console.log(`\n📊 Progreso: ${i + 1}/${movies.length} | Éxitos: ${successCount} | Errores: ${errorCount}\n`);
        }
    }

    // Guardar resultados en CSV
    await guardarResultados(results, CONFIG.outputCSV);

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Total procesado:  ${movies.length}`);
    console.log(`✓ Exitosos:       ${successCount}`);
    console.log(`✗ Errores:        ${errorCount}`);
    console.log(`📈 Tasa de éxito: ${((successCount / movies.length) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    // Cerrar conexión a BD si estaba abierta
    if (CONFIG.updateDatabase) {
        await pool.end();
    }

    console.log('\n✅ Migración completada!\n');
}

// ============================================
// EJECUTAR
// ============================================

migrarPosters().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});