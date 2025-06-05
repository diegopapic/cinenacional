// src/app/api/project-structure/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  // Verificar clave de seguridad
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (key !== 'cinenacional2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Función para escanear directorio
  function scanDir(dir: string, base = ''): any {
    try {
      const items = fs.readdirSync(dir);
      const result: any = {};
      
      items.forEach(item => {
        // Ignorar archivos y carpetas que no necesitamos
        if (item.startsWith('.') || 
            item === 'node_modules' || 
            item === '.next' ||
            item === 'out' ||
            item === 'coverage' ||
            item === '.vercel') return;
        
        const fullPath = path.join(dir, item);
        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            const subResult = scanDir(fullPath, path.join(base, item));
            // Solo incluir directorios que tengan contenido
            if (Object.keys(subResult).length > 0) {
              result[item] = subResult;
            }
          } else if (item.match(/\.(ts|tsx|js|jsx|json|css|scss|md|sql|prisma)$/)) {
            // Crear URL de GitHub para cada archivo
            result[item] = `https://raw.githubusercontent.com/diegopapic/cinenacional/main/${path.join(base, item).replace(/\\/g, '/')}`;
          }
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error);
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
      return {};
    }
  }
  
  try {
    const projectRoot = process.cwd();
    const structure = scanDir(projectRoot);
    
    // Agregar algunos archivos importantes en la raíz manualmente si no fueron escaneados
    const rootFiles = ['package.json', 'tsconfig.json', 'next.config.js', 'next.config.mjs', '.env.example', 'README.md'];
    const quickLinks: any = {};
    
    rootFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        quickLinks[file] = `https://raw.githubusercontent.com/diegopapic/cinenacional/main/${file}`;
      }
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      repository: "https://github.com/diegopapic/cinenacional",
      structure,
      quickLinks,
      totalFiles: countFiles(structure)
    });
  } catch (error) {
    // Si hay algún error al escanear, devolver una respuesta de error informativa
    return NextResponse.json({
      error: 'Error scanning project',
      details: error instanceof Error ? error.message : 'Unknown error',
      // Proporcionar al menos los enlaces básicos
      quickLinks: {
        package: "https://raw.githubusercontent.com/diegopapic/cinenacional/main/package.json",
        tsconfig: "https://raw.githubusercontent.com/diegopapic/cinenacional/main/tsconfig.json"
      }
    });
  }
}

// Función auxiliar para contar archivos
function countFiles(obj: any): number {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      count++;
    } else if (typeof obj[key] === 'object') {
      count += countFiles(obj[key]);
    }
  }
  return count;
}