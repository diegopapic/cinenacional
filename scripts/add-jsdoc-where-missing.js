// scripts/add-jsdoc-where-missing.js

const fs = require('fs');
const path = require('path');

function hasJSDoc(content, functionIndex) {
  // Buscar hacia atrás desde la función para ver si hay JSDoc
  const before = content.substring(Math.max(0, functionIndex - 200), functionIndex);
  return before.includes('/**');
}

function addJSDocToFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar funciones exportadas
    const functionMatch = line.match(/^export\s+(async\s+)?(?:function|const)\s+(\w+)/);
    
    if (functionMatch) {
      const functionName = functionMatch[2];
      
      // Verificar si ya tiene JSDoc
      const prevLine = i > 0 ? lines[i-1] : '';
      const hasDoc = prevLine.includes('*/') || prevLine.includes('/**');
      
      if (!hasDoc) {
        // Determinar el tipo de función
        const isAPI = filePath.includes('/api/');
        const isHook = filePath.includes('/hooks/') || functionName.startsWith('use');
        const isService = filePath.includes('/services/');
        const isComponent = filePath.includes('/components/') && functionName[0] === functionName[0].toUpperCase();
        
        // Agregar JSDoc apropiado
        if (isAPI && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(functionName)) {
          newLines.push('/**');
          newLines.push(` * ${functionName} endpoint`);
          newLines.push(' * @param {Request} request - Next.js request object');
          newLines.push(' * @returns {Promise<Response>} API response');
          newLines.push(' */');
          modified = true;
        } else if (isHook) {
          newLines.push('/**');
          newLines.push(` * Custom hook: ${functionName}`);
          newLines.push(' * @returns Hook state and methods');
          newLines.push(' */');
          modified = true;
        } else if (isService) {
          newLines.push('/**');
          newLines.push(` * Service method: ${functionName}`);
          newLines.push(' * @TODO Add proper documentation');
          newLines.push(' */');
          modified = true;
        } else if (isComponent) {
          newLines.push('/**');
          newLines.push(` * ${functionName} component`);
          newLines.push(' * @TODO Add props documentation');
          newLines.push(' */');
          modified = true;
        } else {
          newLines.push('/**');
          newLines.push(` * ${functionName}`);
          newLines.push(' * @TODO Add documentation');
          newLines.push(' */');
          modified = true;
        }
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    // Crear backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, content);
    
    // Guardar archivo modificado
    fs.writeFileSync(filePath, newLines.join('\n'));
    return true;
  }
  
  return false;
}

// Buscar archivos sin documentación
function findFilesWithoutDocs() {
  const files = [];
  const ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
  
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (ignoreDirs.includes(item) || item.startsWith('.')) continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  walk('src');
  return files;
}

console.log('🔍 Buscando archivos sin JSDoc...\n');

const allFiles = findFilesWithoutDocs();
const filesToProcess = [];

// Analizar cada archivo
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Contar funciones exportadas
  const exportMatches = content.match(/^export\s+(async\s+)?(?:function|const)\s+(\w+)/gm) || [];
  
  // Contar JSDoc
  const jsdocMatches = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
  
  if (exportMatches.length > 0 && jsdocMatches.length < exportMatches.length) {
    filesToProcess.push({
      path: file,
      exports: exportMatches.length,
      jsdocs: jsdocMatches.length,
      missing: exportMatches.length - jsdocMatches.length
    });
  }
});

console.log(`📊 Resumen:`);
console.log(`   Total de archivos: ${allFiles.length}`);
console.log(`   Archivos con funciones sin documentar: ${filesToProcess.length}\n`);

if (filesToProcess.length > 0) {
  console.log('📝 Top 10 archivos que necesitan documentación:\n');
  filesToProcess
    .sort((a, b) => b.missing - a.missing)
    .slice(0, 10)
    .forEach((file, i) => {
      const relPath = file.path.replace(/\\/g, '/');
      console.log(`   ${i + 1}. ${relPath}`);
      console.log(`      Funciones: ${file.exports} | JSDoc: ${file.jsdocs} | Faltan: ${file.missing}`);
    });
    
  console.log('\n¿Deseas agregar JSDoc básico a estos archivos?');
  console.log('Ejecuta: node scripts/add-jsdoc-where-missing.js --apply');
  
  // Si se pasa --apply, procesar los archivos
  if (process.argv.includes('--apply')) {
    console.log('\n✨ Agregando JSDoc...\n');
    
    let processed = 0;
    filesToProcess.slice(0, 10).forEach(file => {
      if (addJSDocToFile(file.path)) {
        console.log(`   ✅ ${file.path}`);
        processed++;
      }
    });
    
    console.log(`\n✅ Proceso completado: ${processed} archivos actualizados`);
    console.log('💡 Se crearon archivos .backup por seguridad');
  }
}