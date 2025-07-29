// generate-structure.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const REPO_OWNER = 'diegopapic';
const REPO_NAME = 'cinenacional';
const BRANCH = 'main';
const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

// Directorios y archivos a ignorar
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.vercel',
  '.husky',
  'coverage'
];

const IGNORE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  'compiled-code.txt',
  'admin-code.txt',
  'compiled-code-*.txt'
];

// Función para verificar si un archivo/directorio debe ser ignorado
function shouldIgnore(filePath) {
  const basename = path.basename(filePath);
  
  // Verificar directorios
  for (const dir of IGNORE_DIRS) {
    if (filePath.includes(path.sep + dir + path.sep) || filePath.endsWith(path.sep + dir)) {
      return true;
    }
  }
  
  // Verificar archivos
  for (const pattern of IGNORE_FILES) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(basename)) return true;
    } else if (basename === pattern) {
      return true;
    }
  }
  
  return false;
}

// Función para construir la estructura del proyecto
function buildStructure(dir, basePath = '') {
  const structure = {};
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      
      if (shouldIgnore(fullPath)) continue;
      
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        const subStructure = buildStructure(fullPath, relativePath);
        if (Object.keys(subStructure).length > 0) {
          structure[item] = subStructure;
        }
      } else if (stats.isFile()) {
        structure[item] = `${BASE_URL}/${relativePath.replace(/\\/g, '/')}`;
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return structure;
}

// Función para obtener el último commit (opcional)
function getLastCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

// Función principal
function generateStructure() {
  console.log('Generando estructura del proyecto...');
  
  const projectRoot = process.cwd();
  const structure = buildStructure(projectRoot);
  
  const output = {
    timestamp: new Date().toISOString(),
    repository: `${REPO_OWNER}/${REPO_NAME}`,
    branch: BRANCH,
    commit: getLastCommit(),
    structure: structure,
    instructions: "INSTRUCCIONES PARA CLAUDE: Este es un mapa completo del repositorio generado automáticamente. Cada archivo tiene una URL que puedes usar con web_fetch para leer su contenido."
  };
  
  // Guardar el archivo
  fs.writeFileSync(
    'project-structure.json',
    JSON.stringify(output, null, 2)
  );
  
  console.log('✅ project-structure.json generado exitosamente');
  
  // También generar una versión simplificada con solo las rutas
  const files = [];
  
  function extractFiles(obj, currentPath = '') {
    for (const key in obj) {
      const value = obj[key];
      const newPath = currentPath ? `${currentPath}/${key}` : key;
      
      if (typeof value === 'string') {
        files.push({
          path: newPath,
          raw_url: value,
          size: 0 // Podríamos calcular el tamaño real si es necesario
        });
      } else if (typeof value === 'object') {
        extractFiles(value, newPath);
      }
    }
  }
  
  extractFiles(structure);
  
  fs.writeFileSync(
    'raw_urls_detailed.json',
    JSON.stringify(files, null, 2)
  );
  
  // Generar también un archivo markdown con las URLs
  const markdown = files
    .filter(f => ['.ts', '.tsx', '.js', '.jsx'].some(ext => f.path.endsWith(ext)))
    .map(f => `- [${f.path}](${f.raw_url})`)
    .join('\n');
  
  fs.writeFileSync('raw_urls.md', `# URLs del Proyecto\n\n${markdown}`);
  
  console.log('✅ raw_urls_detailed.json generado');
  console.log('✅ raw_urls.md generado');
  console.log(`📁 Total de archivos: ${files.length}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateStructure();
}

module.exports = { generateStructure };