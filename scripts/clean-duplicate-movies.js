/**
 * Script interactivo para limpiar películas duplicadas
 * Detecta crew duplicado entre películas con mismo título + director
 * Maneja casos de 2, 3 o más películas mezcladas
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Configurar readline para input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pregunta al usuario y espera respuesta
 */
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Obtiene el nombre completo de una persona
 */
function getPersonName(person) {
  if (!person) return 'Desconocido';
  const parts = [];
  if (person.firstName) parts.push(person.firstName);
  if (person.lastName) parts.push(person.lastName);
  return parts.join(' ') || 'Desconocido';
}

/**
 * Obtiene los IDs de directores de una película
 */
function getDirectorIds(crew) {
  if (!crew || crew.length === 0) return [];
  
  return crew
    .filter(member => member.roleId === 2)
    .map(member => member.person?.id)
    .filter(id => id !== undefined && id !== null);
}

/**
 * Verifica si dos películas comparten al menos un director
 */
function shareDirectors(movie1Directors, movie2Directors) {
  if (movie1Directors.length === 0 || movie2Directors.length === 0) {
    return false;
  }
  
  return movie1Directors.some(id => movie2Directors.includes(id));
}

/**
 * Normaliza un título para comparación
 */
function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Identifica la película mezclada (la que tiene MÁS directores)
 * y las películas originales en un grupo
 */
function identifyMixedAndOriginals(movies) {
  // Ordenar por cantidad de directores (descendente)
  const moviesWithDirectorCount = movies.map(movie => ({
    movie,
    directorCount: getDirectorIds(movie.crew).length
  })).sort((a, b) => b.directorCount - a.directorCount);
  
  // La que tiene más directores es la mezclada
  const mixed = moviesWithDirectorCount[0].movie;
  
  // El resto son originales
  const originals = moviesWithDirectorCount.slice(1).map(item => item.movie);
  
  return { mixed, originals };
}

/**
 * Encuentra crew members que están duplicados entre la película mezclada
 * y cualquiera de las películas originales
 */
function findDuplicateCrewMembers(mixedCrew, originalsCrews) {
  const duplicates = [];
  
  mixedCrew.forEach(mixedMember => {
    const personId = mixedMember.person?.id;
    if (!personId) return;
    
    // Buscar si esta persona/rol está en alguna de las películas originales
    const existsInAnyOriginal = originalsCrews.some(originalCrew =>
      originalCrew.some(
        origMember => origMember.person?.id === personId && origMember.roleId === mixedMember.roleId
      )
    );
    
    if (existsInAnyOriginal) {
      duplicates.push(mixedMember);
    }
  });
  
  return duplicates;
}

/**
 * Muestra información de una película de forma bonita
 */
function displayMovie(movie, label, highlight = false) {
  const year = movie.year && movie.year !== 0 ? movie.year : (movie.releaseYear || 'Sin año');
  const directorCount = getDirectorIds(movie.crew).length;
  
  const border = highlight ? '█' : '=';
  console.log(`\n${border.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${border.repeat(70)}`);
  console.log(`  ID: ${movie.id}`);
  console.log(`  Título: "${movie.title}"`);
  console.log(`  Año: ${year}`);
  console.log(`  Slug: ${movie.slug}`);
  console.log(`  Directores: ${directorCount} ${highlight ? '← MÁS DIRECTORES (MEZCLADA)' : ''}`);
  console.log(`\n  CREW (${movie.crew.length} personas):`);
  
  if (movie.crew.length === 0) {
    console.log(`    (sin crew)`);
  } else {
    // Agrupar por rol
    const crewByRole = {};
    movie.crew.forEach(member => {
      const roleName = member.role?.name || 'Sin rol';
      if (!crewByRole[roleName]) {
        crewByRole[roleName] = [];
      }
      crewByRole[roleName].push(getPersonName(member.person));
    });
    
    Object.entries(crewByRole).forEach(([role, people]) => {
      console.log(`    ${role}:`);
      people.forEach(person => {
        console.log(`      - ${person}`);
      });
    });
  }
}

/**
 * Muestra los crew members que serán eliminados
 */
