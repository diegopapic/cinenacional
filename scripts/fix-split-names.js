/**
 * Script para detectar y corregir personas con nombres mal separados
 * 
 * Usa la tabla FirstNameGender para identificar qué palabras son nombres.
 * 
 * Reglas (en orden de prioridad):
 *   1. Una sola palabra va a apellido (para ordenamiento)
 *   2. Si hay apodos entre comillas → van con el nombre, resto es apellido
 *   3. Si hay iniciales (A., J.) → van con el nombre, resto es apellido
 *   4. Sin nombres conocidos, apodos ni iniciales → todo va a apellido
 *   5. Preposiciones (de, del, la) van con la palabra siguiente
 *   6. Primera palabra desconocida inicia el apellido
 * 
 * Uso:
 *   - Solo detectar: node scripts/fix-split-names.js
 *   - Ver cambios (dry run): node scripts/fix-split-names.js --fix
 *   - Aplicar cambios: node scripts/fix-split-names.js --fix --confirm
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Preposiciones comunes en nombres hispanos
const PREPOSITIONS = new Set(['de', 'del', 'la', 'las', 'los', 'el']);

function isPreposition(word) {
  return PREPOSITIONS.has(word.toLowerCase());
}

function isKnownName(word, knownNames) {
  return knownNames.has(word.toLowerCase());
}

/**
 * Detecta si una palabra es un apodo (está entre comillas)
 */
function isNickname(word) {
  if (!word || word.length < 3) return false;
  
  const first = word[0];
  const last = word[word.length - 1];
  
  if (first === '"' && last === '"') return true;
  if (first === "'" && last === "'") return true;
  if (first === '«' && last === '»') return true;
  if ((first === '"' || first === '"') && (last === '"' || last === '"')) return true;
  
  return false;
}

/**
 * Detecta si una palabra es una inicial (letra mayúscula + punto)
 * Ejemplos: "A.", "J.", "O.", "M."
 */
function isInitial(word) {
  if (!word || word.length < 2 || word.length > 3) return false;
  
  // Patrón: una o dos letras mayúsculas seguidas de punto
  const pattern = /^[A-ZÁÉÍÓÚÑÜ]{1,2}\.$/;
  return pattern.test(word);
}

/**
 * Tokeniza el nombre manejando apodos entre comillas como unidades
 * IMPORTANTE: Solo trata como apodo si hay espacio antes de la comilla
 * Esto evita romper apellidos como D'Angelo, O'Brien, etc.
 */
