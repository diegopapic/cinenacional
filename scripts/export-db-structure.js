// scripts/export-db-structure.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exportDatabaseStructure() {
  try {
    console.log('📦 Exportando estructura de base de datos...');
    
    const timestamp = new Date().toISOString();
    let output = `# Estructura de Base de Datos - CineNacional
# Generado automáticamente el: ${timestamp}
# ================================================

`;

    // Método 1: Leer el schema.prisma actual
    try {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      if (fs.existsSync(schemaPath)) {
        const prismaSchema = fs.readFileSync(schemaPath, 'utf8');
        output += `## Schema Prisma\n\n\`\`\`prisma\n${prismaSchema}\n\`\`\`\n\n`;
      }
    } catch (error) {
      console.warn('⚠️  No se pudo leer schema.prisma:', error.message);
    }

    // Método 2: Generar SQL de la estructura actual
    try {
      console.log('Generando SQL desde Prisma...');
      // Intenta generar el SQL del schema
      const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datasource --script', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'] // Captura stdout sin mostrar en consola
      });
      
      if (sql) {
        output += `## Estructura SQL\n\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;
      }
    } catch (error) {
      console.warn('⚠️  No se pudo generar SQL:', error.message);
    }

    // Método 3: Introspección de la base de datos actual
    try {
      console.log('Introspectando base de datos...');
      // Genera un schema temporal basado en la DB actual
      execSync('npx prisma db pull --force', {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Lee el schema actualizado
      const updatedSchema = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
      
      // Extrae información de tablas y relaciones
      const tables = [];
      const relations = [];
      
      // Parsea el schema para extraer modelos
      const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
      let match;
      
      while ((match = modelRegex.exec(updatedSchema)) !== null) {
        const modelName = match[1];
        const modelContent = match[2];
        
        // Cuenta campos
        const fields = modelContent.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('@@')
        ).length;
        
        tables.push({
          name: modelName,
          fields: fields
        });
        
        // Busca relaciones
        if (modelContent.includes('@relation')) {
          relations.push(modelName);
        }
      }
      
      output += `## Resumen de Estructura\n\n`;
      output += `### Tablas (${tables.length})\n\n`;
      tables.forEach(table => {
        output += `- **${table.name}** (${table.fields} campos)\n`;
      });
      
      output += `\n### Tablas con Relaciones\n\n`;
      relations.forEach(rel => {
        output += `- ${rel}\n`;
      });
      
    } catch (error) {
      console.warn('⚠️  No se pudo introspeccionar la base de datos:', error.message);
    }

    // Guardar el archivo en la raíz del proyecto
    const outputPath = path.join(process.cwd(), 'database-structure.txt');
    fs.writeFileSync(outputPath, output);
    
    console.log(`✅ Estructura exportada a: database-structure.txt`);
    
    // También crear un archivo JSON con metadata
    const metadata = {
      timestamp: timestamp,
      exportedAt: new Date().toLocaleString('es-AR'),
      prismaVersion: getPrismaVersion(),
      nodeVersion: process.version
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'database-structure-meta.json'),
      JSON.stringify(metadata, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Error exportando estructura:', error);
    // No fallar el commit si hay un error
    process.exit(0);
  }
}

function getPrismaVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    return packageJson.dependencies?.prisma || packageJson.devDependencies?.prisma || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  exportDatabaseStructure();
}

module.exports = exportDatabaseStructure;