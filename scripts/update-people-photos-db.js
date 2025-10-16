const { createReadStream } = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// ============================================
// CONFIGURACIÓN
// ============================================

const pool = new Pool({
    host: 'localhost',
    database: 'cinenacional',
    user: 'cinenacional',
    password: 'Paganitzu',
    port: 5433
});

const CONFIG = {
    inputCSV: 'cloudinary_results_personas_fotos.csv'
};

// ============================================
// FUNCIONES
// ============================================

async function leerResultados(filePath) {
    return new Promise((resolve, reject) => {
        const resultados = [];

        createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Solo procesar los exitosos
                if (row.success === 'true' && row.url_cloudinary) {
                    resultados.push({
                        personId: parseInt(row.person_id),
                        nombre: row.nombre,
                        urlCloudinary: row.url_cloudinary
                    });
                }
            })
            .on('end', () => {
                console.log(`✓ CSV leído: ${resultados.length} personas exitosas encontradas`);
                resolve(resultados);
            })
            .on('error', reject);
    });
}

async function actualizarPersona(personId, cloudinaryUrl) {
    try {
        const result = await pool.query(
            'UPDATE people SET photo_url = $1 WHERE id = $2',
            [cloudinaryUrl, personId]
        );
        return {
            success: true,
            rowsAffected: result.rowCount
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// PROCESO PRINCIPAL
// ============================================

async function actualizarBase() {
    console.log('👤 Actualizando base de datos PostgreSQL con fotos de personas\n');
    console.log(`📂 Leyendo CSV: ${CONFIG.inputCSV}`);

    try {
        // Leer resultados exitosos del CSV
        const personas = await leerResultados(CONFIG.inputCSV);

        console.log(`\n🚀 Actualizando ${personas.length} personas en PostgreSQL...\n`);

        let successCount = 0;
        let errorCount = 0;
        let notFoundCount = 0;

        // Procesar cada persona
        for (let i = 0; i < personas.length; i++) {
            const persona = personas[i];
            const progress = `[${i + 1}/${personas.length}]`;

            // Actualizar BD
            const result = await actualizarPersona(persona.personId, persona.urlCloudinary);

            if (result.success) {
                if (result.rowsAffected > 0) {
                    successCount++;
                    console.log(`${progress} ✓ Persona ${persona.personId}: ${persona.nombre}`);
                } else {
                    notFoundCount++;
                    console.log(`${progress} ⚠️  Persona ${persona.personId} no encontrada en BD`);
                }
            } else {
                errorCount++;
                console.log(`${progress} ✗ Error en persona ${persona.personId}: ${result.error}`);
            }

            // Mostrar progreso cada 100 personas
            if ((i + 1) % 100 === 0) {
                console.log(`\n📊 Progreso: ${i + 1}/${personas.length} | Actualizadas: ${successCount} | Errores: ${errorCount} | No encontradas: ${notFoundCount}\n`);
            }
        }

        // Resumen final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE ACTUALIZACIÓN');
        console.log('='.repeat(60));
        console.log(`Total procesado:    ${personas.length}`);
        console.log(`✓ Actualizadas:     ${successCount}`);
        console.log(`⚠️  No encontradas:  ${notFoundCount}`);
        console.log(`✗ Errores:          ${errorCount}`);
        console.log(`📈 Tasa de éxito:   ${((successCount / personas.length) * 100).toFixed(2)}%`);
        console.log('='.repeat(60));

        console.log('\n✅ Actualización completada!\n');

    } catch (error) {
        console.error('\n❌ Error fatal:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('🔌 Conexión a PostgreSQL cerrada\n');
    }
}

// ============================================
// EJECUTAR
// ============================================

actualizarBase().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
});