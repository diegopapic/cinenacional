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
    database: 'cinenacional',
    user: 'cinenacional',
    password: 'Paganitzu',
    port: 5433
});

// Opciones
const CONFIG = {
    inputCSV: 'wp_personas_imagen_destacada.csv',
    outputCSV: 'cloudinary_results_personas_fotos.csv',
    updateDatabase: true, // Cambiar a true para actualizar PostgreSQL automáticamente
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
        const people = [];

        createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                people.push({
                    personId: parseInt(row.persona_id),
                    nombre: row.persona_nombre,
                    urlWordpress: row.imagen_url
                });
            })
            .on('end', () => {
                console.log(`✓ CSV leído: ${people.length} personas encontradas`);
                resolve(people);
            })
            .on('error', reject);
    });
}

async function subirACloudinary(person) {
    try {
        // Convertir URL a ruta local
        const rutaLocal = convertirURLaRutaLocal(person.urlWordpress);

        // Verificar que el archivo existe
        const existe = await verificarArchivoExiste(rutaLocal);
        if (!existe) {
            throw new Error(`Archivo no encontrado: ${rutaLocal}`);
        }

        // Subir desde archivo local
        const result = await cloudinary.uploader.upload(rutaLocal, {
            folder: `cinenacional/personas/${person.personId}`,
            public_id: `photo`,
            overwrite: false,
            resource_type: 'image',
            timeout: 60000 // 60 segundos de timeout
        });

        return {
            personId: person.personId,
            nombre: person.nombre,
            urlWordpress: person.urlWordpress,
            rutaLocal: rutaLocal,
            urlCloudinary: result.secure_url,
            publicId: result.public_id,
            success: true,
            error: null
        };

    } catch (error) {
        return {
            personId: person.personId,
            nombre: person.nombre,
            urlWordpress: person.urlWordpress,
            rutaLocal: convertirURLaRutaLocal(person.urlWordpress),
            urlCloudinary: null,
            publicId: null,
            success: false,
            error: error.message
        };
    }
}

async function actualizarPostgreSQL(personId, cloudinaryUrl) {
    try {
        await pool.query(
            'UPDATE people SET photo_url = $1 WHERE id = $2',
            [cloudinaryUrl, personId]
        );
        return true;
    } catch (error) {
        console.error(`Error actualizando BD para persona ${personId}:`, error.message);
        return false;
    }
}

async function guardarResultados(results, outputPath) {
    const csvLines = [
        'person_id,nombre,url_wordpress,ruta_local,url_cloudinary,success,error'
    ];

    results.forEach(r => {
        const nombre = r.nombre.replace(/"/g, '""'); // Escapar comillas
        const error = (r.error || '').replace(/"/g, '""');
        csvLines.push(
            `${r.personId},"${nombre}","${r.urlWordpress}","${r.rutaLocal}","${r.urlCloudinary || ''}",${r.success},"${error}"`
        );
    });

    await fs.writeFile(outputPath, csvLines.join('\n'), 'utf8');
    console.log(`\n✓ Resultados guardados en: ${outputPath}`);
}

// ============================================
// PROCESO PRINCIPAL
// ============================================

async function migrarFotos() {
    console.log('👤 Iniciando migración de fotos de personas a Cloudinary\n');
    console.log(`📂 Leyendo CSV: ${CONFIG.inputCSV}`);

    // Leer el CSV
    const people = await leerCSV(CONFIG.inputCSV);

    console.log(`\n🚀 Procesando ${people.length} personas...`);
    console.log(`⚙️  Modo: ${CONFIG.updateDatabase ? 'CON' : 'SIN'} actualización automática de BD\n`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar por lotes
    for (let i = 0; i < people.length; i++) {
        const person = people[i];
        const progress = `[${i + 1}/${people.length}]`;

        console.log(`${progress} Procesando persona ${person.personId}: ${person.nombre}`);

        // Subir a Cloudinary
        const result = await subirACloudinary(person);

        if (result.success) {
            successCount++;
            console.log(`  ✓ ${result.rutaLocal}`);
            console.log(`  → ${result.urlCloudinary}`);

            // Actualizar PostgreSQL si está habilitado
            if (CONFIG.updateDatabase && result.urlCloudinary) {
                const updated = await actualizarPostgreSQL(result.personId, result.urlCloudinary);
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
        if (i < people.length - 1) {
            await delay(CONFIG.delayBetweenUploads);
        }

        // Mostrar progreso cada 100 personas
        if ((i + 1) % 100 === 0) {
            console.log(`\n📊 Progreso: ${i + 1}/${people.length} | Éxitos: ${successCount} | Errores: ${errorCount}\n`);
        }
    }

    // Guardar resultados en CSV
    await guardarResultados(results, CONFIG.outputCSV);

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN - FOTOS DE PERSONAS');
    console.log('='.repeat(60));
    console.log(`Total procesado:  ${people.length}`);
    console.log(`✓ Exitosos:       ${successCount}`);
    console.log(`✗ Errores:        ${errorCount}`);
    console.log(`📈 Tasa de éxito: ${((successCount / people.length) * 100).toFixed(2)}%`);
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

migrarFotos().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});