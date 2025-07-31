// extract-titles-to-json.js
// Script para extraer títulos de películas y guardarlos en JSON

const fs = require('fs').promises;
const path = require('path');

async function extractTitles() {
  try {
    console.log('Leyendo archivo wp_posts.sql...');
    const filePath = path.join(__dirname, '..', 'dumps', 'wp_posts.sql');
    const content = await fs.readFile(filePath, 'utf8');
    
    console.log('Archivo leído, procesando líneas...');
    
    // Dividir por líneas
    const lines = content.split('\n');
    console.log(`Total de líneas: ${lines.length}`);
    
    const movies = [];
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
            const id = parseInt(match[1]);
            const title = match[3]
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .trim();
            
            if (title && title !== '') {
              movies.push({
                wp_id: id,
                title: title,
                slug: `temp-${id}`,
                year: 1900,
                status: 'PUBLISHED'
              });
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
    
    // Guardar en archivo JSON
    const outputPath = path.join(__dirname, '..', 'dumps', 'movies-titles.json');
    await fs.writeFile(outputPath, JSON.stringify(movies, null, 2), 'utf8');
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Películas encontradas: ${movies.length}`);
    console.log(`Archivo guardado en: ${outputPath}`);
    
    // Mostrar las primeras 5 películas como ejemplo
    console.log('\nPrimeras 5 películas:');
    movies.slice(0, 5).forEach(movie => {
      console.log(`- ${movie.title} (ID: ${movie.wp_id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar
extractTitles();