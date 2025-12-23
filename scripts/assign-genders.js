const { Client } = require('pg');
const readline = require('readline');

// Configuración PostgreSQL - VPS
const pgConfig = {
  host: 'localhost',
  port: 5433,
  database: 'cinenacional',
  user: 'cinenacional',
  password: 'Paganitzu'
};

// Crear interfaz para preguntas
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toUpperCase());
    });
  });
}

async function assignGenders() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Obtener personas sin género asignado
    console.log('📊 Buscando personas sin género asignado...\n');
    
    const peopleQuery = `
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.slug,
        LOWER(TRIM(SPLIT_PART(p.first_name, ' ', 1))) as normalized_name
      FROM people p
      WHERE p.gender IS NULL
        AND p.first_name IS NOT NULL
        AND p.first_name != ''
      ORDER BY p.id
    `;
    
    const peopleResult = await client.query(peopleQuery);
    const people = peopleResult.rows;
    
    console.log(`📋 Personas sin género: ${people.length}\n`);
    
    if (people.length === 0) {
      console.log('✅ Todas las personas ya tienen género asignado.');
      return;
    }

    // 2. Cargar tabla de géneros en memoria
    const genderQuery = `SELECT name, gender FROM first_name_genders`;
    const genderResult = await client.query(genderQuery);
    const genderMap = new Map();
    genderResult.rows.forEach(row => {
      genderMap.set(row.name, row.gender);
    });
    
    console.log(`📚 Nombres en tabla de géneros: ${genderMap.size}\n`);

    // Contadores
    let autoAssigned = 0;
    let manualAssigned = 0;
    let skipped = 0;
    let newNames = 0;

    // ══════════════════════════════════════════════════════════════════════════
    // FASE 1: AUTO-ASIGNACIÓN (nombres con género definido, NO unisex)
    // ══════════════════════════════════════════════════════════════════════════
    
    console.log('═'.repeat(80));
    console.log('🤖 FASE 1: AUTO-ASIGNACIÓN DE GÉNEROS CONOCIDOS');
    console.log('═'.repeat(80));
    console.log('');

    const pendingForManual = []; // Guardar los que necesitan atención manual

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const normalizedName = person.normalized_name;
      
      if (genderMap.has(normalizedName)) {
        const gender = genderMap.get(normalizedName);
        
        if (gender === 'UNISEX') {
          // Guardar para la fase 2
          pendingForManual.push({ ...person, reason: 'UNISEX' });
        } else {
          // Asignar automáticamente (MALE o FEMALE)
          await client.query(
            'UPDATE people SET gender = $1, updated_at = NOW() WHERE id = $2',
            [gender, person.id]
          );
          autoAssigned++;
          
          // Mostrar progreso
          const percent = Math.round(((i + 1) / people.length) * 100);
          process.stdout.write(`\r   🔄 Procesando... [${i + 1}/${people.length}] (${percent}%) - ${autoAssigned} auto-asignados`);
        }
      } else {
        // Nombre no está en la tabla - guardar para fase 2
        pendingForManual.push({ ...person, reason: 'UNKNOWN' });
      }
    }

    console.log('\n');
    console.log(`   ✅ Auto-asignados: ${autoAssigned}`);
    console.log(`   📋 Pendientes para revisión manual: ${pendingForManual.length}`);
    
    // Separar por tipo
    const unisexPending = pendingForManual.filter(p => p.reason === 'UNISEX');
    const unknownPending = pendingForManual.filter(p => p.reason === 'UNKNOWN');
    
    console.log(`      - Nombres UNISEX: ${unisexPending.length}`);
    console.log(`      - Nombres desconocidos: ${unknownPending.length}`);
    console.log('');

    if (pendingForManual.length === 0) {
      console.log('✅ ¡Todos los géneros fueron asignados automáticamente!');
    } else {
      // ══════════════════════════════════════════════════════════════════════════
      // FASE 2: ASIGNACIÓN MANUAL
      // ══════════════════════════════════════════════════════════════════════════
      
      console.log('═'.repeat(80));
      console.log('👤 FASE 2: ASIGNACIÓN MANUAL');
      console.log('═'.repeat(80));
      console.log('');
      console.log('Instrucciones:');
      console.log('  M = Masculino (MALE)');
      console.log('  F = Femenino (FEMALE)');
      console.log('  U = Unisex (UNISEX) - agrega a la tabla');
      console.log('  O = Otro género (OTHER) - NO agrega a la tabla');
      console.log('  S = Saltar esta persona');
      console.log('  Q = Salir del script');
      console.log('─'.repeat(80));
      console.log('');

      const continueAnswer = await ask('¿Continuar con la asignación manual? (S/N): ');
      
      if (continueAnswer === 'N' || continueAnswer === 'Q') {
        console.log('\n👋 Saltando fase manual...');
        skipped = pendingForManual.length;
      } else {
        // Procesar primero los UNISEX, luego los desconocidos
        const sortedPending = [...unisexPending, ...unknownPending];
        
        let current = 0;
        const total = sortedPending.length;

        for (const person of sortedPending) {
          current++;
          const normalizedName = person.normalized_name;
          const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ');
          const remaining = total - current;
          const progress = `[${current}/${total}] (${remaining} restantes)`;
          
          if (person.reason === 'UNISEX') {
            console.log(`\n${progress} 👤 ${fullName} (ID: ${person.id})`);
            console.log(`   🔄 Nombre "${normalizedName}" es UNISEX`);
            
            const answer = await ask('   ¿Qué género asignar? (M/F/O/S/Q): ');
            
            if (answer === 'Q') {
              console.log('\n👋 Saliendo...');
              skipped += (total - current + 1);
              break;
            }
            
            if (answer === 'S') {
              skipped++;
              continue;
            }
            
            let genderToAssign = null;
            if (answer === 'M') genderToAssign = 'MALE';
            else if (answer === 'F') genderToAssign = 'FEMALE';
            else if (answer === 'O') genderToAssign = 'OTHER';
            
            if (genderToAssign) {
              await client.query(
                'UPDATE people SET gender = $1, updated_at = NOW() WHERE id = $2',
                [genderToAssign, person.id]
              );
              manualAssigned++;
              console.log(`   ✅ Asignado: ${genderToAssign}`);
            } else {
              skipped++;
            }
          } else {
            // Nombre desconocido
            console.log(`\n${progress} 👤 ${fullName} (ID: ${person.id})`);
            console.log(`   ⚠️  Nombre "${normalizedName}" NO está en la tabla`);
            
            const answer = await ask('   ¿Qué género? (M/F/U/O/S/Q): ');
            
            if (answer === 'Q') {
              console.log('\n👋 Saliendo...');
              skipped += (total - current + 1);
              break;
            }
            
            if (answer === 'S') {
              skipped++;
              continue;
            }
            
            let genderToAssign = null;
            let genderForTable = null;
            
            if (answer === 'M') {
              genderToAssign = 'MALE';
              genderForTable = 'MALE';
            } else if (answer === 'F') {
              genderToAssign = 'FEMALE';
              genderForTable = 'FEMALE';
            } else if (answer === 'U') {
              genderForTable = 'UNISEX';
              // Para unisex, preguntar qué asignar a esta persona específica
              const specificAnswer = await ask('   ¿Y para esta persona específica? (M/F/O/S): ');
              if (specificAnswer === 'M') {
                genderToAssign = 'MALE';
              } else if (specificAnswer === 'F') {
                genderToAssign = 'FEMALE';
              } else if (specificAnswer === 'O') {
                genderToAssign = 'OTHER';
              }
            } else if (answer === 'O') {
              // Otro género - asignar a la persona pero NO agregar a la tabla
              genderToAssign = 'OTHER';
              genderForTable = null; // No agregar a la tabla
            }
            
            // Agregar a la tabla de géneros (solo si hay genderForTable)
            if (genderForTable) {
              try {
                await client.query(
                  'INSERT INTO first_name_genders (name, gender) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                  [normalizedName, genderForTable]
                );
                genderMap.set(normalizedName, genderForTable);
                newNames++;
                console.log(`   📝 Agregado "${normalizedName}" como ${genderForTable}`);
              } catch (err) {
                console.log(`   ⚠️  Error agregando nombre: ${err.message}`);
              }
            }
            
            // Asignar género a la persona
            if (genderToAssign) {
              await client.query(
                'UPDATE people SET gender = $1, updated_at = NOW() WHERE id = $2',
                [genderToAssign, person.id]
              );
              manualAssigned++;
              console.log(`   ✅ Persona actualizada: ${genderToAssign}`);
            } else {
              skipped++;
            }
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ══════════════════════════════════════════════════════════════════════════
    
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 RESUMEN FINAL:');
    console.log('─'.repeat(80));
    console.log(`   🤖 Auto-asignados (Fase 1): ${autoAssigned}`);
    console.log(`   👤 Manual-asignados (Fase 2): ${manualAssigned}`);
    console.log(`   📝 Nombres nuevos agregados: ${newNames}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   📋 Total procesados: ${autoAssigned + manualAssigned + skipped}`);
    console.log('═'.repeat(80));

    // Estadísticas finales
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN gender IS NOT NULL THEN 1 END) as con_genero,
        COUNT(CASE WHEN gender IS NULL THEN 1 END) as sin_genero,
        COUNT(CASE WHEN gender = 'MALE' THEN 1 END) as male,
        COUNT(CASE WHEN gender = 'FEMALE' THEN 1 END) as female,
        COUNT(CASE WHEN gender = 'OTHER' THEN 1 END) as other
      FROM people
    `;
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('\n📊 Estado actual de la tabla people:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Con género: ${stats.con_genero} (${Math.round(stats.con_genero / stats.total * 100)}%)`);
    console.log(`     - MALE: ${stats.male}`);
    console.log(`     - FEMALE: ${stats.female}`);
    console.log(`     - OTHER: ${stats.other}`);
    console.log(`   Sin género: ${stats.sin_genero}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    rl.close();
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🔧 Script para asignar género a personas (v2)');
console.log('   FASE 1: Auto-asigna todos los géneros conocidos');
console.log('   FASE 2: Pregunta por UNISEX y desconocidos\n');
console.log('═'.repeat(80));
assignGenders();