// scripts/analyze-comments-safe.js

const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const results = {
    file: filePath,
    malformedComments: [],
    validJSDocs: [],
    needsDocumentation: []
  };
  
  // Buscar comentarios /* */ que deberían ser /** */
  const malformedRegex = /\/\*\n(\s*\*[^/].*\n)+\s*\*\//g;
  let match;
  
  while ((match = malformedRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const preview = match[0].substring(0, 60).replace(/\n/g, ' ');
    
    results.malformedComments.push({
      line: lineNumber,
      preview: preview + '...'
    });
  }
  
  // Buscar JSDoc válidos
  const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
  while ((match = jsdocRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const preview = match[0].substring(0, 60).replace(/\n/g, ' ');
    
    results.validJSDocs.push({
      line: lineNumber,
      preview: preview + '...'
    });
  }
  
  // Buscar funciones sin documentación
  const functionRegex = /^export\s+(async\s+)?(?:function|const)\s+(\w+)/gm;
  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[2];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Ver si tiene algún comentario arriba
    const linesBefore = content.substring(0, match.index).split('\n').slice(-3).join('\n');
    const hasComment = linesBefore.includes('*/') || linesBefore.includes('//');
    
    if (!hasComment) {
      results.needsDocumentation.push({
        name: functionName,
        line: lineNumber
      });
    }
  }
  
  return results;
}

// SOLO ANALIZAR src/services/movies.service.ts primero
console.log('🔍 Analizando movies.service.ts SIN MODIFICAR NADA...\n');

const movieService = analyzeFile('src/services/movies.service.ts');

if (movieService) {
  console.log('📄 src/services/movies.service.ts\n');
  
  if (movieService.malformedComments.length > 0) {
    console.log(`   ⚠️ Comentarios mal formateados (/* en vez de /**): ${movieService.malformedComments.length}`);
    movieService.malformedComments.forEach((comment, i) => {
      console.log(`      ${i + 1}. Línea ${comment.line}: ${comment.preview}`);
    });
  }
  
  if (movieService.validJSDocs.length > 0) {
    console.log(`\n   ✅ JSDoc válidos encontrados: ${movieService.validJSDocs.length}`);
    movieService.validJSDocs.forEach((doc, i) => {
      console.log(`      ${i + 1}. Línea ${doc.line}: ${doc.preview}`);
    });
  }
  
  if (movieService.needsDocumentation.length > 0) {
    console.log(`\n   ❌ Funciones sin documentación: ${movieService.needsDocumentation.length}`);
    movieService.needsDocumentation.forEach((func, i) => {
      console.log(`      ${i + 1}. ${func.name}() en línea ${func.line}`);
    });
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 PROPUESTA DE CAMBIOS (sin ejecutar):\n');

// Mostrar ejemplo de cómo quedaría
if (movieService && movieService.malformedComments.length > 0) {
  console.log('Ejemplo de corrección para comentarios mal formateados:');
  console.log('\nANTES:');
  console.log('/*');
  console.log(' * Crea una nueva película');
  console.log(' */');
  console.log('\nDESPUÉS:');
  console.log('/**');
  console.log(' * Crea una nueva película');
  console.log(' */');
}

console.log('\n⚠️ IMPORTANTE: Este script NO modificó ningún archivo.');
console.log('Solo está mostrando qué se encontró y qué se podría cambiar.');