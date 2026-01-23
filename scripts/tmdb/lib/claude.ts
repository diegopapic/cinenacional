/**
 * Integración con Claude API
 */

import config from '../config';
import { getPool } from './database';
import { tokenizeName, lookupGender, splitNameAndGetGenderSync } from './names';
import type { NameSplitResult, PersonForReview } from './config';

// Lista de personas que necesitan revisión (se usa en import-tmdb-movies)
export const peopleForReview: PersonForReview[] = [];

export function clearPeopleForReview(): void {
    peopleForReview.length = 0;
}

export async function askClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropicApiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

export async function rewriteSynopsis(originalSynopsis: string, isDocumental: boolean): Promise<string> {
    if (!originalSynopsis || originalSynopsis.trim().length === 0) {
        return '';
    }

    const prompt = `Convertí el siguiente texto en una sinopsis cinematográfica que cumpla con estos criterios:

Extensión: entre 400 y 500 caracteres (incluyendo espacios)

Contenido:
- Describí únicamente la premisa y situación inicial
- Presentá los personajes principales y el conflicto central
- Sin spoilers: no reveles giros argumentales, desenlaces ni información del último tercio de la película
${isDocumental ? '- Es un documental: comenzá con la estructura "Documental que..." e integrá esa palabra al texto' : ''}
- Si el texto fuente no ofrece suficiente información narrativa para desarrollar una sinopsis cinematográfica (por ejemplo, si son solo frases sueltas, aforismos o reflexiones sin contexto narrativo), respondé ÚNICAMENTE con la palabra: SINOPSIS_VACIA

Estilo:
- Tono neutral y objetivo, sin juicios de valor
- Sin lenguaje promocional ni adjetivos laudatorios
- Redacción clara y directa
- Tercera persona, tiempo presente
- Español rioplatense (con voseo) pero sin lunfardo ni jerga

Restricciones:
- NO incluyas título, director, actores, países ni datos técnicos
- NO uses metadiscurso como "La película narra...", "El film cuenta...", "Esta historia trata de..."
- Comenzá directamente con la acción o situación ${isDocumental ? '(usando "Documental que...")' : ''}
- NUNCA expliques por qué no podés escribir la sinopsis. Si no hay suficiente información, respondé solo con: SINOPSIS_VACIA

Texto original:
${originalSynopsis}

Responde SOLO con la sinopsis reescrita o con SINOPSIS_VACIA si no hay suficiente información narrativa.`;

    try {
        const rewritten = await askClaude(prompt);
        const trimmed = rewritten.trim();

        // Si Claude indica que no hay suficiente información, devolver vacío
        if (trimmed === 'SINOPSIS_VACIA' || trimmed.includes('SINOPSIS_VACIA')) {
            console.log(`     ℹ️  Sinopsis vacía: no hay suficiente información narrativa en el texto original`);
            return '';
        }

        return trimmed;
    } catch (error) {
        console.log(`     ⚠ Error al reescribir sinopsis con Claude: ${error}`);
        return originalSynopsis; // Fallback al original
    }
}

/**
 * Consulta a Claude para determinar el género de un nombre de pila
 */
export async function askClaudeForGender(firstName: string): Promise<'MALE' | 'FEMALE' | null> {
    const prompt = `¿El nombre de pila "${firstName}" es típicamente masculino o femenino?

Responde ÚNICAMENTE con una de estas tres opciones:
- MALE (si es claramente un nombre masculino)
- FEMALE (si es claramente un nombre femenino)
- UNISEX (si es un nombre usado tanto por hombres como mujeres, o si es ambiguo)

Considerá el uso global del nombre, no solo en un país específico.
Responde con una sola palabra: MALE, FEMALE o UNISEX`;

    try {
        const response = await askClaude(prompt);
        const trimmed = response.trim().toUpperCase();

        if (trimmed === 'MALE' || trimmed.startsWith('MALE')) {
            return 'MALE';
        } else if (trimmed === 'FEMALE' || trimmed.startsWith('FEMALE')) {
            return 'FEMALE';
        } else {
            return null;
        }
    } catch (error) {
        console.log(`     ⚠ Error al consultar género a Claude para "${firstName}": ${error}`);
        return null;
    }
}

/**
 * Consulta a Claude si una palabra es un nombre de pila
 */
export async function askClaudeIfFirstName(word: string): Promise<boolean> {
    const prompt = `¿"${word}" es un nombre de pila (nombre propio de persona)?

Responde ÚNICAMENTE con:
- SI (si es un nombre de pila, ya sea masculino, femenino o unisex)
- NO (si es un apellido, una palabra común, o no es un nombre de persona)

Responde con una sola palabra: SI o NO`;

    try {
        const response = await askClaude(prompt);
        const trimmed = response.trim().toUpperCase();
        return trimmed === 'SI' || trimmed.startsWith('SI');
    } catch (error) {
        console.log(`     ⚠ Error al consultar a Claude si "${word}" es nombre de pila: ${error}`);
        return false;
    }
}

/**
 * Inserta un nombre en la tabla first_name_genders
 */
export async function insertFirstNameGender(name: string, gender: 'MALE' | 'FEMALE' | null): Promise<void> {
    const pool = getPool();
    const cleanName = name
        .replace(/["'"«»""]/g, '')
        .trim();

    // Solo insertar si el nombre no existe ya
    const existing = await pool.query(
        'SELECT name FROM first_name_genders WHERE LOWER(name) = LOWER($1)',
        [cleanName]
    );

    if (existing.rows.length > 0) {
        return;
    }

    await pool.query(
        'INSERT INTO first_name_genders (name, gender) VALUES ($1, $2)',
        [cleanName, gender]
    );

    console.log(`     📝 Nombre "${cleanName}" agregado a first_name_genders con género: ${gender || 'NULL'}`);
}

/**
 * Separa un nombre completo en nombre y apellido, y determina el género
 * Consulta a Claude si un nombre no está en la base de datos
 */
export async function splitNameAndGetGender(fullName: string): Promise<NameSplitResult> {
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
            needsReview: false
        };
    }

    // Buscar progresivamente cuántos tokens son nombres de pila conocidos
    let firstNameWordCount = 0;
    let detectedGender: 'MALE' | 'FEMALE' | null = null;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let gender = lookupGender(token);

        // Si no está en la base de datos, consultar a Claude
        if (gender === null) {
            console.log(`     🤖 Consultando a Claude por el género de "${token}"...`);
            const claudeGender = await askClaudeForGender(token);

            if (claudeGender !== null) {
                gender = claudeGender;
                await insertFirstNameGender(token, claudeGender);
            } else {
                const isFirstName = await askClaudeIfFirstName(token);
                if (isFirstName) {
                    await insertFirstNameGender(token, null);
                    firstNameWordCount = i + 1;
                    continue;
                } else {
                    break;
                }
            }
        }

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
