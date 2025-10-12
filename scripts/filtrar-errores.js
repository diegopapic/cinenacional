const fs = require('fs');
const { createReadStream, createWriteStream } = require('fs');
const csv = require('csv-parser');

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  inputCSV: 'cloudinary_results.csv',
  outputCSV: 'wp_posts_errores.csv'
};

// ============================================
// PROCESO
// ============================================

async function filtrarErrores() {
  console.log('🔍 Filtrando errores del CSV...\n');
  console.log(`📁 Leyendo: ${CONFIG.inputCSV}`);
  
  const errores = [];
  const exitosas = [];
  
  // Leer el CSV
  createReadStream(CONFIG.inputCSV)
    .pipe(csv())
    .on('data', (row) => {
      if (row.success === 'false') {
        errores.push(row);
      } else {
        exitosas.push(row);
      }
    })
    .on('end', () => {
      console.log(`\n📊 Análisis completado:`);
      console.log(`  ✓ Exitosas: ${exitosas.length}`);
      console.log(`  ✗ Errores:  ${errores.length}`);
      
      if (errores.length === 0) {
        console.log('\n✅ ¡No hay errores! Todos los archivos se subieron correctamente.');
        return;
      }
      
      // Crear CSV solo con errores (formato original de wp_posts.csv)
      const csvLines = [
        '"pelicula_id","pelicula_titulo","attachment_id","imagen_url","nombre_archivo"'
      ];
      
      errores.forEach(error => {
        // Extraer el nombre del archivo de la URL
        const nombreArchivo = error.url_wordpress.split('/').pop();
        
        // Asumimos que no tenemos attachment_id en el resultado, 
        // así que lo dejamos vacío o podemos poner 0
        csvLines.push(
          `"${error.movie_id}","${error.titulo.replace(/"/g, '""')}","0","${error.url_wordpress}","${nombreArchivo}"`
        );
      });
      
      // Guardar CSV
      fs.writeFileSync(CONFIG.outputCSV, csvLines.join('\n'), 'utf8');
      
      console.log(`\n✓ Archivo generado: ${CONFIG.outputCSV}`);
      console.log(`  Películas a re-procesar: ${errores.length}`);
      
      // Mostrar algunos ejemplos
      console.log(`\n📝 Primeros 5 errores:`);
      errores.slice(0, 5).forEach((error, i) => {
        console.log(`  ${i + 1}. ID ${error.movie_id}: ${error.titulo}`);
        console.log(`     URL: ${error.url_wordpress}`);
        console.log(`     Error: ${error.error}\n`);
      });
      
      // Analizar tipos de errores
      console.log(`\n🔍 Análisis de errores:`);
      
      const errorPorArchivo = errores.filter(e => 
        e.error && e.error.includes('Archivo no encontrado')
      ).length;
      
      const errorPorHTTPS = errores.filter(e => 
        e.url_wordpress && e.url_wordpress.startsWith('https://cinenacional.com/')
      ).length;
      
      const errorPorNuevo = errores.filter(e => 
        e.url_wordpress && e.url_wordpress.startsWith('http://nuevo.cinenacional.com/')
      ).length;
      
      console.log(`  📁 Archivo no encontrado: ${errorPorArchivo}`);
      console.log(`  🔗 URLs con https://cinenacional.com/: ${errorPorHTTPS}`);
      console.log(`  🔗 URLs con http://nuevo.cinenacional.com/: ${errorPorNuevo}`);
      
      console.log(`\n💡 Siguiente paso:`);
      console.log(`   1. Revisa el archivo: ${CONFIG.outputCSV}`);
      console.log(`   2. Ejecuta: node upload-posters-to-cloudinary.js`);
      console.log(`      (asegúrate de cambiar inputCSV a '${CONFIG.outputCSV}' en el script)`);
    })
    .on('error', (error) => {
      console.error('\n❌ Error leyendo el CSV:', error.message);
    });
}

// ============================================
// EJECUTAR
// ============================================

filtrarErrores();