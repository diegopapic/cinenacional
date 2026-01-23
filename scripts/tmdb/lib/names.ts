/**
 * Procesamiento de nombres y detección de género
 */

import { getPool } from './database';
import type { NameSplitResult } from './config';

// Cache global para first_name_gender
let firstNameGenderCache: Map<string, 'MALE' | 'FEMALE'> | null = null;

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
        firstNameGenderCache.set(row.name.toLowerCase(), row.gender);
    }

    console.log(`📚 Cache de nombres cargado: ${firstNameGenderCache.size} entradas`);
}

export function lookupGender(name: string): 'MALE' | 'FEMALE' | null {
    if (!firstNameGenderCache) {
        return null;
    }

    const cleanName = name
        .replace(/["'"«»""]/g, '')
        .trim()
        .toLowerCase();

    return firstNameGenderCache.get(cleanName) || null;
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
        const gender = lookupGender(token);

        if (gender !== null) {
            firstNameWordCount = i + 1;

            if (detectedGender === null) {
                detectedGender = gender;
            }
        } else {
            break;
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
        const gender = lookupGender(tokens[i]);
        if (gender !== null) {
            firstNameWordCount = i + 1;
            if (detectedGender === null) detectedGender = gender;
        } else {
            break;
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
