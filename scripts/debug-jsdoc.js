// scripts/debug-jsdoc.js

const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Buscar diferentes tipos de comentarios
  const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
  const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
  const lineCommentRegex = /\/\/.*/g;
  
  // Buscar exports
  const exportRegex = /export\s+(async\s+)?(?:function|const|class)\s+(\w+)/g;
  
  const exports = [];
  const jsdocs = content.match(jsdocRegex) || [];
  const blockComments = content.match(blockCommentRegex) || [];
  const lineComments = content.match(lineCommentRegex) || [];
  
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const functionName = match[2];
    const functionLine = content.substring(0, match.index).split('\n').length;
    
    // Buscar si hay algún comentario justo antes
    const linesBefore = content.substring(0, match.index).split('\n');
    const lastFewLines = linesBefore.slice(-5).join('\n');
    
    const hasJSDoc = lastFewLines.includes('/**');
    const hasBlockComment = lastFewLines.includes('/*');
    const hasLineComment = lastFewLines.includes('//');
    
    exports.push({
      name: functionName,
      line: functionLine,
      hasJSDoc,
      hasBlockComment,
      hasLineComment
    });
  }
  
  return {
    fileName,
    path: filePath,
    exports,
    jsdocs,
    blockComments: blockComments.length,
    lineComments: lineComments.length
  };
}

// Analizar algunos archivos específicos
console.log('🔍 Analizando archivos para detectar qué considera como "documentado"...\n');

const testFiles = [
  'src/app/api/movies/route.ts',
  'src/app/api/people/route.ts',
  'src/app/page.tsx',
  'src/hooks/useMovieForm.ts',
  'src/components/admin/movies/MovieModal/index.tsx',
  'src/services/movies.service.ts'
];

testFiles.forEach(file => {
  const analysis = analyzeFile(file);
  
  if (analysis) {
    console.log(`\n📄 ${file}`);
    console.log(`   Funciones exportadas: ${analysis.exports.length}`);
    console.log(`   JSDoc blocks (/** */): ${analysis.jsdocs.length}`);
    console.log(`   Block comments (/* */): ${analysis.blockComments}`);
    console.log(`   Line comments (//): ${analysis.lineComments}`);
    
    if (analysis.jsdocs.length > 0) {
      console.log('\n   📝 JSDoc encontrados:');
      analysis.jsdocs.forEach((doc, i) => {
        const preview = doc.substring(0, 50).replace(/\n/g, ' ');
        console.log(`      ${i + 1}. ${preview}...`);
      });
    }
    
    if (analysis.exports.length > 0) {
      console.log('\n   🔹 Funciones y su estado:');
      analysis.exports.forEach(exp => {
        const status = exp.hasJSDoc ? '✅' : exp.hasBlockComment ? '⚠️' : exp.hasLineComment ? '💬' : '❌';
        console.log(`      ${status} ${exp.name}() - línea ${exp.line}`);
      });
    }
  } else {
    console.log(`❌ No encontrado: ${file}`);
  }
});

// Buscar archivos que sí tienen JSDoc
console.log('\n\n🔎 Buscando archivos con JSDoc real...\n');

function findFilesWithJSDoc(dir) {
  const results = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      if (item === 'node_modules' || item.startsWith('.')) continue;
      
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);
        
        if (jsdocMatches && jsdocMatches.length > 0) {
          // Verificar que no sea un comentario de licencia o archivo
          const realJSDocs = jsdocMatches.filter(doc => 
            doc.includes('@param') || 
            doc.includes('@returns') || 
            doc.includes('@description') ||
            doc.includes('@example') ||
            doc.includes('@throws')
          );
          
          if (realJSDocs.length > 0) {
            results.push({
              file: fullPath.replace(/\\/g, '/'),
              count: realJSDocs.length,
              preview: realJSDocs[0].substring(0, 100)
            });
          }
        }
      }
    }
  }
  
  walk('src');
  return results;
}

const filesWithJSDoc = findFilesWithJSDoc('src');

if (filesWithJSDoc.length > 0) {
  console.log(`✅ Encontrados ${filesWithJSDoc.length} archivos con JSDoc real:\n`);
  filesWithJSDoc.forEach(item => {
    console.log(`   📄 ${item.file}`);
    console.log(`      ${item.count} JSDoc blocks`);
    console.log(`      Preview: ${item.preview.replace(/\n/g, ' ')}...\n`);
  });
} else {
  console.log('❌ No se encontraron archivos con JSDoc real (con @param, @returns, etc.)');
}

// Posible explicación del 52%
console.log('\n\n💡 Posibles explicaciones del 52% de cobertura:\n');
console.log('1. El script anterior puede estar contando comentarios /* */ como JSDoc');
console.log('2. Puede estar contando comentarios // antes de funciones');
console.log('3. Puede haber archivos de librerías o generados que sí tienen JSDoc');
console.log('4. Bug en la regex de detección\n');

// Verificar qué está mal en el detector original
console.log('🐛 Verificando el bug en el detector original...\n');

const testContent = `
// Este es un comentario normal
export function test1() {}

/* Este es un block comment */
export const test2 = () => {}

/**
 * Este es un JSDoc real
 */
export async function test3() {}
`;

const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
const matches = testContent.match(jsdocRegex);

console.log('Test de regex JSDoc:');
console.log(`   Encontrados: ${matches ? matches.length : 0} JSDoc`);
if (matches) {
  matches.forEach((m, i) => {
    console.log(`   ${i + 1}. "${m.trim()}"`);
  });
}