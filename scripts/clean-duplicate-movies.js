/**
 * Script interactivo para limpiar películas duplicadas - VERSION 2
 * Completamente reescrito con manejo robusto de errores
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function getPersonName(person) {
  if (!person) return 'Desconocido';
  const parts = [];
  if (person.firstName) parts.push(person.firstName);
  if (person.lastName) parts.push(person.lastName);
  return parts.join(' ') || 'Desconocido';
}

function getDirectorIds(crew) {
  if (!Array.isArray(crew)) return [];
  return crew
    .filter(member => member.roleId === 2)
    .map(member => member.person?.id)
    .filter(id => id !== undefined && id !== null);
}

function shareDirectors(movie1Directors, movie2Directors) {
  if (!Array.isArray(movie1Directors) || !Array.isArray(movie2Directors)) return false;
  if (movie1Directors.length === 0 || movie2Directors.length === 0) return false;
  return movie1Directors.some(id => movie2Directors.includes(id));
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function identifyMixedAndOriginals(movies) {
  const moviesWithDirectorCount = movies.map(movie => ({
    movie,
    directorCount: getDirectorIds(movie.crew).length
  })).sort((a, b) => b.directorCount - a.directorCount);
  
  const mixed = moviesWithDirectorCount[0].movie;
  const originals = moviesWithDirectorCount.slice(1).map(item => item.movie);
  
  return { mixed, originals };
}

function findDuplicateCrewMembers(mixedCrew, originalsCrews) {
  if (!Array.isArray(mixedCrew)) return [];
  if (!Array.isArray(originalsCrews)) return [];
  
  const duplicates = [];
  
  mixedCrew.forEach(mixedMember => {
    const personId = mixedMember.person?.id;
    if (!personId) return;
    
    const existsInAnyOriginal = originalsCrews.some(originalCrew =>
      Array.isArray(originalCrew) && originalCrew.some(
        origMember => origMember.person?.id === personId && origMember.roleId === mixedMember.roleId
      )
    );
    
    if (existsInAnyOriginal) {
      duplicates.push(mixedMember);
    }
  });
  
  return duplicates;
}

function findDuplicateCastMembers(mixedCast, originalsCasts) {
  if (!Array.isArray(mixedCast)) return [];
  if (!Array.isArray(originalsCasts)) return [];
  
  const duplicates = [];
  
  mixedCast.forEach(mixedMember => {
    const personId = mixedMember.person?.id;
    if (!personId) return;
    
    const existsInAnyOriginal = originalsCasts.some(originalCast =>
      Array.isArray(originalCast) && originalCast.some(
        origMember => origMember.person?.id === personId && 
                     origMember.characterName === mixedMember.characterName
      )
    );
    
    if (existsInAnyOriginal) {
      duplicates.push(mixedMember);
    }
  });
  
  return duplicates;
}

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
  
  // Mostrar CREW
  const crew = Array.isArray(movie.crew) ? movie.crew : [];
  console.log(`\n  CREW (${crew.length} personas):`);
  
  if (crew.length === 0) {
    console.log(`    (sin crew)`);
  } else {
    const crewByRole = {};
    crew.forEach(member => {
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
  
  // Mostrar CAST
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  console.log(`\n  CAST (${cast.length} personas):`);
  
  if (cast.length === 0) {
    console.log(`    (sin cast)`);
  } else {
    cast.slice(0, 5).forEach(member => {
      const personName = getPersonName(member.person);
      const character = member.characterName ? ` como "${member.characterName}"` : '';
      console.log(`    - ${personName}${character}`);
    });
    if (cast.length > 5) {
      console.log(`    ... y ${cast.length - 5} más`);
    }
  }
}

function displayDuplicates(crewDuplicates, castDuplicates) {
  // Validación robusta
  const crew = Array.isArray(crewDuplicates) ? crewDuplicates : [];
  const cast = Array.isArray(castDuplicates) ? castDuplicates : [];
  const total = crew.length + cast.length;
  
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  ⚠️  DUPLICADOS A ELIMINAR (${total} personas):`);
  console.log(`${'─'.repeat(70)}`);
  
  if (total === 0) {
    console.log(`  (ninguno)`);
    return;
  }
  
  // CREW
  if (crew.length > 0) {
    console.log(`\n  🎬 CREW DUPLICADO (${crew.length}):`);
    
    const byRole = {};
    crew.forEach(member => {
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
      console.log(`    ${role}:`);
      people.forEach(person => {
        console.log(`      ❌ ${person.name} (ID: ${person.id})`);
      });
    });
  }
  
  // CAST
  if (cast.length > 0) {
    console.log(`\n  🎭 CAST DUPLICADO (${cast.length}):`);
    
    cast.forEach(member => {
      const personName = getPersonName(member.person);
      const character = member.characterName ? ` como "${member.characterName}"` : '';
      console.log(`    ❌ ${personName}${character} (ID: ${member.id})`);
    });
  }
}

async function detectDuplicateGroups() {
  console.log('🔍 Buscando películas duplicadas...\n');

  try {
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
        },
        cast: {
          select: {
            id: true,
            characterName: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
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

    const titleGroups = new Map();
    
    movies.forEach(movie => {
      const normalizedTitle = normalizeTitle(movie.title);
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      titleGroups.get(normalizedTitle).push(movie);
    });

    const duplicateGroups = [];

    titleGroups.forEach((movies) => {
      if (movies.length > 1) {
        const moviesWithSharedDirectors = [];
        
        for (let i = 0; i < movies.length; i++) {
          const movie1Directors = getDirectorIds(movies[i].crew);
          
          for (let j = i + 1; j < movies.length; j++) {
            const movie2Directors = getDirectorIds(movies[j].crew);
            
            if (shareDirectors(movie1Directors, movie2Directors)) {
              if (!moviesWithSharedDirectors.find(m => m.id === movies[i].id)) {
                moviesWithSharedDirectors.push(movies[i]);
              }
              if (!moviesWithSharedDirectors.find(m => m.id === movies[j].id)) {
                moviesWithSharedDirectors.push(movies[j]);
              }
            }
          }
        }
        
        if (moviesWithSharedDirectors.length >= 2) {
          const { mixed, originals } = identifyMixedAndOriginals(moviesWithSharedDirectors);
          const originalsCrews = originals.map(m => m.crew);
          const originalsCasts = originals.map(m => m.cast);
          const duplicateCrewMembers = findDuplicateCrewMembers(mixed.crew, originalsCrews);
          const duplicateCastMembers = findDuplicateCastMembers(mixed.cast, originalsCasts);
          
          if (duplicateCrewMembers.length > 0 || duplicateCastMembers.length > 0) {
            duplicateGroups.push({
              mixed,
              originals,
              duplicateCrewMembers,
              duplicateCastMembers,
              totalMovies: moviesWithSharedDirectors.length
            });
          }
        }
      }
    });

    console.log(`✅ Se encontraron ${duplicateGroups.length} grupos de películas con crew duplicado\n`);
    
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

async function processGroup(group, index, total) {
  console.log('\n\n');
  console.log('╔═════════════════════════════════════════════════════════════════════╗');
  console.log(`║  GRUPO ${index + 1} DE ${total} (${group.totalMovies} películas mezcladas)${' '.repeat(Math.max(0, 30 - group.totalMovies.toString().length))}║`);
  console.log('╚═════════════════════════════════════════════════════════════════════╝');
  
  displayMovie(group.mixed, '⚠️  PELÍCULA MEZCLADA (se limpiará el crew y cast duplicado)', true);
  
  group.originals.forEach((original, idx) => {
    displayMovie(original, `✅ PELÍCULA ORIGINAL #${idx + 1} (se mantendrá intacta)`);
  });
  
  displayDuplicates(group.duplicateCrewMembers, group.duplicateCastMembers);
  
  const crewCount = Array.isArray(group.duplicateCrewMembers) ? group.duplicateCrewMembers.length : 0;
  const castCount = Array.isArray(group.duplicateCastMembers) ? group.duplicateCastMembers.length : 0;
  
  console.log('\n');
  console.log(`${'═'.repeat(70)}`);
  console.log(`\nResumen:`);
  console.log(`  - Películas originales: ${group.originals.length}`);
  console.log(`  - Película mezclada: 1 (ID: ${group.mixed.id})`);
  console.log(`  - Crew duplicado a eliminar: ${crewCount} personas`);
  console.log(`  - Cast duplicado a eliminar: ${castCount} personas`);
  console.log(`  - TOTAL a eliminar: ${crewCount + castCount} registros`);
  
  const answer = await question('\n¿Deseas ELIMINAR los duplicados de esta película? (s/n/q para salir): ');
  
  if (answer.toLowerCase() === 'q') {
    console.log('\n❌ Proceso cancelado por el usuario.\n');
    return 'quit';
  }
  
  if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'y') {
    try {
      let crewDeleted = 0;
      let castDeleted = 0;
      
      if (crewCount > 0) {
        const crewIds = group.duplicateCrewMembers.map(m => m.id);
        const crewResult = await prisma.movieCrew.deleteMany({
          where: { id: { in: crewIds } }
        });
        crewDeleted = crewResult.count;
      }
      
      if (castCount > 0) {
        const castIds = group.duplicateCastMembers.map(m => m.id);
        const castResult = await prisma.movieCast.deleteMany({
          where: { id: { in: castIds } }
        });
        castDeleted = castResult.count;
      }
      
      console.log(`\n✅ Eliminados ${crewDeleted} crew + ${castDeleted} cast = ${crewDeleted + castDeleted} registros totales.\n`);
      return { status: 'cleaned', crewDeleted, castDeleted };
    } catch (error) {
      console.error(`\n❌ Error al eliminar:`, error.message);
      return { status: 'error', crewDeleted: 0, castDeleted: 0 };
    }
  } else {
    console.log('\n⏭️  Saltando este grupo...\n');
    return { status: 'skipped', crewDeleted: 0, castDeleted: 0 };
  }
}

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
  console.log('películas) y limpia automáticamente el crew y cast duplicado.\n');
  console.log('La película con MÁS directores se considera la mezclada y se limpia.\n');

  try {
    const duplicateGroups = await detectDuplicateGroups();
    
    if (duplicateGroups.length === 0) {
      console.log('🎉 No se encontraron películas con crew o cast duplicado para limpiar.\n');
      rl.close();
      return;
    }
    
    console.log(`⚠️  Se encontraron ${duplicateGroups.length} grupos de películas para limpiar.\n`);
    const answer = await question('¿Deseas proceder con la limpieza automática de TODOS los grupos? (s/n): ');
    
    if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Proceso cancelado por el usuario.\n');
      rl.close();
      return;
    }
    
    console.log('\n🚀 Iniciando limpieza automática...\n');
    
    let cleaned = 0;
    let errors = 0;
    let totalCrewDeleted = 0;
    let totalCastDeleted = 0;
    
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      const crewCount = Array.isArray(group.duplicateCrewMembers) ? group.duplicateCrewMembers.length : 0;
      const castCount = Array.isArray(group.duplicateCastMembers) ? group.duplicateCastMembers.length : 0;
      
      console.log(`[${i + 1}/${duplicateGroups.length}] Procesando: "${group.mixed.title}"`);
      console.log(`   - Película mezclada: ID ${group.mixed.id} (${group.mixed.slug})`);
      console.log(`   - Películas originales: ${group.originals.length}`);
      console.log(`   - Crew duplicado: ${crewCount} | Cast duplicado: ${castCount}`);
      
      try {
        let crewDeleted = 0;
        let castDeleted = 0;
        
        if (crewCount > 0) {
          const crewIds = group.duplicateCrewMembers.map(m => m.id);
          const crewResult = await prisma.movieCrew.deleteMany({
            where: { id: { in: crewIds } }
          });
          crewDeleted = crewResult.count;
        }
        
        if (castCount > 0) {
          const castIds = group.duplicateCastMembers.map(m => m.id);
          const castResult = await prisma.movieCast.deleteMany({
            where: { id: { in: castIds } }
          });
          castDeleted = castResult.count;
        }
        
        console.log(`   ✅ Eliminados: ${crewDeleted} crew + ${castDeleted} cast = ${crewDeleted + castDeleted} registros\n`);
        cleaned++;
        totalCrewDeleted += crewDeleted;
        totalCastDeleted += castDeleted;
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errors++;
      }
    }
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                      RESUMEN FINAL                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log(`\n  Total de grupos encontrados: ${duplicateGroups.length}`);
    console.log(`  ✅ Grupos limpiados: ${cleaned}`);
    console.log(`  ❌ Errores: ${errors}`);
    console.log(`  🗑️  Total eliminado:`);
    console.log(`      - Crew duplicado: ${totalCrewDeleted} registros`);
    console.log(`      - Cast duplicado: ${totalCastDeleted} registros`);
    console.log(`      - TOTAL: ${totalCrewDeleted + totalCastDeleted} registros`);
    console.log('\n✨ Proceso completado.\n');

  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();