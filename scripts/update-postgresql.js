const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

// ============================================
// CONFIGURACIÓN
// ============================================

const pool = new Pool({
  host: 'localhost',
  database: 'cinenacional',  // ← CAMBIAR
  user: 'cinenacional',             // ← CAMBIAR
  password: 'Paganitzu',        // ← CAMBIAR
  port: 5433
});

const CONFIG = {
  inputCSV: 'cloudinary_results_imagen_destacada.csv',
  onlySuccess: true,  // Solo actualizar las que se subieron exitosamente
  dryRun: false        // Cambiar a false para ejecutar los UPDATEs reales
};

// ============================================
// FUNCIONES
// ============================================

async function leerResultados(filePath) {
  return new Promise((resolve, reject) => {
    const updates = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Solo procesar las exitosas si está configurado así
        if (CONFIG.onlySuccess && row.success !== 'true') {
          return;
        }
        
        // Solo si tiene URL de Cloudinary válida
        if (row.url_cloudinary && row.url_cloudinary.trim() !== '') {
          updates.push({
            movieId: parseInt(row.movie_id),
            titulo: row.titulo,
            urlCloudinary: row.url_cloudinary
          });
        }
      })
      .on('end', () => {
        console.log(`✓ CSV leído: ${updates.length} películas para actualizar`);
        resolve(updates);
      })
      .on('error', reject);
  });
}

async function actualizarPelicula(update, isDryRun) {
  try {
    if (isDryRun) {
      // Modo prueba: solo mostrar qué haría
      console.log(`  [DRY RUN] UPDATE movies SET poster_url = '${update.urlCloudinary}' WHERE id = ${update.movieId}`);
      return { success: true, dryRun: true };
    } else {
      // Ejecutar UPDATE real
      const result = await pool.query(
        'UPDATE movies SET poster_url = $1 WHERE id = $2',
        [update.urlCloudinary, update.movieId]
      );
      
      return { 
        success: true, 
        dryRun: false,
        rowsAffected: result.rowCount
      };
    }
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

async function actualizarPostgreSQL() {
  console.log('🗄️  Iniciando actualización de PostgreSQL\n');
  console.log(`📁 Leyendo: ${CONFIG.inputCSV}`);
  console.log(`⚙️  Modo: ${CONFIG.dryRun ? 'DRY RUN (prueba)' : 'EJECUCIÓN REAL'}`);
  console.log(`🎯 Filtro: ${CONFIG.onlySuccess ? 'Solo exitosas' : 'Todas'}\n`);
  
  // Leer el CSV de resultados
  const updates = await leerResultados(CONFIG.inputCSV);
  
  if (updates.length === 0) {
    console.log('⚠️  No hay películas para actualizar.');
    return;
  }
  
  console.log(`\n🚀 Procesando ${updates.length} actualizaciones...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;
  
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const progress = `[${i + 1}/${updates.length}]`;
    
    console.log(`${progress} Película ${update.movieId}: ${update.titulo}`);
    
    const result = await actualizarPelicula(update, CONFIG.dryRun);
    
    if (result.success) {
      successCount++;
      if (result.dryRun) {
        console.log(`  ✓ [Simulado] Se actualizaría con: ${update.urlCloudinary.substring(0, 60)}...`);
      } else {
        if (result.rowsAffected === 0) {
          notFoundCount++;
          console.log(`  ⚠️  Película no encontrada en BD (ID ${update.movieId})`);
        } else {
          console.log(`  ✓ Actualizada correctamente`);
        }
      }
    } else {
      errorCount++;
      console.log(`  ✗ Error: ${result.error}`);
    }
    
    // Mostrar progreso cada 100 películas
    if ((i + 1) % 100 === 0) {
      console.log(`\n📊 Progreso: ${i + 1}/${updates.length}\n`);
    }
  }
  
  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE ACTUALIZACIÓN');
  console.log('='.repeat(60));
  console.log(`Total procesado:       ${updates.length}`);
  console.log(`✓ Exitosas:            ${successCount}`);
  console.log(`✗ Errores:             ${errorCount}`);
  if (!CONFIG.dryRun && notFoundCount > 0) {
    console.log(`⚠️  No encontradas en BD: ${notFoundCount}`);
  }
  console.log('='.repeat(60));
  
  if (CONFIG.dryRun) {
    console.log('\n💡 Este fue un DRY RUN (prueba).');
    console.log('   Para ejecutar los UPDATEs reales, cambia dryRun a false en CONFIG.\n');
  } else {
    console.log('\n✅ Actualización completada!\n');
  }
  
  // Cerrar conexión
  await pool.end();
}

// ============================================
// EJECUTAR
// ============================================

actualizarPostgreSQL().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});