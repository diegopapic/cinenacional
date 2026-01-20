/**
 * Utilidades comunes para scripts de enriquecimiento
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import config from './config';

// Pool de conexión a PostgreSQL
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Normalizar texto para comparación
 * - Quita acentos
 * - Convierte a minúsculas
 * - Quita caracteres especiales
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // Quitar caracteres especiales
    .replace(/\s+/g, ' ')            // Normalizar espacios
    .trim();
}

/**
 * Calcular similitud entre dos strings (0-100)
 * Usa distancia de Levenshtein normalizada
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Parsear fecha de TMDB (YYYY-MM-DD) a objeto
 */
export function parseTMDBDate(dateStr: string | null): { year: number | null; month: number | null; day: number | null } {
  if (!dateStr) return { year: null, month: null, day: null };
  
  const parts = dateStr.split('-');
  return {
    year: parts[0] ? parseInt(parts[0]) : null,
    month: parts[1] ? parseInt(parts[1]) : null,
    day: parts[2] ? parseInt(parts[2]) : null,
  };
}

/**
 * Comparar fechas parciales
 * Retorna puntuación: 0-100 basado en coincidencia
 */
export function compareDates(
  date1: { year: number | null; month: number | null; day: number | null },
  date2: { year: number | null; month: number | null; day: number | null }
): number {
  if (!date1.year || !date2.year) return 0;
  
  let score = 0;
  
  // Año coincide: 50 puntos
  if (date1.year === date2.year) {
    score += 50;
    
    // Si ambos tienen mes y coincide: 30 puntos más
    if (date1.month && date2.month && date1.month === date2.month) {
      score += 30;
      
      // Si ambos tienen día y coincide: 20 puntos más
      if (date1.day && date2.day && date1.day === date2.day) {
        score += 20;
      }
    }
  } else if (Math.abs(date1.year - date2.year) === 1) {
    // Un año de diferencia: 20 puntos (puede ser error de datos)
    score += 20;
  }
  
  return score;
}

/**
 * Verificar si un lugar contiene "Argentina"
 */
export function isArgentineLocation(place: string | null): boolean {
  if (!place) return false;
  const normalized = normalizeText(place);
  return normalized.includes('argentina') || 
         normalized.includes('buenos aires') ||
         normalized.includes('cordoba') ||
         normalized.includes('rosario') ||
         normalized.includes('mendoza');
}

/**
 * Guardar resultados en CSV
 */
export function saveToCSV(
  data: Record<string, any>[],
  filename: string,
  headers: string[]
): void {
  const reportsDir = path.join(__dirname, 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const filepath = path.join(reportsDir, filename);
  
  // Escapar valores CSV
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const lines = [
    headers.join(','),
    ...data.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ];
  
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  console.log(`✅ Guardado: ${filepath} (${data.length} registros)`);
}

/**
 * Parsear una línea CSV respetando comillas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Comilla escapada
        current += '"';
        i++;
      } else if (char === '"') {
        // Fin de campo entrecomillado
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Inicio de campo entrecomillado
        inQuotes = true;
      } else if (char === ',') {
        // Fin de campo
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  // Último campo
  values.push(current);
  
  return values;
}

/**
 * Cargar CSV existente
 */
export function loadFromCSV(filename: string): Record<string, any>[] {
  const filepath = path.join(__dirname, 'reports', filename);
  
  if (!fs.existsSync(filepath)) {
    return [];
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Formatear duración para logging
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Progress bar simple para consola
 */
export function progressBar(current: number, total: number, width: number = 40): string {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}% (${current}/${total})`;
}

/**
 * Logger con timestamp
 */
export function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  const icons = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  };
  console.log(`[${timestamp}] ${icons[level]} ${message}`);
}

export default {
  getPool,
  closePool,
  normalizeText,
  stringSimilarity,
  parseTMDBDate,
  compareDates,
  isArgentineLocation,
  saveToCSV,
  loadFromCSV,
  formatDuration,
  progressBar,
  log,
};