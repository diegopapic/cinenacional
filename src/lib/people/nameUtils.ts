/**
 * Utilidades para separación inteligente de nombres
 * 
 * Usa la tabla FirstNameGender para identificar qué palabras son nombres de pila.
 * 
 * Reglas (en orden de prioridad):
 * 1. Una sola palabra va a apellido (para ordenamiento alfabético)
 * 2. Si hay apodos entre comillas → van con el nombre, resto es apellido
 * 3. Si hay iniciales (A., J., O.) → van con el nombre, resto es apellido
 * 4. Sin nombres conocidos, apodos ni iniciales → todo va a apellido
 * 5. Preposiciones (de, del, la, los, las, el) van con la palabra siguiente
 * 6. La primera palabra desconocida (no en FirstNameGender) inicia el apellido
 * 7. Si todas las palabras son nombres conocidos, la última es el apellido
 */

import { PrismaClient } from '@prisma/client';

// Preposiciones comunes en nombres hispanos
const PREPOSITIONS = new Set(['de', 'del', 'la', 'las', 'los', 'el']);

// Cache de nombres conocidos (se carga una vez por instancia)
let knownNamesCache: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica si una palabra es una preposición
 */
function isPreposition(word: string): boolean {
  return PREPOSITIONS.has(word.toLowerCase());
}

/**
 * Verifica si una palabra está en la tabla de nombres conocidos
 */
function isKnownName(word: string, knownNames: Set<string>): boolean {
  return knownNames.has(word.toLowerCase());
}

/**
 * Detecta si una palabra es un apodo (está entre comillas)
 * Soporta: "Apodo", 'Apodo', «Apodo», "Apodo"
 */
function isNickname(word: string): boolean {
  if (!word || word.length < 3) return false;
  
  const first = word[0];
  const last = word[word.length - 1];
  
  // Comillas dobles ASCII
  if (first === '"' && last === '"') return true;
  // Comillas simples
  if (first === "'" && last === "'") return true;
  // Comillas latinas
  if (first === '«' && last === '»') return true;
  // Comillas tipográficas
  if ((first === '"' || first === '"') && (last === '"' || last === '"')) return true;
  
  return false;
}

/**
 * Detecta si una palabra es una inicial (letra mayúscula + punto)
 * Ejemplos: "A.", "J.", "O.", "M."
 */
function isInitial(word: string): boolean {
  if (!word || word.length < 2 || word.length > 3) return false;
  
  // Patrón: una o dos letras mayúsculas seguidas de punto
  // Ejemplos válidos: "A.", "J.", "O.", "JR." (aunque este último es raro)
  const pattern = /^[A-ZÁÉÍÓÚÑÜ]{1,2}\.$/;
  return pattern.test(word);
}

/**
 * Tokeniza el nombre manejando apodos entre comillas como unidades
 * IMPORTANTE: Solo trata como apodo si hay espacio antes de la comilla
 * Esto evita romper apellidos como D'Angelo, O'Brien, etc.
 * 
 * Ejemplo: 'Ricardo "Bocha" Bochini' → ['Ricardo', '"Bocha"', 'Bochini']
 * Ejemplo: 'Juan "El Loco" Pérez' → ['Juan', '"El Loco"', 'Pérez']
 * Ejemplo: "Diego D'Angelo" → ['Diego', "D'Angelo"] (NO rompe el apellido)
 */
function tokenizeName(fullName: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < fullName.length; i++) {
    const char = fullName[i];
    const prevChar = i > 0 ? fullName[i - 1] : ' ';
    
    // Solo iniciar apodo si hay espacio antes (o es el inicio) Y es una comilla
    // Esto evita romper D'Angelo, O'Brien, etc.
    const isQuoteStart = !inQuotes && 
      (char === '"' || char === "'" || char === '«' || char === '"') &&
      (prevChar === ' ' || i === 0);
    
    if (isQuoteStart) {
      if (current.trim()) {
        // Agregar palabras anteriores
        current.trim().split(/\s+/).forEach(w => {
          if (w) tokens.push(w);
        });
        current = '';
      }
      inQuotes = true;
      quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char);
      current = char;
    }
    // Detectar fin de comillas
    else if (inQuotes && (char === quoteChar || char === '"' || char === '"' || char === '»')) {
      current += char;
      tokens.push(current.trim());
      current = '';
      inQuotes = false;
      quoteChar = '';
    }
    // Dentro de comillas, agregar todo
    else if (inQuotes) {
      current += char;
    }
    // Espacio fuera de comillas
    else if (char === ' ') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    }
    // Carácter normal
    else {
      current += char;
    }
  }
  
  // Agregar lo que quede
  if (current.trim()) {
    if (inQuotes) {
      // Comilla sin cerrar, tratar como texto normal
      current.trim().split(/\s+/).forEach(w => {
        if (w) tokens.push(w);
      });
    } else {
      tokens.push(current.trim());
    }
  }
  
  return tokens;
}

