const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function exportDatabaseStructure() {
  console.log('🗄️ Exportando estructura de base de datos...');
  
  let content = `# Estructura de Base de Datos - CineNacional
# Generado automáticamente el: ${new Date().toISOString()}
# ================================================

## Schema Prisma

\`\`\`prisma
`;

  try {
    // 1. Leer el schema.prisma
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    content += schemaContent;
    content += '\n```\n\n';

    // 2. Intentar generar SQL (solo si no estamos en CI)
    if (!process.env.CI) {
      try {
        console.log('Generando SQL desde Prisma...');
        const sql = execSync(
          'npx prisma migrate diff --from-empty --to-schema-datamodel=./prisma/schema.prisma --script',
          { encoding: 'utf8', stdio: 'pipe' }
        );
        
        content += '## SQL Generado\n\n```sql\n';
        content += sql;
        content += '\n```\n';
      } catch (e) {
        console.log('⚠️  No se pudo generar SQL');
      }
    }

    // 3. Guardar el archivo
    const outputPath = path.join(process.cwd(), 'database-structure.txt');
    fs.writeFileSync(outputPath, content);
    console.log('✅ Estructura exportada a:', outputPath);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
if (require.main === module) {
  exportDatabaseStructure();
}

module.exports = { exportDatabaseStructure };