function tokenizeName(fullName) {
  const tokens = [];
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
        current.trim().split(/\s+/).forEach(w => {
          if (w) tokens.push(w);
        });
        current = '';
      }
      inQuotes = true;
      quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char);
      current = char;
    }
    else if (inQuotes && (char === quoteChar || char === '"' || char === '"' || char === '»')) {
      current += char;
      tokens.push(current.trim());
      current = '';
      inQuotes = false;
      quoteChar = '';
    }
    else if (inQuotes) {
      current += char;
    }
    else if (char === ' ') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    }
    else {
      current += char;
    }
  }
  
  if (current.trim()) {
    if (inQuotes) {
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
 * Encuentra el índice donde empieza el apellido
 */
function findLastNameStartIndex(words, knownNames) {
  if (words.length === 0) return 0;
  if (words.length === 1) return 0;
  
  // Filtrar preposiciones, apodos e iniciales para el análisis
  const significantWords = words.filter(w => !isPreposition(w) && !isNickname(w) && !isInitial(w));
  const allAreKnownNames = significantWords.every(w => isKnownName(w, knownNames));
  
  if (allAreKnownNames) {
    let lastNameStart = words.length - 1;
    
    // Solo retroceder si hay preposiciones antes del apellido
    // Las iniciales ANTES del apellido van con el nombre, NO con el apellido
    while (lastNameStart > 0 && isPreposition(words[lastNameStart - 1])) {
      lastNameStart--;
    }
    
    if (lastNameStart === 0) {
      lastNameStart = words.length - 1;
    }
    
    return lastNameStart;
  }
  
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    
    // Apodos e iniciales siempre van con el nombre
    if (isNickname(word) || isInitial(word)) {
      i++;
      continue;
    }
    
    if (isPreposition(word)) {
      let nextNonPrepIndex = i + 1;
      while (nextNonPrepIndex < words.length && isPreposition(words[nextNonPrepIndex])) {
        nextNonPrepIndex++;
      }
      
      if (nextNonPrepIndex >= words.length) {
        return i;
      }
      
      const nextWord = words[nextNonPrepIndex];
      
      if (isNickname(nextWord) || isInitial(nextWord)) {
        i = nextNonPrepIndex + 1;
      }
      else if (isKnownName(nextWord, knownNames)) {
        i = nextNonPrepIndex + 1;
      }
      else {
        return i;
      }
    } else if (isKnownName(word, knownNames)) {
      i++;
    } else {
      return i;
    }
  }
  
  return words.length;
}

/**
 * Separa un nombre completo
 */
function splitFullName(fullName, knownNames) {
  const trimmed = fullName.trim();
  
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  
  const words = tokenizeName(trimmed);
  
  // Una sola palabra va a apellido
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
        // Buscar la siguiente palabra que no sea preposición
        let nextNonPrep = i + 1;
        while (nextNonPrep < words.length && isPreposition(words[nextNonPrep])) {
          nextNonPrep++;
        }
        
        if (nextNonPrep >= words.length) {
          // No hay más palabras, la preposición inicia el apellido
          break;
        }
        
        const nextWord = words[nextNonPrep];
        if (isNickname(nextWord) || isInitial(nextWord) || isKnownName(nextWord, knownNames)) {
          // Lo que sigue es nombre/apodo/inicial, la preposición va con el nombre
          firstNameEnd = nextNonPrep + 1;
          i = nextNonPrep; // Saltar al siguiente
        } else {
          // Lo que sigue es desconocido, la preposición inicia el apellido
          break;
        }
      }
      else {
        // Palabra desconocida: empieza el apellido
        break;
      }
    }
    
    // Si todo son apodos/iniciales/nombres, el último va a apellido
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
  if (!hasAnyKnownName) {
    return { firstName: null, lastName: trimmed };
  }
  
  const lastNameStartIndex = findLastNameStartIndex(words, knownNames);
  
  if (lastNameStartIndex === 0) {
    return { 
      firstName: words[0], 
      lastName: words.slice(1).join(' ') || null 
    };
  }
  
  if (lastNameStartIndex >= words.length) {
    return { 
      firstName: words.slice(0, -1).join(' ') || null, 
      lastName: words[words.length - 1] 
    };
  }
  
  const firstName = words.slice(0, lastNameStartIndex).join(' ');
  const lastName = words.slice(lastNameStartIndex).join(' ');
  
  return {
    firstName: firstName || null,
    lastName: lastName || null,
  };
}

async function loadKnownNames() {
  const names = await prisma.firstNameGender.findMany({
    select: { name: true },
  });
  
  return new Set(names.map(n => n.name.toLowerCase()));
}

async function detectMissplitNames() {
  console.log('🔍 Cargando nombres conocidos de FirstNameGender...');
  const knownNames = await loadKnownNames();
  console.log(`   📋 ${knownNames.size} nombres en la tabla\n`);
  
  console.log('🔍 Analizando personas...\n');
  
  const people = await prisma.person.findMany({
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
    },
  });
  
  console.log(`   📊 Total de personas: ${people.length}\n`);
  
  const toFix = [];
  
  for (const person of people) {
    const currentFullName = [person.firstName, person.lastName]
      .filter(Boolean)
      .join(' ');
    
    if (!currentFullName) continue;
    
    const { firstName: suggestedFirst, lastName: suggestedLast } = 
      splitFullName(currentFullName, knownNames);
    
    const currentFirst = person.firstName || '';
    const currentLast = person.lastName || '';
    const sugFirst = suggestedFirst || '';
    const sugLast = suggestedLast || '';
    
    if (currentFirst !== sugFirst || currentLast !== sugLast) {
      let reason = '';
      
      const words = tokenizeName(currentFullName);
      
      // Verificar si hay apodos o iniciales
      const hasNickname = words.some(w => isNickname(w));
      const hasInitial = words.some(w => isInitial(w));
      
      // Verificar si hay algún nombre conocido
      const hasAnyKnownName = words.some(w => 
        !isPreposition(w) && !isNickname(w) && !isInitial(w) && isKnownName(w, knownNames)
      );
      
      // Detectar razón del cambio
      if (words.length === 1 && currentFirst && !currentLast) {
        reason = 'Nombre único → va a apellido para ordenamiento';
      }
      else if (hasNickname && !sugFirst?.includes('"') && !sugFirst?.includes("'") && !sugFirst?.includes('«')) {
        reason = 'Apodo debe ir con el nombre';
      }
      else if (hasNickname) {
        reason = 'Reorganización con apodo';
      }
      else if (hasInitial) {
        reason = 'Inicial va con el nombre';
      }
      else if (!hasAnyKnownName && !sugFirst) {
        reason = 'Sin nombres conocidos → todo a apellido';
      }
      else {
        const currentLastWords = currentLast ? currentLast.split(/\s+/) : [];
        if (currentLastWords.length > 0) {
          const firstWordOfLastName = currentLastWords[0];
          if (knownNames.has(firstWordOfLastName.toLowerCase())) {
            reason = `"${firstWordOfLastName}" es un nombre conocido`;
          } else if (isPreposition(firstWordOfLastName)) {
            reason = `"${firstWordOfLastName}" es preposición`;
          }
        }
      }
      
      if (!reason) {
        reason = 'Reorganización de nombres';
      }
      
      toFix.push({
        id: person.id,
        slug: person.slug,
        currentFirstName: person.firstName,
        currentLastName: person.lastName,
        suggestedFirstName: sugFirst,
        suggestedLastName: sugLast,
        reason,
      });
    }
  }
  
  return toFix;
}