/**
 * Carga los nombres conocidos desde la base de datos (con cache)
 */
async function loadKnownNames(prisma: PrismaClient): Promise<Set<string>> {
  const now = Date.now();
  
  // Usar cache si es válido
  if (knownNamesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return knownNamesCache;
  }
  
  // Cargar desde BD
  const names = await prisma.firstNameGender.findMany({
    select: { name: true },
  });
  
  knownNamesCache = new Set(names.map(n => n.name.toLowerCase()));
  cacheTimestamp = now;
  
  return knownNamesCache;
}

/**
 * Verifica si una palabra debe tratarse como parte del nombre
 * (es nombre conocido, apodo, inicial, o preposición seguida de nombre)
 */
function isFirstNamePart(word: string, knownNames: Set<string>): boolean {
  return isKnownName(word, knownNames) || isNickname(word) || isInitial(word);
}

/**
 * Encuentra el índice donde empieza el apellido
 * Apodos e iniciales se tratan como parte del nombre
 */
function findLastNameStartIndex(words: string[], knownNames: Set<string>): number {
  if (words.length === 0) return 0;
  if (words.length === 1) return 0; // Una sola palabra → va a apellido
  
  // Filtrar preposiciones, apodos e iniciales para el análisis
  const significantWords = words.filter(w => !isPreposition(w) && !isNickname(w) && !isInitial(w));
  
  // Verificar si todas las palabras significativas son nombres conocidos
  const allAreKnownNames = significantWords.every(w => isKnownName(w, knownNames));
  
  if (allAreKnownNames) {
    // Todas son nombres conocidos: la última palabra significativa es apellido
    let lastNameStart = words.length - 1;
    
    // Solo retroceder si hay preposiciones antes del apellido
    // Las iniciales ANTES del apellido van con el nombre, NO con el apellido
    while (lastNameStart > 0 && isPreposition(words[lastNameStart - 1])) {
      lastNameStart--;
    }
    
    // No dejar firstName vacío
    if (lastNameStart === 0) {
      lastNameStart = words.length - 1;
    }
    
    return lastNameStart;
  }
  
  // Buscar la primera palabra desconocida (que no sea apodo, inicial ni preposición)
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    
    // Apodos e iniciales siempre van con el nombre
    if (isNickname(word) || isInitial(word)) {
      i++;
      continue;
    }
    
    if (isPreposition(word)) {
      // Buscar siguiente palabra no-preposición
      let nextNonPrepIndex = i + 1;
      while (nextNonPrepIndex < words.length && isPreposition(words[nextNonPrepIndex])) {
        nextNonPrepIndex++;
      }
      
      if (nextNonPrepIndex >= words.length) {
        return i;
      }
      
      const nextWord = words[nextNonPrepIndex];
      
      // Si lo siguiente es apodo o inicial, continuar
      if (isNickname(nextWord) || isInitial(nextWord)) {
        i = nextNonPrepIndex + 1;
      }
      // Si es nombre conocido, la preposición va con el nombre
      else if (isKnownName(nextWord, knownNames)) {
        i = nextNonPrepIndex + 1;
      }
      // Si no es conocido, la preposición inicia el apellido
      else {
        return i;
      }
    } else if (isKnownName(word, knownNames)) {
      i++;
    } else {
      // Palabra desconocida: aquí empieza el apellido
      return i;
    }
  }
  
  return words.length;
}

