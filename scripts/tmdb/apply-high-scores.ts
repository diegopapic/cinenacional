/**
 * Script para aplicar matches con score >= 80 desde el CSV
 * 
 * Uso:
 *   npx tsx apply-high-scores.ts --dry-run     # Solo muestra qué haría
 *   npx tsx apply-high-scores.ts --apply       # Aplica los cambios
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Configuración de conexión (ajustar según tu entorno)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'cinenacional',
  user: process.env.DB_USER || 'cinenacional',
  password: process.env.DB_PASSWORD || 'Paganitzu',
});

const MIN_SCORE = 80;

interface MatchRow {
  local_id: number;
  local_title: string;
  tmdb_id: number | null;
  tmdb_title: string | null;
  match_score: number;
  match_status: string;
  match_reason: string;
}

function parseCSV(filePath: string): MatchRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Detectar separador (puede ser ; o ,)
  const separator = lines[0].includes(';') ? ';' : ',';
  
  // Parsear header
  const headers = lines[0].replace(/^\uFEFF/, '').split(separator);
  
  const rows: MatchRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator);
    
    // Mapear valores a objeto
    const row: any = {};
    headers.forEach((header, idx) => {
      let value = values[idx]?.replace(/^"|"$/g, '').trim();
      row[header.trim()] = value;
    });
    
    // Convertir tipos
    const matchRow: MatchRow = {
      local_id: parseInt(row.local_id) || 0,
      local_title: row.local_title || '',
      tmdb_id: row.tmdb_id ? parseInt(row.tmdb_id) : null,
      tmdb_title: row.tmdb_title || null,
      match_score: parseInt(row.match_score) || 0,
      // El CSV tiene "auto_accept" como nombre de columna para el status
      match_status: row.auto_accept || row.match_status || 'no_match',
      match_reason: row.match_reason || '',
    };
    
    if (matchRow.local_id > 0) {
      rows.push(matchRow);
    }
  }
  
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--apply');
  const csvPath = args.find(a => a.endsWith('.csv')) || 'movies-matches-20260120T011323.csv';
  
  console.log('\n🎬 Aplicar matches con score >= ' + MIN_SCORE);
  console.log('=' .repeat(50) + '\n');
  
  // Buscar el archivo CSV
  let fullPath = csvPath;
  if (!fs.existsSync(fullPath)) {
    // Buscar en directorio actual y común
    const possiblePaths = [
      csvPath,
      path.join(process.cwd(), csvPath),
      path.join(process.cwd(), 'reports', csvPath),
      path.join(process.cwd(), 'scripts', 'reports', csvPath),
      path.join(process.cwd(), '..', 'reports', csvPath),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fullPath = p;
        break;
      }
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ No se encontró el archivo: ${csvPath}`);
    process.exit(1);
  }
  
  console.log(`📄 Leyendo: ${fullPath}`);
  const rows = parseCSV(fullPath);
  console.log(`   Total registros: ${rows.length}`);
  
  // Filtrar los que tienen score >= MIN_SCORE y tmdb_id válido
  const toApply = rows.filter(r => 
    r.match_score >= MIN_SCORE && 
    r.tmdb_id && 
    r.tmdb_id > 0
  );
  
  // Separar los que ya fueron aplicados (auto_accept) de los nuevos
  const alreadyApplied = toApply.filter(r => r.match_status === 'auto_accept');
  const newToApply = toApply.filter(r => r.match_status !== 'auto_accept');
  
  console.log(`\n📊 Estadísticas:`);
  console.log(`   Score >= ${MIN_SCORE} con TMDB ID: ${toApply.length}`);
  console.log(`   Ya aplicados (auto_accept):    ${alreadyApplied.length}`);
  console.log(`   Nuevos a aplicar:              ${newToApply.length}`);
  
  // Mostrar distribución por score
  const byScore: Record<number, number> = {};
  newToApply.forEach(r => {
    const scoreRange = Math.floor(r.match_score / 10) * 10;
    byScore[scoreRange] = (byScore[scoreRange] || 0) + 1;
  });
  
  console.log(`\n   Distribución de nuevos por score:`);
  Object.keys(byScore).sort((a, b) => parseInt(b) - parseInt(a)).forEach(score => {
    console.log(`     ${score}-${parseInt(score) + 9}: ${byScore[parseInt(score)]} películas`);
  });
  
  if (newToApply.length === 0) {
    console.log('\n✅ No hay nuevos matches para aplicar.');
    await pool.end();
    return;
  }
  
  // Mostrar algunos ejemplos
  console.log(`\n📝 Ejemplos de lo que se aplicará:`);
  newToApply.slice(0, 10).forEach(r => {
    console.log(`   [${r.match_score}] "${r.local_title}" → TMDB ${r.tmdb_id} "${r.tmdb_title}"`);
  });
  if (newToApply.length > 10) {
    console.log(`   ... y ${newToApply.length - 10} más`);
  }
  
  if (isDryRun) {
    console.log('\n💡 Modo DRY-RUN: No se aplicaron cambios.');
    console.log('   Para aplicar: npx tsx apply-high-scores.ts --apply');
    await pool.end();
    return;
  }
  
  // Aplicar cambios
  console.log(`\n🔄 Aplicando ${newToApply.length} cambios a la base de datos...`);
  
  let updated = 0;
  let errors = 0;
  
  for (const match of newToApply) {
    try {
      const result = await pool.query(
        'UPDATE movies SET tmdb_id = $1 WHERE id = $2 AND (tmdb_id IS NULL OR tmdb_id = 0)',
        [match.tmdb_id, match.local_id]
      );
      
      if (result.rowCount && result.rowCount > 0) {
        updated++;
      }
    } catch (error) {
      console.error(`   ❌ Error en película ${match.local_id}: ${error}`);
      errors++;
    }
    
    // Mostrar progreso cada 100
    if ((updated + errors) % 100 === 0) {
      process.stdout.write(`\r   Procesadas: ${updated + errors}/${newToApply.length}`);
    }
  }
  
  console.log(`\n\n✅ Resultado:`);
  console.log(`   Actualizadas: ${updated}`);
  console.log(`   Errores:      ${errors}`);
  console.log(`   Sin cambio:   ${newToApply.length - updated - errors} (ya tenían tmdb_id)`);
  
  await pool.end();
  console.log('\n✨ Proceso completado\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});