import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Función para escanear directorio
  function scanDir(dir: string, base = ''): any {
    try {
      const items = fs.readdirSync(dir);
      const result: any = {};

      items.forEach(item => {
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
            if (Object.keys(subResult).length > 0) {
              result[item] = subResult;
            }
          } else if (item.match(/\.(ts|tsx|js|jsx|json|css|scss|md|sql|prisma)$/)) {
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
    return NextResponse.json({
      error: 'Error scanning project',
    }, { status: 500 });
  }
}

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