function printResults(toFix) {
  if (toFix.length === 0) {
    console.log('✅ No se encontraron nombres mal separados.\n');
    return;
  }
  
  console.log(`⚠️  Se encontraron ${toFix.length} casos para corregir:\n`);
  console.log('─'.repeat(100));
  
  const toShow = toFix.slice(0, 100);
  
  for (const person of toShow) {
    console.log(`  ID ${person.id}:`);
    console.log(`    Actual:    "${person.currentFirstName || ''}" + "${person.currentLastName || ''}"`);
    console.log(`    Sugerido:  "${person.suggestedFirstName || ''}" + "${person.suggestedLastName || ''}"`);
    console.log(`    Razón:     ${person.reason}`);
    console.log('');
  }
  
  if (toFix.length > 100) {
    console.log(`  ... y ${toFix.length - 100} casos más\n`);
  }
}

async function exportToCSV(toFix) {
  const filename = `nombres-a-corregir-${new Date().toISOString().slice(0, 10)}.csv`;
  
  const header = 'ID,Slug,Nombre Actual,Apellido Actual,Nombre Sugerido,Apellido Sugerido,Razón\n';
  
  const rows = toFix.map(p => 
    `${p.id},"${p.slug}","${p.currentFirstName || ''}","${p.currentLastName || ''}","${p.suggestedFirstName || ''}","${p.suggestedLastName || ''}","${p.reason}"`
  ).join('\n');
  
  fs.writeFileSync(filename, header + rows, 'utf-8');
  console.log(`\n📄 Exportado a: ${filename}`);
}

async function applyFixes(toFix, dryRun = true) {
  if (toFix.length === 0) {
    console.log('\n✅ No hay casos para corregir.\n');
    return;
  }
  
  console.log(`\n🔧 ${dryRun ? '[DRY RUN] ' : ''}Aplicando ${toFix.length} correcciones...\n`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const person of toFix) {
    try {
      if (!dryRun) {
        await prisma.person.update({
          where: { id: person.id },
          data: {
            firstName: person.suggestedFirstName || null,
            lastName: person.suggestedLastName || null,
          },
        });
      }
      
      console.log(`  ✓ ID ${person.id}: "${person.currentFirstName || ''} ${person.currentLastName || ''}" → "${person.suggestedFirstName || ''}" + "${person.suggestedLastName || ''}"`);
      fixed++;
    } catch (error) {
      console.error(`  ✗ Error en ID ${person.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   ✓ ${dryRun ? 'Se corregirían' : 'Corregidos'}: ${fixed}`);
  console.log(`   ✗ Errores: ${errors}`);
  
  if (dryRun) {
    console.log('\n⚠️  Esto fue un DRY RUN. Para aplicar los cambios, ejecutá con --fix --confirm');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const shouldConfirm = args.includes('--confirm');
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Detector de Nombres Mal Separados - CineNacional           ║');
  console.log('║     (usando FirstNameGender)                                   ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  Reglas (en orden de prioridad):                               ║');
  console.log('║  • Una sola palabra → va a apellido (para ordenamiento)        ║');
  console.log('║  • Apodos entre comillas → van con el nombre                   ║');
  console.log('║  • Iniciales (A., J.) → van con el nombre                      ║');
  console.log('║  • Sin nombres/apodos/iniciales → todo va a apellido           ║');
  console.log('║  • Preposiciones (de, del, la) → van con palabra siguiente     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const toFix = await detectMissplitNames();
  
  printResults(toFix);
  
  // Siempre exportar a CSV
  if (toFix.length > 0) {
    await exportToCSV(toFix);
  }
  
  if (shouldFix) {
    await applyFixes(toFix, !shouldConfirm);
  }
  
  console.log('\n📋 Opciones disponibles:');
  console.log('   --fix            Mostrar cambios que se aplicarían (dry run)');
  console.log('   --fix --confirm  Aplicar todas las correcciones');
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });