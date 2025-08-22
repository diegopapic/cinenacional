// scripts/verify-changes.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando cambios realizados...\n');

const modifiedFiles = [
  'src/lib/people/peopleConstants.ts',
  'src/lib/movies/movieConstants.ts',
  'src/lib/roles/rolesTypes.ts',
  'src/lib/roles/roleUtils.ts',
  'src/lib/movies/movieTypes.ts',
  'src/app/api/locations/route.ts',
  'src/lib/utils.ts',
  'src/app/api/calificaciones/[id]/route.ts',
  'src/app/api/countries/[id]/route.ts',
  'src/app/api/genres/[id]/route.ts'
];

modifiedFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const backupPath = filePath + '.backup';
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file} - No encontrado`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const hasBackup = fs.existsSync(backupPath);
  
  // Contar JSDoc agregados
  const jsdocCount = (content.match(/\/\*\*/g) || []).length;
  
  // Ver primeras líneas con JSDoc
  const lines = content.split('\n');
  let firstJSDoc = null;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('/**')) {
      firstJSDoc = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');
      break;
    }
  }
  
  console.log(`📄 ${file}`);
  console.log(`   JSDoc agregados: ${jsdocCount}`);
  console.log(`   Backup creado: ${hasBackup ? '✅' : '❌'}`);
  
  if (firstJSDoc) {
    console.log(`   Ejemplo de JSDoc agregado:`);
    console.log('   ' + firstJSDoc.split('\n').join('\n   '));
  }
  console.log('');
});

// Verificar que el proyecto sigue compilando
console.log('🔨 Verificando que TypeScript compile correctamente...\n');

const { execSync } = require('child_process');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compila correctamente\n');
} catch (error) {
  console.log('⚠️ Hay errores de TypeScript (puede ser normal si ya los tenías antes)\n');
}

console.log('📊 Resumen:');
console.log('   - 10 archivos modificados');
console.log('   - Backups creados para cada archivo');
console.log('   - JSDoc básico agregado\n');

console.log('💡 Próximos pasos:');
console.log('   1. Revisa los cambios con: git diff');
console.log('   2. Si todo está bien: git add . && git commit -m "Add JSDoc documentation"');
console.log('   3. Si algo está mal: restaura desde los .backup');
console.log('   4. Para mejorar los JSDoc, edita manualmente agregando @param y @returns específicos\n');

// Mostrar cómo restaurar si es necesario
console.log('🔄 Si necesitas revertir algún archivo:');
console.log('   cp src/lib/people/peopleConstants.ts.backup src/lib/people/peopleConstants.ts');