/**
 * Separa un nombre completo en firstName y lastName usando FirstNameGender
 * 
 * @param fullName - Nombre completo a separar
 * @param prisma - Cliente Prisma para acceder a la BD
 * @returns Objeto con firstName y lastName
 * 
 * @example
 * // Sin nombres conocidos (banda, institución) → todo a apellido
 * splitFullName("El Mató a un Policía Motorizado", prisma) 
 * // { firstName: null, lastName: "El Mató a un Policía Motorizado" }
 * 
 * // Una sola palabra (va a apellido)
 * splitFullName("Shakira", prisma) // { firstName: null, lastName: "Shakira" }
 * 
 * // Caso normal
 * splitFullName("Pedro García", prisma) // { firstName: "Pedro", lastName: "García" }
 * 
 * // Nombres compuestos
 * splitFullName("María Luisa González", prisma) // { firstName: "María Luisa", lastName: "González" }
 * 
 * // Con apodo
 * splitFullName('Ricardo "Bocha" Bochini', prisma) // { firstName: 'Ricardo "Bocha"', lastName: "Bochini" }
 * 
 * // Con iniciales al inicio
 * splitFullName("A. J. Bogani", prisma) // { firstName: "A. J.", lastName: "Bogani" }
 * 
 * // Con inicial en el medio
 * splitFullName("Abelardo O. Martínez", prisma) // { firstName: "Abelardo O.", lastName: "Martínez" }
 * 
 * // Con inicial al final (va con apellido)
 * splitFullName("Ricardo Martínez C.", prisma) // { firstName: "Ricardo", lastName: "Martínez C." }
 * 
 * // Con preposiciones
 * splitFullName("María del Carmen Rodríguez", prisma) // { firstName: "María del Carmen", lastName: "Rodríguez" }
 */
export async function splitFullName(
  fullName: string,
  prisma: PrismaClient
): Promise<{ firstName: string | null; lastName: string | null }> {
  const trimmed = fullName.trim();
  
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  
  // Cargar nombres conocidos
  const knownNames = await loadKnownNames(prisma);
  
  // Tokenizar respetando apodos entre comillas
  const words = tokenizeName(trimmed);
  
  // REGLA: Una sola palabra va a apellido (para ordenamiento)
  if (words.length === 1) {
    return { firstName: null, lastName: words[0] };
  }
  
  // Verificar si hay apodos o iniciales
  const hasNicknameOrInitial = words.some(w => isNickname(w) || isInitial(w));
  
  // Si hay apodos o iniciales, darles prioridad
  if (hasNicknameOrInitial) {
    // Encontrar dónde terminan los apodos/iniciales/nombres conocidos
    let firstNameEnd = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (isNickname(word) || isInitial(word) || isKnownName(word, knownNames)) {
        firstNameEnd = i + 1;
      } 
      else if (isPreposition(word)) {
        // Preposición: ver qué sigue
        let nextNonPrep = i + 1;
        while (nextNonPrep < words.length && isPreposition(words[nextNonPrep])) {
          nextNonPrep++;
        }
        
        if (nextNonPrep >= words.length) {
          break;
        }
        
        const nextWord = words[nextNonPrep];
        if (isNickname(nextWord) || isInitial(nextWord) || isKnownName(nextWord, knownNames)) {
          firstNameEnd = nextNonPrep + 1;
          i = nextNonPrep;
        } else {
          break;
        }
      }
      else {
        break;
      }
    }
    
    if (firstNameEnd >= words.length) {
      return {
        firstName: words.slice(0, -1).join(' ') || null,
        lastName: words[words.length - 1]
      };
    }
    
    return {
      firstName: words.slice(0, firstNameEnd).join(' ') || null,
      lastName: words.slice(firstNameEnd).join(' ') || null
    };
  }
  
  // Verificar si hay AL MENOS UN nombre conocido (ignorando preposiciones)
  const hasAnyKnownName = words.some(w => 
    !isPreposition(w) && isKnownName(w, knownNames)
  );
  
  // Si NO hay ningún nombre conocido, apodo ni inicial → todo va a apellido
  // Esto maneja casos como "El Mató a un Policía Motorizado" o "Escuela de Educación..."
  if (!hasAnyKnownName) {
    return { firstName: null, lastName: trimmed };
  }
  
  const lastNameStartIndex = findLastNameStartIndex(words, knownNames);
  
  // Si el índice es 0, la primera palabra es desconocida
  if (lastNameStartIndex === 0) {
    // Sin apodos ni iniciales: primera palabra a nombre, resto a apellido
    return {
      firstName: words[0],
      lastName: words.slice(1).join(' ') || null,
    };
  }
  
  // Si todo es nombre (índice >= longitud)
  if (lastNameStartIndex >= words.length) {
    // Poner la última palabra como apellido
    return {
      firstName: words.slice(0, -1).join(' ') || null,
      lastName: words[words.length - 1],
    };
  }
  
  const firstName = words.slice(0, lastNameStartIndex).join(' ');
  const lastName = words.slice(lastNameStartIndex).join(' ');
  
  return {
    firstName: firstName || null,
    lastName: lastName || null,
  };
}

