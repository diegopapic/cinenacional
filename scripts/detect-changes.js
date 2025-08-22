// scripts/detect-changes.js - VERSION WINDOWS

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancedDocDetector {
  constructor() {
    this.changesLog = [];
    this.missingDocs = [];
  }

  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Detectar funciones/clases exportadas
    const exportRegex = /export\s+(async\s+)?(?:function|const|class)\s+(\w+)/g;
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    
    const exports = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push({
        name: match[2],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Verificar si tienen JSDoc
    const jsdocs = content.match(jsdocRegex) || [];
    
    exports.forEach(exp => {
      // Buscar si hay JSDoc justo antes de la función
      const lines = content.split('\n');
      const lineAbove = lines[exp.line - 2] || '';
      if (!lineAbove.includes('*/')) {
        this.missingDocs.push({
          file: filePath,
          function: exp.name,
          line: exp.line
        });
      }
    });
    
    return {
      fileName,
      exports: exports.length,
      documented: jsdocs.length,
      coverage: exports.length > 0 ? Math.round((jsdocs.length / exports.length) * 100) : 0
    };
  }

  getRecentFiles() {
    try {
      // Obtener archivos modificados en los últimos 7 días usando git log
      const gitLog = execSync(
        'git log --since="7 days ago" --name-only --pretty=format:',
        { encoding: 'utf8' }
      );
      
      // Procesar el resultado en JavaScript en lugar de usar comandos Unix
      const files = gitLog
        .split('\n')
        .filter(Boolean) // Eliminar líneas vacías
        .filter((file, index, self) => self.indexOf(file) === index) // Eliminar duplicados (como uniq)
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx')) // Filtrar por extensión
        .sort(); // Ordenar
      
      return files;
    } catch (error) {
      console.log('⚠️ No se pudo obtener el historial de git. Analizando todos los archivos...\n');
      return this.getAllTsFiles();
    }
  }

  getAllTsFiles() {
    const files = [];
    const srcDir = path.join(process.cwd(), 'src');
    
    function walkDir(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
          const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
          files.push(relativePath);
        }
      }
    }
    
    walkDir(srcDir);
    return files;
  }

  detectChanges() {
    console.log('🔍 Analizando proyecto...\n');
    
    const recentFiles = this.getRecentFiles();
    
    if (recentFiles.length === 0) {
      console.log('✅ No se encontraron archivos modificados recientemente.\n');
      return;
    }
    
    console.log(`📝 Archivos TypeScript analizados: ${recentFiles.length}\n`);
    
    const stats = {
      total: 0,
      documented: 0,
      undocumented: 0
    };
    
    recentFiles.forEach(file => {
      const analysis = this.analyzeFile(file);
      if (analysis) {
        stats.total += analysis.exports;
        stats.documented += analysis.documented;
        stats.undocumented += (analysis.exports - analysis.documented);
        
        if (analysis.exports > 0) {
          console.log(`  ${this.getCoverageEmoji(analysis.coverage)} ${file}`);
          console.log(`     Funciones: ${analysis.exports} | Documentadas: ${analysis.documented} | Cobertura: ${analysis.coverage}%`);
        }
      }
    });
    
    console.log('\n📊 Resumen Global:');
    console.log(`   Total de funciones exportadas: ${stats.total}`);
    console.log(`   Documentadas con JSDoc: ${stats.documented}`);
    console.log(`   Sin documentación: ${stats.undocumented}`);
    console.log(`   Cobertura general: ${stats.total > 0 ? Math.round((stats.documented / stats.total) * 100) : 0}%`);
    
    if (this.missingDocs.length > 0) {
      console.log(`\n⚠️  Top 10 funciones sin documentación JSDoc:\n`);
      this.missingDocs.slice(0, 10).forEach(item => {
        console.log(`  • ${item.function}() en ${item.file}:${item.line}`);
      });
      
      if (this.missingDocs.length > 10) {
        console.log(`  ... y ${this.missingDocs.length - 10} más`);
      }
    } else {
      console.log('\n✅ ¡Todas las funciones están documentadas!');
    }
    
    this.generateReport(recentFiles, stats);
  }
  
  getCoverageEmoji(coverage) {
    if (coverage >= 80) return '✅';
    if (coverage >= 50) return '⚠️';
    return '❌';
  }
  
  generateReport(files, stats) {
    const report = `# 📊 Reporte de Documentación - CineNacional

Generado: ${new Date().toLocaleString('es-AR')}

## 📈 Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| Archivos analizados | ${files.length} |
| Funciones totales | ${stats.total} |
| Funciones documentadas | ${stats.documented} |
| Funciones sin documentar | ${stats.undocumented} |
| **Cobertura de documentación** | **${stats.total > 0 ? Math.round((stats.documented / stats.total) * 100) : 0}%** |

## 📁 Archivos Analizados

${files.length === 0 ? 'No se encontraron archivos para analizar.' : 
  files.slice(0, 20).map(file => `- \`${file}\``).join('\n')}
${files.length > 20 ? `\n... y ${files.length - 20} archivos más` : ''}

## ⚠️ Funciones sin Documentación

${this.missingDocs.length === 0 ? '✅ **¡Todas las funciones están documentadas!**' : 
  this.missingDocs.slice(0, 20).map(item => 
    `- \`${item.function}()\` en [${item.file}:${item.line}](../${item.file}#L${item.line})`
  ).join('\n')}
${this.missingDocs.length > 20 ? `\n... y ${this.missingDocs.length - 20} funciones más sin documentar` : ''}

## 💡 Cómo Agregar Documentación JSDoc

\`\`\`typescript
/**
 * Descripción breve de lo que hace la función
 * 
 * @param {string} paramName - Descripción del parámetro
 * @param {number} [optionalParam] - Parámetro opcional
 * @returns {Promise<ResultType>} Descripción del retorno
 * @throws {Error} Cuándo puede lanzar error
 * @example
 * const result = await myFunction('value', 123);
 */
export async function myFunction(paramName: string, optionalParam?: number): Promise<ResultType> {
  // ...
}
\`\`\`

## 🚀 Próximos Pasos

1. Agregar JSDoc a las funciones sin documentar
2. Ejecutar \`npm run docs:api\` para generar documentación automática
3. Revisar y actualizar la documentación manual si es necesario

## 📝 Scripts Disponibles

\`\`\`bash
# Detectar cambios y generar este reporte
npm run docs:detect

# Generar documentación desde JSDoc
npm run docs:api

# Actualizar toda la documentación
npm run docs:update
\`\`\`
`;
    
    // Asegurar que existe el directorio docs
    if (!fs.existsSync('docs')) {
      fs.mkdirSync('docs');
    }
    
    fs.writeFileSync('docs/DOCUMENTATION_REPORT.md', report);
    console.log('\n📋 Reporte detallado guardado en: docs/DOCUMENTATION_REPORT.md');
  }
  
  run() {
    try {
      this.detectChanges();
    } catch (error) {
      console.error('❌ Error durante el análisis:', error.message);
      console.error('\nPuedes reportar este error con el siguiente detalle:');
      console.error(error.stack);
    }
  }
}

// Ejecutar el detector
const detector = new EnhancedDocDetector();
detector.run();