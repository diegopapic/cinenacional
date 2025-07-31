// migrate-titles-simple.js
// Script minimalista para migrar SOLO títulos de películas

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateTitles() {
  try {
    console.log('Leyendo archivo wp_posts.sql...');
    const filePath = path.join(__dirname, '..', 'dumps', 'wp_posts.sql');
    const content = await fs.readFile(filePath, 'utf8');
    
    console.log('Archivo leído, procesando líneas...');
    
    // Dividir por líneas
    const lines = content.split('\n');
    console.log(`Total de líneas: ${lines.length}`);
    
    let count = 0;
    let migrated = 0;
    let currentValues = '';
    let isInInsert = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detectar inicio de INSERT
      if (line.includes('INSERT INTO `wp_posts`')) {
        isInInsert = true;
        currentValues = line;
        continue;
      }
      
      // Si estamos en un INSERT, acumular líneas
      if (isInInsert) {
        currentValues += ' ' + line;
        
        // Si la línea termina con ; es el final del INSERT
        if (line.trim().endsWith(';')) {
          // Procesar este INSERT completo
          const matches = currentValues.matchAll(/\((\d+),\s*\d+,\s*'[^']*?',\s*'[^']*?',\s*'([^']*?)',\s*'([^']*?)'[^)]*?'pelicula'/g);
          
          for (const match of matches) {
            count++;
            const id = match[1];
            const title = match[3]
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .trim();
            
            if (title && title !== '') {
              try {
                const slug = `temp-${id}`;
                
                const movie = await prisma.movie.create({
                  data: {
                    title: title,
                    slug: slug,
                    year: 1900,
                    status: 'PUBLISHED'
                  }
                });
                
                console.log(`✓ ${movie.id}: ${title}`);
                migrated++;
                
              } catch (error) {
                console.error(`✗ Error con "${title}": ${error.message}`);
              }
            }
          }
          
          // Resetear para el próximo INSERT
          isInInsert = false;
          currentValues = '';
        }
      }
      
      // Mostrar progreso cada 10000 líneas
      if (i % 10000 === 0 && i > 0) {
        console.log(`Procesadas ${i} líneas...`);
      }
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Películas encontradas: ${count}`);
    console.log(`Películas migradas: ${migrated}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
migrateTitles();