/**
 * Versión sincrónica para uso en batch (cuando ya tenés los nombres cargados)
 */
export function splitFullNameSync(
  fullName: string,
  knownNames: Set<string>
): { firstName: string | null; lastName: string | null } {
  const trimmed = fullName.trim();
  
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  
  // Tokenizar respetando apodos entre comillas
  const words = tokenizeName(trimmed);
  
  // REGLA: Una sola palabra va a apellido
  if (words.length === 1) {
    return { firstName: null, lastName: words[0] };
  }
  
  // Verificar si hay apodos o iniciales
  const hasNicknameOrInitial = words.some(w => isNickname(w) || isInitial(w));
  
  // Si hay apodos o iniciales, darles prioridad
  if (hasNicknameOrInitial) {
    let firstNameEnd = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (isNickname(word) || isInitial(word) || isKnownName(word, knownNames)) {
        firstNameEnd = i + 1;
      } 
      else if (isPreposition(word)) {
        let nextNonPrep = i + 1;
        while (nextNonPrep < words.length && isPreposition(words[nextNonPrep])) {
          nextNonPrep++;
        }
        
        if (nextNonPrep >= words.length) {
          break;
        }
        
        const nextWord = words[nextNonPrep];
        if (isNickname(nextWord) || isInitial(nextWord) || isKnownName(nextWord, knownNames)) {
          firstNameEnd = nextNonPrep + 1;
          i = nextNonPrep;
        } else {
          break;
        }
      }
      else {
        break;
      }
    }
    
    if (firstNameEnd >= words.length) {
      return {
        firstName: words.slice(0, -1).join(' ') || null,
        lastName: words[words.length - 1]
      };
    }
    
    return {
      firstName: words.slice(0, firstNameEnd).join(' ') || null,
      lastName: words.slice(firstNameEnd).join(' ') || null
    };
  }
  
  // Verificar si hay AL MENOS UN nombre conocido
  const hasAnyKnownName = words.some(w => 
    !isPreposition(w) && isKnownName(w, knownNames)
  );
  
  // Si NO hay ningún nombre conocido → todo va a apellido
  if (!hasAnyKnownName) {
    return { firstName: null, lastName: trimmed };
  }
  
  const lastNameStartIndex = findLastNameStartIndex(words, knownNames);
  
  if (lastNameStartIndex === 0) {
    return {
      firstName: words[0],
      lastName: words.slice(1).join(' ') || null,
    };
  }
  
  if (lastNameStartIndex >= words.length) {
    return {
      firstName: words.slice(0, -1).join(' ') || null,
      lastName: words[words.length - 1],
    };
  }
  
  const firstName = words.slice(0, lastNameStartIndex).join(' ');
  const lastName = words.slice(lastNameStartIndex).join(' ');
  
  return {
    firstName: firstName || null,
    lastName: lastName || null,
  };
}

/**
 * Normaliza un nombre (capitaliza palabras, mantiene preposiciones en minúscula)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      // Mantener apodos como están
      if (isNickname(word)) return word;
      
      // Mantener iniciales como están
      if (isInitial(word)) return word.toUpperCase();
      
      // Preposiciones en minúscula
      if (isPreposition(word)) return word.toLowerCase();
      
      // Capitalizar primera letra
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Invalida el cache de nombres (útil después de agregar nuevos nombres)
 */
export function invalidateNameCache(): void {
  knownNamesCache = null;
  cacheTimestamp = 0;
}