function displayDuplicateCrewMembers(duplicateMembers) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ⚠️  CREW DUPLICADO A ELIMINAR (${duplicateMembers.length} personas):`);
  console.log(`${'─'.repeat(70)}`);
  
  if (duplicateMembers.length === 0) {
    console.log(`  (ninguno)`);
    return;
  }
  
  // Agrupar por rol para mejor visualización
  const byRole = {};
  duplicateMembers.forEach(member => {
    const roleName = member.role?.name || 'Sin rol';
    if (!byRole[roleName]) {
      byRole[roleName] = [];
    }
    byRole[roleName].push({
      name: getPersonName(member.person),
      id: member.id
    });
  });
  
  Object.entries(byRole).forEach(([role, people]) => {
    console.log(`  ${role}:`);
    people.forEach(person => {
      console.log(`    ❌ ${person.name} (ID del registro: ${person.id})`);
    });
  });
}

/**
 * Detecta grupos de películas duplicadas (pueden ser 2, 3 o más)
 */
async function detectDuplicateGroups() {
  console.log('🔍 Buscando películas duplicadas...\n');

  try {
    // Obtener todas las películas con crew completo
    const movies = await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        releaseYear: true,
        slug: true,
        crew: {
          select: {
            id: true,
            roleId: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            role: {
              select: {
                id: true,
                name: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    console.log(`📊 Total de películas: ${movies.length}\n`);

    // Agrupar por título normalizado
    const titleGroups = new Map();
    
    movies.forEach(movie => {
      const normalizedTitle = normalizeTitle(movie.title);
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle).push(movie);
    });

    // Encontrar grupos con películas que comparten directores
    const duplicateGroups = [];

    titleGroups.forEach((movies) => {
      if (movies.length > 1) {
        // Verificar si hay películas que comparten directores
        const moviesWithSharedDirectors = [];
        
        for (let i = 0; i < movies.length; i++) {
          const movie1Directors = getDirectorIds(movies[i].crew);
          
          for (let j = i + 1; j < movies.length; j++) {
            const movie2Directors = getDirectorIds(movies[j].crew);
            
            if (shareDirectors(movie1Directors, movie2Directors)) {
              // Agregar ambas películas al grupo si no están ya
              if (!moviesWithSharedDirectors.find(m => m.id === movies[i].id)) {
                moviesWithSharedDirectors.push(movies[i]);
              }
              if (!moviesWithSharedDirectors.find(m => m.id === movies[j].id)) {
                moviesWithSharedDirectors.push(movies[j]);
              }
            }
          }
        }
        
        // Si hay 2 o más películas que comparten directores, es un grupo duplicado
        if (moviesWithSharedDirectors.length >= 2) {
          const { mixed, originals } = identifyMixedAndOriginals(moviesWithSharedDirectors);
          const originalsCrews = originals.map(m => m.crew);
          const duplicateCrewMembers = findDuplicateCrewMembers(mixed.crew, originalsCrews);
          
          // Solo agregar si hay crew duplicado para limpiar
          if (duplicateCrewMembers.length > 0) {
            duplicateGroups.push({
              mixed,
              originals,
              duplicateCrewMembers,
              totalMovies: moviesWithSharedDirectors.length
            });
          }
        }
      }
    });

    console.log(`✅ Se encontraron ${duplicateGroups.length} grupos de películas con crew duplicado\n`);
    
    // Estadísticas
    const groupsBySize = {};
    duplicateGroups.forEach(group => {
      const size = group.totalMovies;
      groupsBySize[size] = (groupsBySize[size] || 0) + 1;
    });
    
    console.log('📊 Distribución de grupos:');
    Object.entries(groupsBySize).sort((a, b) => a[0] - b[0]).forEach(([size, count]) => {
      console.log(`   - ${size} películas mezcladas: ${count} grupo(s)`);
    });
    console.log('');
    
    return duplicateGroups;

  } catch (error) {
    console.error('❌ Error al buscar duplicados:', error);
    throw error;
  }
}

/**
 * Procesa un grupo de películas duplicadas
 */
async function processDuplicateGroup(group, index, total) {
  console.log('\n\n');
  console.log('╔═════════════════════════════════════════════════════════════════════╗');
  console.log(`║  GRUPO ${index + 1} DE ${total} (${group.totalMovies} películas mezcladas)${' '.repeat(Math.max(0, 30 - group.totalMovies.toString().length))}║`);
  console.log('╚═════════════════════════════════════════════════════════════════════╝');
  
  // Mostrar película mezclada (la que se limpiará)
  displayMovie(group.mixed, '⚠️  PELÍCULA MEZCLADA (se limpiará el crew duplicado)', true);
  
  // Mostrar películas originales
  group.originals.forEach((original, idx) => {
    displayMovie(original, `✅ PELÍCULA ORIGINAL #${idx + 1} (se mantendrá intacta)`);
  });
  
  // Mostrar crew duplicado a eliminar
  displayDuplicateCrewMembers(group.duplicateCrewMembers);
  
  console.log('\n');
  console.log(`${'═'.repeat(70)}`);
  console.log(`\nResumen:`);
  console.log(`  - Películas originales: ${group.originals.length}`);
  console.log(`  - Película mezclada: 1 (ID: ${group.mixed.id})`);
  console.log(`  - Crew duplicado a eliminar: ${group.duplicateCrewMembers.length} personas`);
  
  // Pedir confirmación
  const answer = await question('\n¿Deseas ELIMINAR el crew duplicado de la película mezclada? (s/n/q para salir): ');
  
  if (answer.toLowerCase() === 'q') {
    console.log('\n❌ Proceso cancelado por el usuario.\n');
    return 'quit';
  }
  
  if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y') {
    try {
      // Eliminar los crew members duplicados
      const idsToDelete = group.duplicateCrewMembers.map(m => m.id);
      
      const result = await prisma.movieCrew.deleteMany({
        where: {
          id: {
            in: idsToDelete
          }
        }
      });
      
      console.log(`\n✅ Eliminados ${result.count} registros de crew duplicado.\n`);
      return 'cleaned';
    } catch (error) {
      console.error(`\n❌ Error al eliminar crew duplicado:`, error.message);
      return 'error';
    }
  } else {
    console.log('\n⏭️  Saltando este grupo...\n');
    return 'skipped';
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                   ║');
  console.log('║         LIMPIADOR AUTOMÁTICO DE PELÍCULAS DUPLICADAS             ║');
  console.log('║              (Maneja 2, 3 o más películas mezcladas)             ║');
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('Este script detecta películas mezcladas (con directores de múltiples');
  console.log('películas) y limpia automáticamente el crew duplicado.\n');
  console.log('La película con MÁS directores se considera la mezclada y se limpia.\n');

  try {
    // Detectar grupos duplicados
    const duplicateGroups = await detectDuplicateGroups();
    
    if (duplicateGroups.length === 0) {
      console.log('🎉 No se encontraron películas con crew duplicado para limpiar.\n');
      rl.close();
      return;
    }
    
    // Pedir confirmación general antes de comenzar
    console.log(`⚠️  Se encontraron ${duplicateGroups.length} grupos de películas para limpiar.\n`);
    const answer = await question('¿Deseas proceder con la limpieza automática de TODOS los grupos? (s/n): ');
    
    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Proceso cancelado por el usuario.\n');
      rl.close();
      return;
    }
    
    console.log('\n🚀 Iniciando limpieza automática...\n');
    
    // Procesar todos los grupos automáticamente
    let cleaned = 0;
    let errors = 0;
    let totalCrewDeleted = 0;
    
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      
      console.log(`\n[${i + 1}/${duplicateGroups.length}] Procesando grupo: "${group.mixed.title}"`);
      console.log(`   - Película mezclada: ID ${group.mixed.id} (${group.mixed.slug})`);
      console.log(`   - Películas originales: ${group.originals.length}`);
      console.log(`   - Crew duplicado a eliminar: ${group.duplicateCrewMembers.length}`);
      
      try {
        // Eliminar los crew members duplicados
        const idsToDelete = group.duplicateCrewMembers.map(m => m.id);
        
        const result = await prisma.movieCrew.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
        
        console.log(`   ✅ Eliminados ${result.count} registros de crew duplicado`);
        cleaned++;
        totalCrewDeleted += result.count;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    // Resumen final
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                      RESUMEN FINAL                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log(`\n  Total de grupos procesados: ${duplicateGroups.length}`);
    console.log(`  ✅ Grupos limpiados: ${cleaned}`);
    console.log(`  ❌ Errores: ${errors}`);
    console.log(`  🗑️  Total de crew duplicado eliminado: ${totalCrewDeleted} registros`);
    console.log('\n✨ Proceso completado.\n');

  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Ejecutar el script
main();