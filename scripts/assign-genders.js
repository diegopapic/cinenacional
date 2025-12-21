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
    console.log('─'.repeat(80));
    console.log('Instrucciones:');
    console.log('  M = Masculino (MALE)');
    console.log('  F = Femenino (FEMALE)');
    console.log('  U = Unisex (UNISEX) - agrega a la tabla');
    console.log('  O = Otro género (OTHER) - NO agrega a la tabla');
    console.log('  S = Saltar esta persona');
    console.log('  Q = Salir del script');
    console.log('─'.repeat(80));
    console.log('');

    // Contadores
    let autoAssigned = 0;
    let manualAssigned = 0;
    let skipped = 0;
    let newNames = 0;
    let current = 0;
    const total = people.length;
    let wasAutoAssigning = false;

    // 3. Procesar cada persona
    for (const person of people) {
      current++;
      const normalizedName = person.normalized_name;
      const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ');
      const remaining = total - current;
      const progress = `[${current}/${total}] (${remaining} restantes)`;
      
      // Verificar si el nombre está en la tabla
      if (genderMap.has(normalizedName)) {
        const gender = genderMap.get(normalizedName);
        
        // Si es UNISEX, preguntar
        if (gender === 'UNISEX') {
          // Limpiar línea de progreso si venimos de auto-asignación
          if (wasAutoAssigning) {
            console.log('');
            wasAutoAssigning = false;
          }
          
          console.log(`\n${progress} 👤 ${fullName} (ID: ${person.id})`);
          console.log(`   Nombre "${normalizedName}" es UNISEX`);
          
          const answer = await ask('   ¿Qué género asignar? (M/F/O/S/Q): ');
          
          if (answer === 'Q') {
            console.log('\n👋 Saliendo...');
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
          // Asignar automáticamente
          await client.query(
            'UPDATE people SET gender = $1, updated_at = NOW() WHERE id = $2',
            [gender, person.id]
          );
          autoAssigned++;
          wasAutoAssigning = true;
          
          // Mostrar progreso
          const percent = Math.round((current / total) * 100);
          const remaining = total - current;
          process.stdout.write(`\r   🔄 Auto-asignando... [${current}/${total}] (${percent}%) - ${autoAssigned} asignados, ${remaining} restantes   `);
        }
      } else {
        // Limpiar línea de progreso si venimos de auto-asignación
        if (wasAutoAssigning) {
          console.log('');
          wasAutoAssigning = false;
        }
        
        // Nombre no está en la tabla - preguntar
        console.log(`\n${progress} 👤 ${fullName} (ID: ${person.id})`);
        console.log(`   ⚠️  Nombre "${normalizedName}" NO está en la tabla`);
        
        const answer = await ask('   ¿Qué género? (M/F/U/O/S/Q): ');
        
        if (answer === 'Q') {
          console.log('\n👋 Saliendo...');
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

    // Limpiar línea de progreso si terminamos en auto-asignación
    if (wasAutoAssigning) {
      console.log('');
    }

    // 4. Resumen final
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 RESUMEN:');
    console.log('─'.repeat(80));
    console.log(`   🤖 Auto-asignados: ${autoAssigned}`);
    console.log(`   👤 Manual-asignados: ${manualAssigned}`);
    console.log(`   📝 Nombres nuevos agregados: ${newNames}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   📋 Total procesados: ${autoAssigned + manualAssigned + skipped}`);
    console.log('═'.repeat(80));

    // Estadísticas finales
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN gender IS NOT NULL THEN 1 END) as con_genero,
        COUNT(CASE WHEN gender IS NULL THEN 1 END) as sin_genero
      FROM people
    `;
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('\n📊 Estado actual de la tabla people:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Con género: ${stats.con_genero}`);
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
console.log('🔧 Script para asignar género a personas');
console.log('   Usa la tabla first_name_genders como referencia');
console.log('   Pregunta por nombres desconocidos\n');
console.log('═'.repeat(80));
assignGenders();