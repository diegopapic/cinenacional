// scripts/debug-tiempo-revancha.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const unserialize = require('php-unserialize');

function extractPersonId(serializedValue) {
  if (!serializedValue) return null;
  
  try {
    if (serializedValue.startsWith('a:')) {
      const data = unserialize.unserialize(serializedValue);
      if (Array.isArray(data) && data.length > 0) {
        return parseInt(data[0].toString());
      }
      if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0) {
          return parseInt(values[0].toString());
        }
      }
    } else if (!isNaN(serializedValue)) {
      return parseInt(serializedValue);
    }
  } catch (e) {}
  
  return null;
}

async function debugMovie() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    const movieId = 1737; // Tiempo de revancha
    console.log('🎬 Analizando "Tiempo de revancha" (ID: 1737)\n');

    // Obtener TODOS los campos de crew
    const [allData] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = ?
      AND meta_key LIKE 'ficha_tecnica_%'
      ORDER BY meta_key
    `, [movieId]);

    // Organizar por tipo
    const counters = {};
    const normalData = {};
    const importData = {};

    allData.forEach(row => {
      const key = row.meta_key;
      const value = row.meta_value;

      // Es un contador principal?
      if (key.match(/^ficha_tecnica_[^_]+$/) && !isNaN(value)) {
        counters[key] = parseInt(value);
      }
      // Es un campo normal?
      else if (!key.includes('_import_') && key.match(/_\d+_/)) {
        normalData[key] = value;
      }
      // Es un campo import?
      else if (key.includes('_import_')) {
        importData[key] = value;
      }
      // Es un contador import?
      else if (key.endsWith('_import') && !isNaN(value)) {
        counters[key] = parseInt(value);
      }
    });

    console.log('📊 Contadores encontrados:');
    Object.entries(counters).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Analizar cada departamento
    console.log('\n📋 Análisis por departamento:\n');

    const departments = new Set();
    Object.keys(normalData).forEach(key => {
      const match = key.match(/^ficha_tecnica_([^_]+)_\d+_/);
      if (match) departments.add(match[1]);
    });
    Object.keys(importData).forEach(key => {
      const match = key.match(/^ficha_tecnica_([^_]+)_import_\d+_/);
      if (match) departments.add(match[1]);
    });

    for (const dept of departments) {
      console.log(`\n🎭 ${dept.toUpperCase()}:`);
      
      const normalCount = counters[`ficha_tecnica_${dept}`] || 0;
      const importCount = counters[`ficha_tecnica_${dept}_import`] || 0;
      console.log(`  Contador normal: ${normalCount}`);
      console.log(`  Contador import: ${importCount}`);
      
      const maxCount = Math.max(normalCount, importCount, 10); // Revisar hasta 10 por si acaso
      
      for (let i = 0; i < maxCount; i++) {
        // Datos normales
        const normalPerson = normalData[`ficha_tecnica_${dept}_${i}_persona`];
        const normalRole = normalData[`ficha_tecnica_${dept}_${i}_rol`];
        const normalCredited = normalData[`ficha_tecnica_${dept}_${i}_acreditado_con_su`];
        const normalComment = normalData[`ficha_tecnica_${dept}_${i}_comentario`];
        
        // Datos import
        const importPerson = importData[`ficha_tecnica_${dept}_import_${i}_persona`];
        const importRole = importData[`ficha_tecnica_${dept}_import_${i}_rol`];
        const importCredited = importData[`ficha_tecnica_${dept}_import_${i}_acreditado_con_su`];
        
        if (!normalPerson && !importPerson) continue;
        
        console.log(`\n  [${i}]:`);
        
        if (normalPerson) {
          const personId = extractPersonId(normalPerson);
          console.log(`    Normal:`);
          console.log(`      Persona ID: ${personId}`);
          console.log(`      Rol: "${normalRole}"`);
          console.log(`      Acreditado: "${normalCredited}"`);
          console.log(`      Comentario: "${normalComment}"`);
        }
        
        if (importPerson) {
          const personId = extractPersonId(importPerson);
          console.log(`    Import:`);
          console.log(`      Persona ID: ${personId}`);
          console.log(`      Rol: "${importRole}"`);
          console.log(`      Acreditado: "${importCredited}"`);
        }
        
        // Análisis de diferencias
        if (normalPerson && importPerson) {
          const normalId = extractPersonId(normalPerson);
          const importId = extractPersonId(importPerson);
          
          if (normalId === importId && normalRole === importRole) {
            if (normalCredited === importCredited) {
              console.log(`    ✅ IDÉNTICOS`);
            } else {
              console.log(`    ⚠️ DIFERENCIA en acreditado:`);
              console.log(`       Normal: "${normalCredited}"`);
              console.log(`       Import: "${importCredited}"`);
            }
          } else {
            console.log(`    ❌ CONFLICTO`);
          }
        } else if (normalPerson) {
          console.log(`    📝 Solo en NORMAL`);
        } else {
          console.log(`    📝 Solo en IMPORT`);
        }
      }
    }

    // Contar totales esperados
    let totalExpected = 0;
    for (const dept of departments) {
      const normalCount = counters[`ficha_tecnica_${dept}`] || 0;
      const importCount = counters[`ficha_tecnica_${dept}_import`] || 0;
      totalExpected += Math.max(normalCount, importCount);
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Departamentos: ${departments.size}`);
    console.log(`  Total esperado de crew: ${totalExpected}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugMovie();