require('dotenv').config();
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración de MySQL (WordPress)
const mysqlConfig = {
  host: process.env.WORDPRESS_DB_HOST || 'localhost',
  user: process.env.WORDPRESS_DB_USER || 'root',
  password: process.env.WORDPRESS_DB_PASSWORD || '',
  database: process.env.WORDPRESS_DB_NAME || 'wordpress_cine',
  charset: 'utf8mb4'
};

// Categorías de ficha técnica (crew y cast)
const CREW_CATEGORIES = [
  'direccion',
  'direccion_de_arte',
  'fotografia',
  'guion',
  'montaje',
  'musica',
  'otros',
  'produccion',
  'sonido',
  'animacion',
  'arte',
  'reparto' // cast
];

// Función para deserializar valores de PHP
function unserializePHP(str) {
  if (!str || str === '') return null;
  
  // Pattern para arrays serializados: a:1:{i:0;s:6:"158744";}
  const match = str.match(/s:\d+:"(\d+)"/);
  if (match && match[1]) {
    return parseInt(match[1]);
  }
  
  return null;
}

// Función para normalizar nombres (quitar acentos, convertir a minúsculas)
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Función principal
async function migrateAlternativeNamesInCrew() {
  let mysqlConnection;
  
  try {
    console.log('🚀 Iniciando migración de nombres alternativos en crew/cast...\n');
    
    // Paso 1: Verificar y agregar el campo alternative_name_id a movie_crew
    console.log('📋 Paso 1: Verificando estructura de movie_crew...');
    
    try {
      // Intentar agregar la columna (si ya existe, dará error y lo ignoramos)
      await prisma.$executeRaw`
        ALTER TABLE movie_crew 
        ADD COLUMN alternative_name_id INTEGER;
      `;
      console.log('✅ Campo alternative_name_id agregado a movie_crew');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('ℹ️  Campo alternative_name_id ya existe');
      } else {
        throw error;
      }
    }
    
    // Agregar foreign key
    try {
      await prisma.$executeRaw`
        ALTER TABLE movie_crew 
        ADD CONSTRAINT movie_crew_alternative_name_id_fkey 
        FOREIGN KEY (alternative_name_id) 
        REFERENCES person_alternative_names(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `;
      console.log('✅ Foreign key agregada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Foreign key ya existe');
      } else {
        // Ignorar si ya existe
        console.log('⚠️  Foreign key: ' + error.message.substring(0, 100));
      }
    }
    
    // Crear índice
    try {
      await prisma.$executeRaw`
        CREATE INDEX movie_crew_alternative_name_id_idx 
        ON movie_crew(alternative_name_id);
      `;
      console.log('✅ Índice creado\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Índice ya existe\n');
      } else {
        console.log('⚠️  Índice: ' + error.message.substring(0, 100) + '\n');
      }
    }
    
    // Paso 2: Conectar a MySQL
    console.log('📋 Paso 2: Conectando a WordPress MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a WordPress\n');
    
    // Paso 3: Obtener todos los nombres alternativos de PostgreSQL para hacer el match
    console.log('📋 Paso 3: Cargando nombres alternativos de PostgreSQL...');
    const alternativeNames = await prisma.person_alternative_names.findMany({
      include: {
        person: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });
    
    console.log(`✅ ${alternativeNames.length} nombres alternativos cargados\n`);
    
    // Crear índice de búsqueda por person_id y nombre normalizado
    const alternativeNamesIndex = new Map();
    alternativeNames.forEach(alt => {
      const fullName = `${alt.first_name || ''} ${alt.last_name || ''}`.trim();
      const normalizedName = normalizeName(fullName);
      
      const key = `${alt.person_id}_${normalizedName}`;
      alternativeNamesIndex.set(key, alt.id);
    });
    
    console.log(`✅ Índice de búsqueda creado\n`);
    
    // Paso 4: Procesar cada categoría de crew/cast
    console.log('📋 Paso 4: Procesando crew/cast de WordPress...\n');
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalNotFound = 0;
    let totalErrors = 0;
    
    const notFoundDetails = [];
    const updateDetails = [];
    
    for (const category of CREW_CATEGORIES) {
      console.log(`\n🎬 Procesando categoría: ${category}`);
      
      // Buscar todos los registros de esta categoría con nombres alternativos
      const [rows] = await mysqlConnection.execute(`
        SELECT 
          pm1.post_id as movie_id,
          pm1.meta_key as persona_key,
          pm1.meta_value as persona_value,
          pm2.meta_value as acreditado_value
        FROM wp_postmeta pm1
        JOIN wp_postmeta pm2 
          ON pm1.post_id = pm2.post_id 
          AND pm2.meta_key = REPLACE(pm1.meta_key, '_persona', '_acreditado_con_su')
        WHERE pm1.meta_key LIKE ?
          AND pm1.meta_key LIKE '%_persona'
          AND pm2.meta_value != ''
          AND pm2.meta_value != '2'
        ORDER BY pm1.post_id, pm1.meta_key
      `, [`ficha_tecnica_${category}%`]);
      
      console.log(`   Encontrados ${rows.length} registros con nombres alternativos`);
      
      for (const row of rows) {
        totalProcessed++;
        
        try {
          // Deserializar person_id
          const personId = unserializePHP(row.persona_value);
          if (!personId) {
            console.log(`   ⚠️  No se pudo deserializar person_id: ${row.persona_value}`);
            totalErrors++;
            continue;
          }
          
          const movieId = row.movie_id;
          const creditedAs = row.acreditado_value;
          
          // Buscar el alternative_name_id correspondiente
          const normalizedCredited = normalizeName(creditedAs);
          const searchKey = `${personId}_${normalizedCredited}`;
          const alternativeNameId = alternativeNamesIndex.get(searchKey);
          
          if (!alternativeNameId) {
            totalNotFound++;
            notFoundDetails.push({
              movieId,
              personId,
              creditedAs,
              category
            });
            continue;
          }
          
          // Verificar que existe el registro en movie_crew
          const crewRecord = await prisma.movie_crew.findFirst({
            where: {
              movie_id: movieId,
              person_id: personId
            }
          });
          
          if (!crewRecord) {
            console.log(`   ⚠️  No existe en movie_crew: película ${movieId}, persona ${personId}`);
            totalNotFound++;
            continue;
          }
          
          // Actualizar con el alternative_name_id
          await prisma.movie_crew.update({
            where: {
              id: crewRecord.id
            },
            data: {
              alternative_name_id: alternativeNameId
            }
          });
          
          totalUpdated++;
          updateDetails.push({
            movieId,
            personId,
            creditedAs,
            alternativeNameId,
            category
          });
          
          if (totalUpdated % 50 === 0) {
            console.log(`   ✅ Actualizados: ${totalUpdated}`);
          }
          
        } catch (error) {
          totalErrors++;
          console.log(`   ❌ Error procesando: película ${row.movie_id}, error: ${error.message}`);
        }
      }
    }
    
    // Paso 5: Reporte final
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE FINAL');
    console.log('='.repeat(80));
    console.log(`Total procesados:     ${totalProcessed}`);
    console.log(`Total actualizados:   ${totalUpdated} ✅`);
    console.log(`No encontrados:       ${totalNotFound} ⚠️`);
    console.log(`Errores:              ${totalErrors} ❌`);
    console.log('='.repeat(80));
    
    // Guardar detalles en archivos JSON
    if (updateDetails.length > 0) {
      const fs = require('fs');
      fs.writeFileSync(
        'migration-crew-alternative-names-updated.json',
        JSON.stringify({ total: totalUpdated, details: updateDetails }, null, 2)
      );
      console.log('\n📄 Detalles de actualizaciones guardados en: migration-crew-alternative-names-updated.json');
    }
    
    if (notFoundDetails.length > 0) {
      const fs = require('fs');
      fs.writeFileSync(
        'migration-crew-alternative-names-not-found.json',
        JSON.stringify({ total: totalNotFound, details: notFoundDetails }, null, 2)
      );
      console.log('📄 Detalles de no encontrados guardados en: migration-crew-alternative-names-not-found.json');
    }
    
    console.log('\n✅ Migración completada exitosamente!\n');
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    // Cerrar conexiones
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    await prisma.$disconnect();
  }
}

// Ejecutar script
migrateAlternativeNamesInCrew()
  .then(() => {
    console.log('🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });