// app/api/project-structure/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Solo funciona en desarrollo local
const IS_DEV = process.env.NODE_ENV === 'development';

export async function GET(request: Request) {
  // Opcional: agregar clave de seguridad
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  // Cambia 'tu-clave-secreta' por algo único
  if (key !== 'tu-clave-secreta' && !IS_DEV) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!IS_DEV) {
    // En producción, devolver estructura predefinida
    return NextResponse.json({
      message: "Project structure endpoint",
      structure: {
        "app": {
          "page.tsx": "https://raw.githubusercontent.com/diegopapic/cinenacional/main/app/page.tsx",
          "layout.tsx": "https://raw.githubusercontent.com/diegopapic/cinenacional/main/app/layout.tsx",
          "globals.css": "https://raw.githubusercontent.com/diegopapic/cinenacional/main/app/globals.css"
        },
        "components": {
          // Agregar componentes aquí
        },
        "lib": {
          // Agregar archivos de lib aquí
        }
      },
      quickLinks: {
        package: "https://raw.githubusercontent.com/diegopapic/cinenacional/main/package.json",
        tsconfig: "https://raw.githubusercontent.com/diegopapic/cinenacional/main/tsconfig.json",
        nextConfig: "https://raw.githubusercontent.com/diegopapic/cinenacional/main/next.config.js"
      }
    });
  }
  
  // En desarrollo, escanear el proyecto real
  function scanDir(dir: string, base = ''): any {
    const items = fs.readdirSync(dir);
    const result: any = {};
    
    items.forEach(item => {
      if (item.startsWith('.') || item === 'node_modules') return;
      
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        result[item] = scanDir(fullPath, path.join(base, item));
      } else if (item.match(/\.(ts|tsx|js|jsx|json|css|md)$/)) {
        result[item] = `https://raw.githubusercontent.com/diegopapic/cinenacional/main/${path.join(base, item)}`;
      }
    });
    
    return result;
  }
  
  const structure = scanDir(process.cwd());
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    structure
  });
}