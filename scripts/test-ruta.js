const fs = require('fs').promises;
const path = require('path');

// La ruta base que tienes configurada
const uploadsBasePath = 'C:/Users/diego/cinenacional/uploads/';

// Algunas rutas de ejemplo del CSV para probar
const urlsEjemplo = [
  'http://nuevo.cinenacional.com/wp-content/uploads/2018/01/0000000721.jpg',
  'http://nuevo.cinenacional.com/wp-content/uploads/2018/01/0000000765.jpg',
  'http://nuevo.cinenacional.com/wp-content/uploads/2018/01/0000000824.jpg'
];

function convertirURLaRutaLocal(urlWordpress) {
  return urlWordpress.replace(
    'http://nuevo.cinenacional.com/wp-content/uploads/',
    uploadsBasePath
  );
}

async function verificarArchivo(url) {
  const rutaLocal = convertirURLaRutaLocal(url);
  
  try {
    await fs.access(rutaLocal);
    const stats = await fs.stat(rutaLocal);
    console.log(`✓ ENCONTRADO: ${rutaLocal}`);
    console.log(`  Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
    return true;
  } catch (error) {
    console.log(`✗ NO ENCONTRADO: ${rutaLocal}`);
    console.log(`  Error: ${error.message}\n`);
    return false;
  }
}

async function testearRutas() {
  console.log('='.repeat(70));
  console.log('🔍 VERIFICACIÓN DE RUTAS');
  console.log('='.repeat(70));
  console.log(`Ruta base configurada: ${uploadsBasePath}\n`);
  
  // Verificar que la carpeta base existe
  try {
    await fs.access(uploadsBasePath);
    console.log(`✓ La carpeta base existe: ${uploadsBasePath}\n`);
  } catch {
    console.log(`✗ ¡PROBLEMA! La carpeta base NO existe: ${uploadsBasePath}`);
    console.log(`  Verifica que la ruta sea correcta.\n`);
    return;
  }
  
  console.log('Probando algunos archivos de ejemplo del CSV:\n');
  
  let encontrados = 0;
  let noEncontrados = 0;
  
  for (const url of urlsEjemplo) {
    const resultado = await verificarArchivo(url);
    if (resultado) {
      encontrados++;
    } else {
      noEncontrados++;
    }
  }
  
  console.log('='.repeat(70));
  console.log('📊 RESUMEN');
  console.log('='.repeat(70));
  console.log(`Total probado:     ${urlsEjemplo.length}`);
  console.log(`✓ Encontrados:     ${encontrados}`);
  console.log(`✗ No encontrados:  ${noEncontrados}`);
  
  if (encontrados === urlsEjemplo.length) {
    console.log('\n✅ ¡Todo perfecto! La ruta está correcta y los archivos existen.');
    console.log('   Puedes ejecutar el script principal sin problemas.');
  } else if (encontrados > 0) {
    console.log('\n⚠️  Algunos archivos no se encontraron.');
    console.log('   Puede que falten algunos archivos o la estructura sea diferente.');
  } else {
    console.log('\n❌ Ningún archivo fue encontrado.');
    console.log('   Verifica la ruta base en CONFIG.uploadsBasePath');
  }
  console.log('='.repeat(70));
}

testearRutas().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});