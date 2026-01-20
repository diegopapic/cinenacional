// compile-project-code.js
const fs = require('fs');
const path = require('path');

// Archivos a excluir por contener secrets/API keys
const EXCLUDED_FILES = [
  'scripts/telegram-bot-handler.ts',
  'scripts/tmdb/config.ts',
  'scripts/tmdb/test-api.ts'
];

// Función para construir la ruta completa del archivo
function buildFilePath(structure, currentPath = '') {
  let paths = [];
  
  for (const key in structure) {
    const value = structure[key];
    const newPath = currentPath ? `${currentPath}/${key}` : key;
    
    if (typeof value === 'string' && value.startsWith('https://')) {
      paths.push({
        path: newPath,
        url: value,
        localPath: newPath
      });
    } else if (typeof value === 'object') {
      paths = paths.concat(buildFilePath(value, newPath));
    }
  }
  
  return paths;
}

function readLocalFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error leyendo ${filePath}:`, error.message);
    return null;
  }
}

async function compileProject() {
  try {
    // Primero, asegurarse de que existe project-structure.json
    if (!fs.existsSync('project-structure.json')) {
      console.log('Generando project-structure.json...');
      require('./generate-structure.js');
    }
    
    // Leer el archivo de estructura
    const structureJson = fs.readFileSync('project-structure.json', 'utf8');
    const projectData = JSON.parse(structureJson);
    
    // Extraer todas las rutas
    const files = buildFilePath(projectData.structure);
    
    // Filtrar solo los archivos relevantes
    const relevantFiles = files.filter(file => {
      const ext = path.extname(file.path);
      
      // Verificar si el archivo está en la lista de excluidos
      const isExcluded = EXCLUDED_FILES.some(excluded => file.path.includes(excluded));
      
      return ['.tsx', '.ts'].includes(ext) && 
             !file.path.includes('node_modules') &&
             !file.path.includes('.json') &&
             !file.path.includes('package-lock') &&
             !isExcluded;
    });
    
    console.log(`Compilando ${relevantFiles.length} archivos...`);
    console.log(`(Excluidos ${EXCLUDED_FILES.length} archivos con secrets)`);
    
    let output = `// Código compilado del proyecto: ${projectData.repository}
// Commit: ${projectData.commit || 'local'}
// Fecha: ${new Date().toISOString()}
// ============================================\n\n`;
    
    // Leer y compilar archivos localmente
    for (const file of relevantFiles) {
      const content = readLocalFile(file.localPath);
      
      if (content) {
        output += `\n\n// ${'='.repeat(50)}\n`;
        output += `// ${file.path}\n`;
        output += `// ${'='.repeat(50)}\n`;
        output += content;
      }
    }
    
    // Guardar el archivo compilado
    const outputFilename = `compiled-code.txt`;
    fs.writeFileSync(outputFilename, output);
    
    console.log(`\n✅ Código compilado guardado en: ${outputFilename}`);
    console.log(`Tamaño del archivo: ${(output.length / 1024 / 1024).toFixed(2)} MB`);
    
    // También crear una versión con solo archivos del admin
    const adminFiles = relevantFiles.filter(file => 
      file.path.includes('admin') || 
      file.path.includes('api/movies') ||
      file.path.includes('api/people') ||
      file.path.includes('components/admin') ||
      file.path.includes('lib/schemas') ||
      file.path.includes('lib/prisma')
    );
    
    if (adminFiles.length > 0) {
      let adminOutput = `// Archivos del admin - ${new Date().toISOString()}\n// ==================\n\n`;
      
      for (const file of adminFiles) {
        const content = readLocalFile(file.localPath);
        if (content) {
          adminOutput += `\n\n// ${'='.repeat(50)}\n`;
          adminOutput += `// ${file.path}\n`;
          adminOutput += `// ${'='.repeat(50)}\n`;
          adminOutput += content;
        }
      }
      
      fs.writeFileSync('admin-code.txt', adminOutput);
      console.log(`✅ Código del admin guardado en: admin-code.txt`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar
compileProject();

// Exportar para poder usarlo desde otros scripts
module.exports = { compileProject };