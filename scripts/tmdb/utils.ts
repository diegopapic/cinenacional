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
      // Keepalive TCP para que el OS mantenga la conexión viva a través del túnel SSH
      keepAlive: true,
      keepAliveInitialDelayMillis: 30_000, // primer probe a los 30s de idle
    });
    // Capturar errores de conexiones idle del pool para que no crasheen el proceso.
    // Cuando PostgreSQL mata una conexión (57P01, restart, túnel caído, etc.),
    // pg emite 'error' en el pool. Sin handler → unhandled error → process crash.
    // El pool descarta la conexión rota automáticamente y crea una nueva en el próximo query.
    pool.on('error', (err: Error) => {
      console.error(`[pg pool] Conexión idle perdida: ${err.message}`);
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
 * Verifica si un string es subsecuencia de otro (letras en orden, no necesariamente consecutivas)
 * Ejemplo: "polo" es subsecuencia de "leopoldo" (l-e-o-P-O-L-d-O)
 * Ejemplo: "ekian" es subsecuencia de "ekmekdjian" (E-K-m-e-k-d-j-I-A-N)
 */
function isSubsequenceOf(needle: string, haystack: string): boolean {
  if (needle.length === 0) return true;
  if (needle.length > haystack.length) return false;
  
  let needleIndex = 0;
  
  for (let i = 0; i < haystack.length && needleIndex < needle.length; i++) {
    if (haystack[i] === needle[needleIndex]) {
      needleIndex++;
    }
  }
  
  return needleIndex === needle.length;
}

/**
 * Verifica si dos strings comparten un prefijo significativo (mínimo 3 caracteres o 50% del más corto)
 */
function shareSignificantPrefix(s1: string, s2: string): boolean {
  const minLength = Math.min(s1.length, s2.length);
  const requiredLength = Math.max(3, Math.floor(minLength * 0.5));
  
  let commonPrefix = 0;
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }
  
  return commonPrefix >= requiredLength;
}

/**
 * Compara dos títulos de películas de forma inteligente.
 * Maneja casos donde uno es el otro con un subtítulo agregado:
 * - "Mankewenüy" vs "Mankewenüy, amiga del cóndor" → match
 * - "El nombrador" vs "El nombrador, una película sobre Daniel Toro" → match
 * 
 * @returns Un número de 0-100 representando la similitud, 
 *          con 100 = título exacto (incluyendo casos de subtítulo)
 */
export function compareTitles(title1: string, title2: string): number {
  const t1 = normalizeText(title1);
  const t2 = normalizeText(title2);
  
  // Caso 1: Exactamente iguales después de normalizar
  if (t1 === t2) return 100;
  
  // Caso 2: Uno es prefijo del otro (antes de separadores como , : - .)
  // IMPORTANTE: Hacer el split ANTES de normalizar para no perder los separadores
  const separators = /[,:\-–—]/;

  // Extraer la parte base de un título (antes del primer separador)
  // Incluye ". " (punto+espacio) como separador de subtítulo,
  // pero no "." solo para no romper abreviaciones como "Dr." o "Sr."
  const getBaseParts = (title: string): string[] => {
    // Primero intentar con separadores estándar (, : - –)
    const parts = title.split(separators);
    if (parts.length > 1) return parts;
    // Luego intentar con ". " (punto seguido de espacio = subtítulo)
    const dotParts = title.split(/\.\s+/);
    if (dotParts.length > 1) return dotParts;
    return [title];
  };

  // Verificar si title1 es el título base de title2 (title2 tiene subtítulo)
  if (title2.length > title1.length) {
    const t2Parts = getBaseParts(title2);
    if (t2Parts.length > 1) {
      const t2Base = normalizeText(t2Parts[0].trim());
      if (stringSimilarity(t1, t2Base) >= 95) {
        return 100; // Considerar como título exacto
      }
    }
  }

  // Verificar si title2 es el título base de title1 (title1 tiene subtítulo)
  if (title1.length > title2.length) {
    const t1Parts = getBaseParts(title1);
    if (t1Parts.length > 1) {
      const t1Base = normalizeText(t1Parts[0].trim());
      if (stringSimilarity(t2, t1Base) >= 95) {
        return 100; // Considerar como título exacto
      }
    }
  }
  
  // Caso 3: Similitud normal
  return stringSimilarity(title1, title2);
}

/**
 * Compara dos nombres de personas de forma inteligente.
 * Maneja casos como:
 * - "Gustavo Giannini" vs "Gustavo Alex Giannini" → match
 * - "Luis Galmes" vs "Luis Omar Galmes Klein" → match
 * - "Javier Diment" vs "Valentin Javier Diment" → match
 * - "Polo Obligado" vs "Leopoldo Obligado" → match (nombre contenido + apellido igual)
 * - "Elizabeth Ekian" vs "Elizabeth Ekmekdjian" → match (nombre igual + apellido prefijo)
 * 
 * @returns Un objeto con:
 *   - isMatch: true si se consideran la misma persona
 *   - confidence: 'high' | 'medium' | 'low'
 *   - reason: explicación del resultado
 */
export function comparePersonNames(
  name1: string,
  name2: string
): { isMatch: boolean; confidence: 'high' | 'medium' | 'low'; reason: string } {
  
  const normalize = (s: string) => normalizeText(s).toLowerCase();
  
  // Tokenizar ambos nombres (filtrar tokens muy cortos como iniciales sueltas)
  const tokens1 = normalize(name1).split(/\s+/).filter(t => t.length > 1);
  const tokens2 = normalize(name2).split(/\s+/).filter(t => t.length > 1);
  
  if (tokens1.length === 0 || tokens2.length === 0) {
    return { isMatch: false, confidence: 'low', reason: 'Nombre vacío o muy corto' };
  }
  
  // Caso 1: Similitud alta de string completo (>= 90%)
  const fullSimilarity = stringSimilarity(name1, name2);
  if (fullSimilarity >= 90) {
    return { isMatch: true, confidence: 'high', reason: `Similitud ${fullSimilarity}%` };
  }
  
  // Obtener primer nombre y apellido (última palabra) de cada uno
  const nombre1 = tokens1[0];
  const nombre2 = tokens2[0];
  const apellido1 = tokens1[tokens1.length - 1];
  const apellido2 = tokens2[tokens2.length - 1];
  
  const apellidoExacto = stringSimilarity(apellido1, apellido2) >= 85;
  const nombreExacto = stringSimilarity(nombre1, nombre2) >= 85;
  
  // Caso 2: Apellido igual + nombre de uno contenido en el otro
  // Maneja: "Polo Obligado" vs "Leopoldo Obligado" (polo está en leopoldo)
  if (apellidoExacto && tokens1.length >= 2 && tokens2.length >= 2) {
    const nombre1EnNombre2 = isSubsequenceOf(nombre1, nombre2);
    const nombre2EnNombre1 = isSubsequenceOf(nombre2, nombre1);
    
    if (nombre1EnNombre2 || nombre2EnNombre1) {
      return { 
        isMatch: true, 
        confidence: 'high',
        reason: `Apellido igual + nombre contenido (${nombre1EnNombre2 ? nombre1 + '⊂' + nombre2 : nombre2 + '⊂' + nombre1})` 
      };
    }
    
    // También: apellido igual + nombres comparten prefijo significativo
    if (shareSignificantPrefix(nombre1, nombre2)) {
      return { 
        isMatch: true, 
        confidence: 'medium',
        reason: `Apellido igual + nombres comparten prefijo` 
      };
    }
  }
  
  // Caso 3: Nombre igual + apellido de uno es prefijo/contenido del otro
  // Maneja: "Elizabeth Ekian" vs "Elizabeth Ekmekdjian"
  if (nombreExacto && tokens1.length >= 2 && tokens2.length >= 2) {
    const apellido1EnApellido2 = isSubsequenceOf(apellido1, apellido2);
    const apellido2EnApellido1 = isSubsequenceOf(apellido2, apellido1);
    
    if (apellido1EnApellido2 || apellido2EnApellido1) {
      return { 
        isMatch: true, 
        confidence: 'high',
        reason: `Nombre igual + apellido contenido` 
      };
    }
    
    // También: nombre igual + apellidos comparten prefijo significativo
    if (shareSignificantPrefix(apellido1, apellido2)) {
      return { 
        isMatch: true, 
        confidence: 'medium',
        reason: `Nombre igual + apellidos comparten prefijo` 
      };
    }
  }
  
  // Caso 4: Todos los tokens del nombre más corto están en el más largo
  // Esto maneja: "Gustavo Giannini" vs "Gustavo Alex Giannini"
  const [shorter, longer] = tokens1.length <= tokens2.length 
    ? [tokens1, tokens2] 
    : [tokens2, tokens1];
  
  const allShorterInLonger = shorter.every(shortToken =>
    longer.some(longToken => 
      longToken === shortToken || 
      stringSimilarity(shortToken, longToken) >= 85  // Permitir pequeñas variaciones (tildes, etc.)
    )
  );
  
  if (allShorterInLonger) {
    // Verificar que al menos coincida un "apellido" (última palabra de cada nombre original)
    const apellidoMatch = stringSimilarity(apellido1, apellido2) >= 85;
    
    if (apellidoMatch) {
      return { 
        isMatch: true, 
        confidence: shorter.length >= 2 ? 'high' : 'medium',
        reason: `Nombre contenido (${shorter.join(' ')} ⊆ ${longer.join(' ')})` 
      };
    }
    
    // También verificar si el apellido del corto está en algún lugar del largo
    // Esto maneja: "Luis Galmes" vs "Luis Omar Galmes Klein"
    const apellidoCorto = shorter[shorter.length - 1];
    const apellidoEnLargo = longer.some(t => stringSimilarity(t, apellidoCorto) >= 85);
    
    if (apellidoEnLargo) {
      return { 
        isMatch: true, 
        confidence: 'high',
        reason: `Nombre contenido con apellido (${shorter.join(' ')} ⊆ ${longer.join(' ')})` 
      };
    }
  }
  
  // Caso 5: Coincide primer nombre + algún apellido en común
  // Esto maneja variaciones de orden o apellidos compuestos
  const primerNombreMatch = stringSimilarity(nombre1, nombre2) >= 85;
  
  if (primerNombreMatch && tokens1.length >= 2 && tokens2.length >= 2) {
    // Buscar si hay algún apellido en común
    const apellidos1 = tokens1.slice(1);
    const apellidos2 = tokens2.slice(1);
    
    const hayApellidoComun = apellidos1.some(ap1 =>
      apellidos2.some(ap2 => stringSimilarity(ap1, ap2) >= 85)
    );
    
    if (hayApellidoComun) {
      return { 
        isMatch: true, 
        confidence: 'medium',
        reason: `Primer nombre + apellido común` 
      };
    }
  }
  
  // Caso 6: El primer nombre de uno es el segundo del otro y comparten apellido
  // Esto maneja: "Javier Diment" vs "Valentin Javier Diment"
  if (tokens1.length >= 2 && tokens2.length >= 2) {
    const nombre1EnTokens2 = tokens2.slice(0, -1).some(t => stringSimilarity(t, nombre1) >= 85);
    const nombre2EnTokens1 = tokens1.slice(0, -1).some(t => stringSimilarity(t, nombre2) >= 85);
    
    if (nombre1EnTokens2 || nombre2EnTokens1) {
      // Verificar apellido en común (puede estar en cualquier posición)
      const apellido1EnTokens2 = tokens2.some(t => stringSimilarity(t, apellido1) >= 85);
      const apellido2EnTokens1 = tokens1.some(t => stringSimilarity(t, apellido2) >= 85);
      
      if (apellido1EnTokens2 || apellido2EnTokens1) {
        return { 
          isMatch: true, 
          confidence: 'medium',
          reason: `Nombre cruzado + apellido común` 
        };
      }
    }
  }
  
  // Caso 7: Similitud media pero no suficiente
  if (fullSimilarity >= 70) {
    return { 
      isMatch: false, 
      confidence: 'low',
      reason: `Similitud parcial ${fullSimilarity}% - requiere revisión` 
    };
  }
  
  return { isMatch: false, confidence: 'low', reason: `Sin coincidencia suficiente (${fullSimilarity}%)` };
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
 * @param line La línea a parsear
 * @param separator El separador de campos (',' o ';')
 */
function parseCSVLine(line: string, separator: string = ','): string[] {
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
      } else if (char === separator) {
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
 * Detectar el separador usado en un CSV (coma o punto y coma)
 */
function detectCSVSeparator(headerLine: string): string {
  // Contar ocurrencias de cada separador en la primera línea
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;

  // El que tenga más ocurrencias es probablemente el separador
  return semicolons > commas ? ';' : ',';
}

/**
 * Cargar CSV existente
 * Detecta automáticamente si usa coma o punto y coma como separador
 * y elimina BOM si existe
 */
export function loadFromCSV(filename: string): Record<string, any>[] {
  const filepath = path.join(__dirname, 'reports', filename);

  if (!fs.existsSync(filepath)) {
    return [];
  }

  let content = fs.readFileSync(filepath, 'utf-8');

  // Eliminar BOM (Byte Order Mark) si existe
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) return [];

  // Detectar separador automáticamente
  const separator = detectCSVSeparator(lines[0]);

  const headers = parseCSVLine(lines[0], separator);
  const data: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
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
  compareTitles,
  comparePersonNames,
  parseTMDBDate,
  compareDates,
  isArgentineLocation,
  saveToCSV,
  loadFromCSV,
  formatDuration,
  progressBar,
  log,
};