/**
 * Procesamiento de nombres y detección de género
 */

import { getPool } from './database';
import type { NameSplitResult } from './config';

// Cache global para first_name_gender
// Guarda 'MALE', 'FEMALE', o 'UNISEX' (que se trata como nombre conocido pero sin género)
let firstNameGenderCache: Map<string, 'MALE' | 'FEMALE' | 'UNISEX'> | null = null;

export async function loadFirstNameGenderCache(): Promise<void> {
    if (firstNameGenderCache !== null) {
        return;
    }

    const pool = getPool();
    const result = await pool.query(`
        SELECT name, gender FROM first_name_genders
    `);

    firstNameGenderCache = new Map();
    for (const row of result.rows) {
        // Guardar el género tal cual viene (MALE, FEMALE, UNISEX, o null como UNISEX)
        const gender = row.gender || 'UNISEX';
        firstNameGenderCache.set(row.name.toLowerCase(), gender);
    }

    console.log(`📚 Cache de nombres cargado: ${firstNameGenderCache.size} entradas`);
}

/**
 * Busca un nombre en el cache.
 * Retorna 'MALE' o 'FEMALE' si tiene género definido.
 * Retorna null si no está en el cache.
 * Si está en el cache como UNISEX, retorna null (pero isKnownFirstName retornará true).
 */
export function lookupGender(name: string): 'MALE' | 'FEMALE' | null {
    if (!firstNameGenderCache) {
        return null;
    }

    const cleanName = name
        .replace(/["'"«»""]/g, '')
        .trim()
        .toLowerCase();

    const gender = firstNameGenderCache.get(cleanName);

    // Si es UNISEX, retornar null (sin género definido)
    if (gender === 'UNISEX') {
        return null;
    }

    return gender || null;
}

/**
 * Verifica si un nombre está en el cache (independientemente de su género)
 */
export function isKnownFirstName(name: string): boolean {
    if (!firstNameGenderCache) {
        return false;
    }

    const cleanName = name
        .replace(/["'"«»""]/g, '')
        .trim()
        .toLowerCase();

    return firstNameGenderCache.has(cleanName);
}

/**
 * Tokeniza un nombre respetando apodos entre comillas
 */
export function tokenizeName(fullName: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < fullName.length; i++) {
        const char = fullName[i];
        const prevChar = i > 0 ? fullName[i - 1] : '';

        // Detectar inicio de comillas (solo si hay espacio antes o es el inicio)
        if (!inQuotes && (char === '"' || char === "'" || char === '«' || char === '"')) {
            if (prevChar === ' ' || i === 0) {
                inQuotes = true;
                quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char);
                current += char;
                continue;
            }
        }

        // Detectar fin de comillas
        if (inQuotes && (char === quoteChar || (quoteChar === '"' && char === '"'))) {
            current += char;
            inQuotes = false;
            quoteChar = '';
            continue;
        }

        // Espacios fuera de comillas separan tokens
        if (char === ' ' && !inQuotes) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Agregar última palabra
    if (current.trim()) {
        tokens.push(current.trim());
    }

    return tokens;
}

/**
 * Separa un nombre completo en nombre y apellido, y determina el género (versión síncrona)
 * Esta versión no consulta a Claude - usa solo la base de datos local
 */
export function splitNameAndGetGenderSync(fullName: string): NameSplitResult {
    const tokens = tokenizeName(fullName.trim());

    if (tokens.length === 0) {
        return {
            firstName: '',
            lastName: '',
            gender: null,
            needsReview: true,
            reviewReason: 'Nombre vacío'
        };
    }

    // REGLA: Una sola palabra siempre va en apellido
    if (tokens.length === 1) {
        return {
            firstName: '',
            lastName: tokens[0],
            gender: null,
            needsReview: false // No necesita revisión, es una regla clara
        };
    }

    // Buscar progresivamente cuántos tokens son nombres de pila conocidos
    let firstNameWordCount = 0;
    let detectedGender: 'MALE' | 'FEMALE' | null = null;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Verificar si es un nombre conocido (puede ser MALE, FEMALE o UNISEX)
        if (!isKnownFirstName(token)) {
            break;
        }

        firstNameWordCount = i + 1;

        // Solo actualizar el género si tiene uno definido (no UNISEX)
        const gender = lookupGender(token);
        if (gender !== null && detectedGender === null) {
            detectedGender = gender;
        }
    }

    // REGLA: apellido nunca puede ser NULL
    // Si todos los tokens son nombres de pila, el último va a apellido
    if (firstNameWordCount === tokens.length) {
        const firstName = tokens.slice(0, -1).join(' ');
        const lastName = tokens[tokens.length - 1];
        return {
            firstName,
            lastName,
            gender: detectedGender,
            needsReview: false
        };
    }

    // Si no se encontró ningún nombre conocido, usar la primera palabra como nombre
    if (firstNameWordCount === 0) {
        return {
            firstName: tokens[0],
            lastName: tokens.slice(1).join(' '),
            gender: null,
            needsReview: true,
            reviewReason: `Primer nombre "${tokens[0]}" no encontrado en base de datos`
        };
    }

    const firstName = tokens.slice(0, firstNameWordCount).join(' ');
    const lastName = tokens.slice(firstNameWordCount).join(' ');

    return {
        firstName,
        lastName,
        gender: detectedGender,
        needsReview: false
    };
}

/**
 * Versión simplificada de split (para telegram-bot-handler)
 * No marca needsReview, asume el primer token como nombre
 */
export function splitNameSimple(fullName: string): { firstName: string; lastName: string; gender: 'MALE' | 'FEMALE' | null } {
    const tokens = fullName.trim().split(/\s+/);

    if (tokens.length === 0) {
        return { firstName: '', lastName: '', gender: null };
    }

    if (tokens.length === 1) {
        return { firstName: tokens[0], lastName: '', gender: lookupGender(tokens[0]) };
    }

    // Buscar progresivamente cuántos tokens forman el nombre
    let firstNameWordCount = 0;
    let detectedGender: 'MALE' | 'FEMALE' | null = null;

    for (let i = 0; i < tokens.length; i++) {
        // Verificar si es un nombre conocido
        if (!isKnownFirstName(tokens[i])) {
            break;
        }

        firstNameWordCount = i + 1;

        // Solo actualizar el género si tiene uno definido
        const gender = lookupGender(tokens[i]);
        if (gender !== null && detectedGender === null) {
            detectedGender = gender;
        }
    }

    if (firstNameWordCount === 0) {
        return { firstName: tokens[0], lastName: tokens.slice(1).join(' '), gender: null };
    }

    return {
        firstName: tokens.slice(0, firstNameWordCount).join(' '),
        lastName: tokens.slice(firstNameWordCount).join(' '),
        gender: detectedGender,
    };
}
