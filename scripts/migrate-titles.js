// migrate-titles.js
// Script para migrar solo los títulos de películas de WordPress a PostgreSQL

const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración de conexión MySQL (ajustar según tu configuración)
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'cinenaci_wp',
  port: 3306
};

// Función para generar slug a partir del título
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
    .replace(/--+/g, '-'); // Reemplazar múltiples guiones con uno solo
}

async function migrateTitles() {
  let connection;
  
  try {
    // Conectar a MySQL
    console.log('Conectando a MySQL...');
    connection = await mysql.createConnection(mysqlConfig);
    console.log('Conexión exitosa a MySQL');

    // Obtener películas de WordPress
    // Asumiendo que el post_type es 'pelicula' o 'movie' (ajustar según tu instalación)
    const query = `
      SELECT 
        p.ID as wp_id,
        p.titulo as title,
        p.slug,
        p.post_status,
        pm_year.meta_value as year
      FROM p
      LEFT JOIN pm pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      WHERE p.post_type = 'pelicula' 
        AND p.post_status IN ('publish', 'draft')
      ORDER BY p.ID
    `;

    console.log('Ejecutando consulta...');
    const [movies] = await connection.execute(query);
    console.log(`Encontradas ${movies.length} películas`);

    // Migrar cada película
    let migrated = 0;
    let errors = 0;

    for (const movie of movies) {
      try {
        // Preparar datos
        const title = movie.title || 'Sin título';
        const year = movie.year ? parseInt(movie.year) : new Date().getFullYear();
        let slug = movie.slug || generateSlug(title);
        
        // Asegurar que el slug sea único
        const existingMovie = await prisma.movie.findUnique({
          where: { slug }
        });
        
        if (existingMovie) {
          slug = `${slug}-${movie.wp_id}`;
        }

        // Mapear status
        let status = 'PUBLISHED';
        if (movie.post_status === 'draft') {
          status = 'DRAFT';
        } else if (movie.post_status === 'trash' || movie.post_status === 'private') {
          status = 'ARCHIVED';
        }

        // Crear película en PostgreSQL
        const newMovie = await prisma.movie.create({
          data: {
            title,
            slug,
            year,
            status,
            // Campos opcionales que llenaremos después
            originalTitle: null,
            releaseDate: null,
            duration: null,
            synopsis: null,
            // Agregar metadatos para rastrear la migración
            metaKeywords: [`wp_id:${movie.wp_id}`]
          }
        });

        console.log(`✓ Migrada: ${title} (${year}) - ID: ${newMovie.id}`);
        migrated++;

      } catch (error) {
        console.error(`✗ Error migrando película ID ${movie.wp_id}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total películas: ${movies.length}`);
    console.log(`Migradas exitosamente: ${migrated}`);
    console.log(`Errores: ${errors}`);

  } catch (error) {
    console.error('Error fatal:', error);
  } finally {
    // Cerrar conexiones
    if (connection) await connection.end();
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateTitles()
  .then(() => {
    console.log('\nMigración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nError en la migración:', error);
    process.exit(1);
  });