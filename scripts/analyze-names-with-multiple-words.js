/**
 * Script para analizar nombres y apellidos con múltiples palabras
 * Detecta posibles divisiones incorrectas en la tabla people
 * 
 * Uso: node scripts/analyze-names-with-multiple-words.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeNames() {
  console.log('🔍 Analizando nombres y apellidos con múltiples palabras...\n');

  try {
    // Obtener todas las personas
    const people = await prisma.person.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        _count: {
          select: {
            castRoles: true,
            crewRoles: true,
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📊 Total de personas en la BD: ${people.length}\n`);

    // Función para contar palabras (ignora espacios múltiples)
    const countWords = (str) => {
      if (!str) return 0;
      return str.trim().split(/\s+/).length;
    };

    // Categorizar personas
    const categories = {
      firstNameMultiple: [],
      lastNameMultiple: [],
      bothMultiple: [],
      suspicious: []
    };

    people.forEach(person => {
      const firstNameWords = countWords(person.firstName);
      const lastNameWords = countWords(person.lastName);
      const totalRoles = person._count.castRoles + person._count.crewRoles;

      const personData = {
        id: person.id,
        firstName: person.firstName || '(vacío)',
        lastName: person.lastName || '(vacío)',
        slug: person.slug,
        firstNameWords,
        lastNameWords,
        totalRoles
      };

      // Casos sospechosos (solo firstName o solo lastName muy largo)
      if (firstNameWords > 3 && lastNameWords === 0) {
        categories.suspicious.push({ ...personData, issue: 'Solo firstName largo' });
      } else if (lastNameWords > 3 && firstNameWords === 0) {
        categories.suspicious.push({ ...personData, issue: 'Solo lastName largo' });
      }

      // Categorizar por múltiples palabras
      if (firstNameWords > 3 && lastNameWords > 3) {
        categories.bothMultiple.push(personData);
      } else if (firstNameWords > 3) {
        categories.firstNameMultiple.push(personData);
      } else if (lastNameWords > 3) {
        categories.lastNameMultiple.push(personData);
      }
    });

    // Mostrar resultados
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🚨 CASOS SOSPECHOSOS (probablemente mal divididos)\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (categories.suspicious.length > 0) {
      categories.suspicious.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`Nombre: ${p.firstName}`);
        console.log(`Apellido: ${p.lastName}`);
        console.log(`Palabras: ${p.firstNameWords} / ${p.lastNameWords}`);
        console.log(`Slug: ${p.slug}`);
        console.log(`Roles: ${p.totalRoles}`);
        console.log(`Problema: ${p.issue}`);
        console.log('-----------------------------------------------------------');
      });
      console.log(`\nTotal casos sospechosos: ${categories.suspicious.length}\n`);
    } else {
      console.log('✅ No se encontraron casos sospechosos\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 NOMBRES con más de 3 palabras\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (categories.firstNameMultiple.length > 0) {
      categories.firstNameMultiple.forEach(p => {
        console.log(`ID: ${p.id} | Palabras: ${p.firstNameWords}`);
        console.log(`Nombre: ${p.firstName}`);
        console.log(`Apellido: ${p.lastName}`);
        console.log(`Roles: ${p.totalRoles}`);
        console.log('-----------------------------------------------------------');
      });
      console.log(`\nTotal: ${categories.firstNameMultiple.length}\n`);
    } else {
      console.log('✅ No se encontraron nombres con más de 3 palabras\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 APELLIDOS con más de 3 palabras\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (categories.lastNameMultiple.length > 0) {
      categories.lastNameMultiple.forEach(p => {
        console.log(`ID: ${p.id} | Palabras: ${p.lastNameWords}`);
        console.log(`Nombre: ${p.firstName}`);
        console.log(`Apellido: ${p.lastName}`);
        console.log(`Roles: ${p.totalRoles}`);
        console.log('-----------------------------------------------------------');
      });
      console.log(`\nTotal: ${categories.lastNameMultiple.length}\n`);
    } else {
      console.log('✅ No se encontraron apellidos con más de 3 palabras\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 AMBOS con más de 3 palabras\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (categories.bothMultiple.length > 0) {
      categories.bothMultiple.forEach(p => {
        console.log(`ID: ${p.id} | Palabras: ${p.firstNameWords} / ${p.lastNameWords}`);
        console.log(`Nombre: ${p.firstName}`);
        console.log(`Apellido: ${p.lastName}`);
        console.log(`Roles: ${p.totalRoles}`);
        console.log('-----------------------------------------------------------');
      });
      console.log(`\nTotal: ${categories.bothMultiple.length}\n`);
    } else {
      console.log('✅ No se encontraron casos con ambos largos\n');
    }

    // Resumen final
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN GENERAL');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total personas: ${people.length}`);
    console.log(`Casos sospechosos: ${categories.suspicious.length}`);
    console.log(`Nombres con >3 palabras: ${categories.firstNameMultiple.length}`);
    console.log(`Apellidos con >3 palabras: ${categories.lastNameMultiple.length}`);
    console.log(`Ambos con >3 palabras: ${categories.bothMultiple.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Exportar a JSON si hay casos para revisar
    const totalCases = categories.suspicious.length + 
                       categories.firstNameMultiple.length + 
                       categories.lastNameMultiple.length + 
                       categories.bothMultiple.length;

    if (totalCases > 0) {
      const fs = require('fs');
      const outputFile = 'scripts/names-analysis-result.json';
      
      fs.writeFileSync(outputFile, JSON.stringify({
        summary: {
          totalPeople: people.length,
          suspicious: categories.suspicious.length,
          firstNameMultiple: categories.firstNameMultiple.length,
          lastNameMultiple: categories.lastNameMultiple.length,
          bothMultiple: categories.bothMultiple.length
        },
        cases: categories
      }, null, 2));

      console.log(`💾 Resultados exportados a: ${outputFile}`);
      console.log('   Puedes revisar este archivo para análisis detallado\n');
    }

  } catch (error) {
    console.error('❌ Error al analizar nombres:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar análisis
analyzeNames()
  .then(() => {
    console.log('✅ Análisis completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });