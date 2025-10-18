/**
 * Script para detectar películas con títulos duplicados Y directores compartidos
 * Exporta resultados a CSV con: id, título, año, directores, slug
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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
 * Obtiene los nombres de los directores de una película (para mostrar)
 */
function getDirectors(crew) {
  if (!crew || crew.length === 0) return 'Sin director';
  
  // Filtrar solo los directores (roleId = 2)
  const directors = crew
    .filter(member => member.roleId === 2)
    .map(member => getPersonName(member.person))
    .filter(name => name !== 'Desconocido');
  
  return directors.length > 0 ? directors.join(', ') : 'Sin director';
}

/**
 * Obtiene los IDs de personas que son directores de una película
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
 * Normaliza un título para comparación (minúsculas, sin espacios extras)
 */
function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Detecta películas duplicadas por título Y directores compartidos
 */
async function detectDuplicateMovies() {
  console.log('🔍 Buscando películas duplicadas...\n');

  try {
    // Obtener todas las películas con sus relaciones necesarias
    const movies = await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        year: true,
        releaseYear: true,
        slug: true,
        crew: {
          select: {
            roleId: true,
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

    console.log(`📊 Total de películas en la base de datos: ${movies.length}\n`);

    // Agrupar películas por título normalizado
    const titleGroups = new Map();
    
    movies.forEach(movie => {
      const normalizedTitle = normalizeTitle(movie.title);
      
      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      
      titleGroups.get(normalizedTitle).push(movie);
    });

    // Filtrar solo los grupos con duplicados que comparten directores
    const duplicates = [];
    let duplicatePairs = new Set(); // Para evitar duplicados

    titleGroups.forEach((movies, normalizedTitle) => {
      if (movies.length > 1) {
        // Buscar pares de películas que comparten directores
        for (let i = 0; i < movies.length; i++) {
          for (let j = i + 1; j < movies.length; j++) {
            const movie1 = movies[i];
            const movie2 = movies[j];
            const movie1Directors = getDirectorIds(movie1.crew);
            const movie2Directors = getDirectorIds(movie2.crew);
            
            // Solo si comparten al menos un director
            if (shareDirectors(movie1Directors, movie2Directors)) {
              // Crear identificadores únicos para evitar duplicados
              const id1 = movie1.id;
              const id2 = movie2.id;
              
              // Agregar ambas películas del par
              if (!duplicatePairs.has(id1)) {
                duplicatePairs.add(id1);
                
                const movieYear = movie1.year && movie1.year !== 0 
                  ? movie1.year 
                  : (movie1.releaseYear || 'Sin año');

                duplicates.push({
                  id: movie1.id,
                  title: movie1.title,
                  year: movieYear,
                  directors: getDirectors(movie1.crew),
                  slug: movie1.slug,
                  groupTitle: normalizedTitle
                });
              }
              
              if (!duplicatePairs.has(id2)) {
                duplicatePairs.add(id2);
                
                const movieYear = movie2.year && movie2.year !== 0 
                  ? movie2.year 
                  : (movie2.releaseYear || 'Sin año');

                duplicates.push({
                  id: movie2.id,
                  title: movie2.title,
                  year: movieYear,
                  directors: getDirectors(movie2.crew),
                  slug: movie2.slug,
                  groupTitle: normalizedTitle
                });
              }
            }
          }
        }
      }
    });

    const totalDuplicateMovies = duplicatePairs.size;
    // Contar grupos únicos
    const uniqueGroups = new Set(duplicates.map(d => d.groupTitle));
    const duplicateGroupCount = uniqueGroups.size;

    console.log(`✅ Análisis completado:`);
    console.log(`   - Grupos de títulos duplicados con directores compartidos: ${duplicateGroupCount}`);
    console.log(`   - Total de películas duplicadas (mismo título + director): ${totalDuplicateMovies}`);
    console.log(`   - Películas únicas o con directores diferentes: ${movies.length - totalDuplicateMovies}\n`);

    if (duplicates.length === 0) {
      console.log('🎉 No se encontraron películas duplicadas con directores compartidos.\n');
      return [];
    }

    // Ordenar por título normalizado y luego por año
    duplicates.sort((a, b) => {
      if (a.groupTitle !== b.groupTitle) {
        return a.groupTitle.localeCompare(b.groupTitle);
      }
      const yearA = typeof a.year === 'number' ? a.year : 9999;
      const yearB = typeof b.year === 'number' ? b.year : 9999;
      return yearA - yearB;
    });

    return duplicates;

  } catch (error) {
    console.error('❌ Error al buscar películas duplicadas:', error);
    throw error;
  }
}

/**
 * Exporta los resultados a CSV
 */
function exportToCSV(duplicates) {
  if (duplicates.length === 0) {
    console.log('⚠️  No hay datos para exportar.\n');
    return;
  }

  // Crear el contenido del CSV
  const headers = ['ID', 'Título', 'Año', 'Director(es)', 'Slug'];
  const rows = [headers.join(',')];

  duplicates.forEach(movie => {
    const row = [
      movie.id,
      `"${movie.title.replace(/"/g, '""')}"`, // Escapar comillas dobles
      movie.year,
      `"${movie.directors.replace(/"/g, '""')}"`, // Escapar comillas dobles
      movie.slug
    ];
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');

  // Crear directorio de exports si no existe
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // Nombre del archivo con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `duplicate-movies-${timestamp}.csv`;
  const filepath = path.join(exportsDir, filename);

  // Escribir archivo
  fs.writeFileSync(filepath, csvContent, 'utf8');

  console.log(`📄 CSV exportado exitosamente:`);
  console.log(`   Archivo: ${filename}`);
  console.log(`   Ubicación: ${filepath}`);
  console.log(`   Registros: ${duplicates.length}\n`);

  return filepath;
}

/**
 * Muestra un resumen de los duplicados encontrados
 */
function showSummary(duplicates) {
  if (duplicates.length === 0) return;

  console.log('📋 RESUMEN DE DUPLICADOS:\n');

  // Agrupar para el resumen
  const groups = new Map();
  duplicates.forEach(movie => {
    if (!groups.has(movie.groupTitle)) {
      groups.set(movie.groupTitle, []);
    }
    groups.get(movie.groupTitle).push(movie);
  });

  // Mostrar los primeros 10 grupos como ejemplo
  let count = 0;
  for (const [title, movies] of groups) {
    if (count >= 10) {
      console.log(`\n... y ${groups.size - 10} grupos más.\n`);
      break;
    }
    
    console.log(`\n"${movies[0].title}" (${movies.length} películas):`);
    movies.forEach(movie => {
      console.log(`  - ${movie.year} | ${movie.directors} | ID: ${movie.id}`);
    });
    
    count++;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DETECTOR DE PELÍCULAS DUPLICADAS');
  console.log('  (Mismo título + Directores compartidos)');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Detectar duplicados
    const duplicates = await detectDuplicateMovies();

    if (duplicates.length > 0) {
      // Mostrar resumen
      showSummary(duplicates);

      // Exportar a CSV
      exportToCSV(duplicates);
    }

    console.log('✨ Proceso completado.\n');

  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
main();