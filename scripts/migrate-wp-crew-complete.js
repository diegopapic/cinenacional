// scripts/migrate-wp-crew-complete.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');
const unserialize = require('php-unserialize');

const prisma = new PrismaClient();

function extractPersonId(serializedValue) {
  if (!serializedValue) return null;
  
  try {
    if (serializedValue.startsWith('a:')) {
      const data = unserialize.unserialize(serializedValue);
      if (Array.isArray(data) && data.length > 0) {
        return parseInt(data[0].toString());
      }
      if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0) {
          return parseInt(values[0].toString());
        }
      }
    } else if (!isNaN(serializedValue)) {
      return parseInt(serializedValue);
    }
  } catch (e) {}
  
  return null;
}

async function migrateMovieCrewComplete() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🚀 Iniciando migración COMPLETA del crew...\n');

    // 1. Cargar roles de PostgreSQL
    console.log('📚 Cargando roles...');
    const roles = await prisma.role.findMany({
      select: { id: true, name: true }
    });
    
    const rolesCache = new Map();
    roles.forEach(role => {
      rolesCache.set(role.name.toLowerCase().trim(), role.id);
    });
    console.log(`✅ ${roles.length} roles cargados`);

    // 2. Cargar IDs de películas y personas
    console.log('\n📊 Cargando IDs...');
    
    const movies = await prisma.movie.findMany({
      select: { id: true }
    });
    const movieIds = new Set(movies.map(m => m.id));
    console.log(`  ${movieIds.size} películas en PostgreSQL`);
    
    const people = await prisma.person.findMany({
      select: { id: true }
    });
    const personIds = new Set(people.map(p => p.id));
    console.log(`  ${personIds.size} personas en PostgreSQL`);

    // 3. Obtener TODOS los registros de crew de WordPress
    console.log('\n🔍 Obteniendo datos de crew de WordPress...');
    
    const movieIdsArray = Array.from(movieIds);
    const allCrewData = [];
    
    for (let i = 0; i < movieIdsArray.length; i += 1000) {
      const chunk = movieIdsArray.slice(i, i + 1000);
      if ((i / 1000 + 1) % 5 === 0) {
        console.log(`  Chunk ${i / 1000 + 1}/${Math.ceil(movieIdsArray.length / 1000)}...`);
      }
      
      const [data] = await connection.execute(`
        SELECT 
          post_id as movie_id,
          meta_key,
          meta_value
        FROM wp_postmeta
        WHERE post_id IN (${chunk.join(',')})
        AND meta_key LIKE 'ficha_tecnica_%'
        AND (
          meta_key LIKE '%_persona'
          OR meta_key LIKE '%_rol'
          OR meta_key LIKE '%_acreditado_con_su'
          OR meta_key LIKE '%_comentario'
        )
      `);
      
      allCrewData.push(...data);
    }
    
    console.log(`  ${allCrewData.length} registros encontrados`);

    // 4. Organizar datos
    console.log('\n📋 Organizando datos...');
    
    const movieCrewData = {};
    allCrewData.forEach(row => {
      if (!movieCrewData[row.movie_id]) {
        movieCrewData[row.movie_id] = {};
      }
      movieCrewData[row.movie_id][row.meta_key] = row.meta_value;
    });
    
    console.log(`  ${Object.keys(movieCrewData).length} películas con crew`);

    // 5. Procesar con lógica mejorada
    console.log('\n⚙️ Procesando registros...');
    
    const allCrewToInsert = [];
    const uniqueKeys = new Set();
    const rolesNotFound = new Set();
    
    let stats = {
      normal: 0,
      import: 0,
      duplicates: 0,
      skippedNoRole: 0,
      skippedNoPerson: 0,
      skippedRoleNotFound: 0
    };

    for (const [movieId, data] of Object.entries(movieCrewData)) {
      const movieIdNum = parseInt(movieId);
      
      // Encontrar todos los índices únicos
      const personKeys = Object.keys(data).filter(k => k.endsWith('_persona'));
      const processedIndices = new Set();
      
      for (const personKey of personKeys) {
        const match = personKey.match(/^ficha_tecnica_(.+?)(?:_import)?_(\d+)_persona$/);
        if (!match) continue;
        
        const department = match[1];
        const index = match[2];
        const keyBase = `${department}_${index}`;
        
        if (processedIndices.has(keyBase)) continue;
        processedIndices.add(keyBase);
        
        // Obtener datos normal e import
        const normalPerson = data[`ficha_tecnica_${department}_${index}_persona`];
        const normalRole = data[`ficha_tecnica_${department}_${index}_rol`];
        const normalCredited = data[`ficha_tecnica_${department}_${index}_acreditado_con_su`];
        const normalComment = data[`ficha_tecnica_${department}_${index}_comentario`];
        
        const importPerson = data[`ficha_tecnica_${department}_import_${index}_persona`];
        const importRole = data[`ficha_tecnica_${department}_import_${index}_rol`];
        const importCredited = data[`ficha_tecnica_${department}_import_${index}_acreditado_con_su`];
        
        // Extraer IDs
        const normalPersonId = extractPersonId(normalPerson);
        const importPersonId = extractPersonId(importPerson);
        
        // Decidir qué usar: SIEMPRE preferir normal si existe
        let usePersonId = null;
        let useRole = null;
        let useCredited = null;
        let useComment = null;
        
        if (normalPersonId && normalRole) {
          // Usar datos normales
          usePersonId = normalPersonId;
          useRole = normalRole;
          useCredited = normalCredited;
          useComment = normalComment;
          stats.normal++;
          
          // Si también existe import idéntico, marcar como duplicado
          if (importPersonId === normalPersonId && importRole === normalRole) {
            stats.duplicates++;
          }
        } else if (importPersonId && importRole) {
          // Solo existe import
          usePersonId = importPersonId;
          useRole = importRole;
          useCredited = importCredited;
          useComment = null;
          stats.import++;
        } else {
          // No hay datos válidos
          stats.skippedNoRole++;
          continue;
        }
        
        // Validaciones
        if (!personIds.has(usePersonId)) {
          stats.skippedNoPerson++;
          continue;
        }
        
        const roleId = rolesCache.get(useRole.toLowerCase().trim());
        if (!roleId) {
          rolesNotFound.add(useRole);
          stats.skippedRoleNotFound++;
          continue;
        }
        
        // Evitar duplicados
        const uniqueKey = `${movieIdNum}-${usePersonId}-${roleId}`;
        if (uniqueKeys.has(uniqueKey)) {
          continue;
        }
        uniqueKeys.add(uniqueKey);
        
        // Preparar notas
        let notes = useComment || null;
        if (useCredited && useCredited !== '2' && useCredited !== '1') {
          notes = notes 
            ? `Acreditado como: ${useCredited}. ${notes}` 
            : `Acreditado como: ${useCredited}`;
        }
        
        allCrewToInsert.push({
          movieId: movieIdNum,
          personId: usePersonId,
          roleId: roleId,
          billingOrder: parseInt(index) + 1,
          notes: notes
        });
      }
    }
    
    console.log(`\n📊 Estadísticas de procesamiento:`);
    console.log(`  ✅ Registros de normal: ${stats.normal}`);
    console.log(`  ✅ Registros de import: ${stats.import}`);
    console.log(`  📦 Duplicados detectados: ${stats.duplicates}`);
    console.log(`  ⏭️  Sin rol: ${stats.skippedNoRole}`);
    console.log(`  ⏭️  Persona no existe: ${stats.skippedNoPerson}`);
    console.log(`  ⏭️  Rol no encontrado: ${stats.skippedRoleNotFound}`);
    console.log(`  🎯 Total a insertar: ${allCrewToInsert.length}`);

    if (rolesNotFound.size > 0) {
      console.log(`\n⚠️  ${rolesNotFound.size} roles aún no encontrados:`);
      Array.from(rolesNotFound).slice(0, 10).forEach(r => console.log(`  - ${r}`));
      if (rolesNotFound.size > 10) {
        console.log(`  ... y ${rolesNotFound.size - 10} más`);
      }
    }

    // 6. Limpiar e insertar usando transacción
    if (allCrewToInsert.length > 0) {
      console.log('\n🗑️  Limpiando tabla movie_crew...');
      await prisma.movieCrew.deleteMany({});
      
      console.log('💾 Insertando registros...');
      
      const BATCH_SIZE = 1000; // Prisma maneja bien batches más grandes
      let inserted = 0;
      
      for (let i = 0; i < allCrewToInsert.length; i += BATCH_SIZE) {
        const batch = allCrewToInsert.slice(i, i + BATCH_SIZE);
        
        try {
          const result = await prisma.movieCrew.createMany({
            data: batch,
            skipDuplicates: true
          });
          
          inserted += result.count;
          if (inserted % 5000 === 0) {
            console.log(`  ${inserted} registros insertados...`);
          }
        } catch (error) {
          console.error(`❌ Error en batch ${i / BATCH_SIZE + 1}:`, error.message);
        }
      }
      
      console.log(`\n✅ ${inserted} registros insertados exitosamente`);
    }

    // 7. Verificación final
    const totalCount = await prisma.movieCrew.count();
    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log(`📊 Total final en movie_crew: ${totalCount}`);
    
    // Estadísticas adicionales
    const crewByRole = await prisma.movieCrew.groupBy({
      by: ['roleId'],
      _count: true,
      orderBy: {
        _count: {
          roleId: 'desc'
        }
      },
      take: 10
    });
    
    console.log('\n📈 Top 10 roles más usados:');
    for (const item of crewByRole) {
      const role = await prisma.role.findUnique({
        where: { id: item.roleId },
        select: { name: true }
      });
      console.log(`  ${role?.name}: ${item._count} usos`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    await prisma.$disconnect();
  }
}

migrateMovieCrewComplete();