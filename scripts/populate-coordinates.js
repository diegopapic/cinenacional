const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============= CONFIGURACIÓN =============
// Cambiar a true para usar Google en lugar de OpenStreetMap
const USE_GOOGLE = false; 

// Si USE_GOOGLE = true, agregar tu API key aquí
const GOOGLE_API_KEY = 'AIzaSyAz9JXlje4MNzjp2JkvCEEedGa2VT6UiQs'; 
// Obtener API key en: https://console.cloud.google.com/
// ==========================================

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para obtener coordenadas con GOOGLE
async function getCoordinatesGoogle(searchQuery) {
  try {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'AIzaSyAz9JXlje4MNzjp2JkvCEEedGa2VT6UiQs') {
      throw new Error('Google API Key no configurada');
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&language=es&region=ar`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Verificar estado de la respuesta
    if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('⚠️ Límite de Google API excedido');
      return null;
    }
    
    if (data.status === 'REQUEST_DENIED') {
      console.error('⚠️ API Key inválida o sin permisos');
      return null;
    }
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        displayName: data.results[0].formatted_address,
        confidence: data.results[0].geometry.location_type // ROOFTOP, GEOMETRIC_CENTER, etc
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error con Google:`, error.message);
    return null;
  }
}

// Función para obtener coordenadas con NOMINATIM (OpenStreetMap)
async function getCoordinatesNominatim(searchQuery) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=es`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CineNacional/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        confidence: data[0].importance // 0-1, mayor es mejor
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error con Nominatim:`, error.message);
    return null;
  }
}

// Función unificada que usa el servicio configurado
async function getCoordinates(searchQuery) {
  if (USE_GOOGLE) {
    return await getCoordinatesGoogle(searchQuery);
  } else {
    return await getCoordinatesNominatim(searchQuery);
  }
}

// Función principal mejorada
async function populateCoordinates() {
  console.log('\n🌍 ACTUALIZACIÓN DE COORDENADAS PARA CIUDADES\n');
  console.log(`📡 Servicio: ${USE_GOOGLE ? '🌐 Google Geocoding API' : '🗺️ OpenStreetMap (Nominatim)'}`);
  
  if (USE_GOOGLE) {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'TU_API_KEY_AQUI') {
      console.log('\n❌ ERROR: Google API Key no configurada');
      console.log('   1. Obtén una API key en: https://console.cloud.google.com/');
      console.log('   2. Edita este script y agrega tu key en GOOGLE_API_KEY');
      console.log('   3. O cambia USE_GOOGLE a false para usar OpenStreetMap\n');
      return;
    }
    console.log('✅ Google API Key configurada');
    console.log('💰 Costo estimado: $0.005 por geocoding (primeros $200 gratis/mes)\n');
  }
  
  console.log('='.repeat(60));
  
  try {
    // Obtener todas las ciudades sin coordenadas con jerarquía completa
    const cities = await prisma.location.findMany({
      where: {
        AND: [
          {
            children: {
              none: {}
            }
          },
          {
            OR: [
              { latitude: null },
              { longitude: null }
            ]
          }
        ]
      },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`\n📍 Encontradas ${cities.length} ciudades sin coordenadas`);
    
    if (cities.length === 0) {
      console.log('✅ Todas las ciudades ya tienen coordenadas');
      return;
    }
    
    // Calcular tiempo estimado
    const delayPerRequest = USE_GOOGLE ? 100 : 1100; // ms
    const estimatedMinutes = Math.ceil(cities.length * delayPerRequest / 60000);
    console.log(`⏱️  Tiempo estimado: ${estimatedMinutes} minutos`);
    console.log(`⚡ Velocidad: ${USE_GOOGLE ? '10 req/seg (Google)' : '1 req/seg (Nominatim)'}\n`);
    
    console.log('='.repeat(60));
    console.log('\nPROCESANDO:\n');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundList = [];
    const startTime = Date.now();
    
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      
      // Construir queries de búsqueda en orden de preferencia
      const queries = [];
      
      // Query 1: Jerarquía completa
      if (city.parent) {
        let hierarchy = [city.name];
        
        if (city.parent) {
          hierarchy.push(city.parent.name);
          if (city.parent.parent) {
            hierarchy.push(city.parent.parent.name);
            if (city.parent.parent.parent) {
              hierarchy.push(city.parent.parent.parent.name);
            }
          }
        }
        
        // Agregar diferentes combinaciones
        if (hierarchy.length >= 3) {
          queries.push(hierarchy.join(', ')); // Ciudad, Provincia, País
          queries.push(`${hierarchy[0]}, ${hierarchy[hierarchy.length - 1]}`); // Ciudad, País
        } else if (hierarchy.length === 2) {
          queries.push(hierarchy.join(', ')); // Ciudad, País/Provincia
        }
      }
      
      // Query 2: Solo nombre (para ciudades muy conocidas)
      queries.push(city.name);
      
      // Query 3: Simplificar nombres con "de"
      if (city.name.includes(' de ')) {
        const simplified = city.name.split(' de ')[0];
        if (city.parent?.name) {
          queries.push(`${simplified}, ${city.parent.name}`);
        }
      }
      
      // Mostrar progreso
      const progress = Math.round((i + 1) / cities.length * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const remaining = Math.round((cities.length - i - 1) * delayPerRequest / 1000);
      
      process.stdout.write(
        `[${i + 1}/${cities.length}] ${progress}% - ${city.name.padEnd(30)} `
      );
      
      // Delay entre requests
      if (i > 0) {
        await delay(delayPerRequest);
      }
      
      let coords = null;
      let queryUsed = '';
      
      // Probar cada query hasta encontrar resultado
      for (const query of queries) {
        coords = await getCoordinates(query);
        if (coords) {
          queryUsed = query;
          break;
        }
        
        // Si estamos usando Google y no encontramos con la primera query, 
        // probablemente no lo encontraremos (Google es muy bueno)
        if (USE_GOOGLE && queries.indexOf(query) === 0) {
          break;
        }
        
        // Pequeña pausa entre intentos si no usamos Google
        if (!USE_GOOGLE) {
          await delay(200);
        }
      }
      
      if (coords) {
        // Actualizar en la base de datos
        await prisma.location.update({
          where: { id: city.id },
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude
          }
        });
        
        const conf = coords.confidence ? 
          (USE_GOOGLE ? coords.confidence : `${Math.round(coords.confidence * 100)}%`) : '';
        
        console.log(`✅ (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) ${conf}`);
        updatedCount++;
      } else {
        console.log(`❌ No encontrado`);
        
        // Guardar para análisis
        notFoundList.push({
          id: city.id,
          name: city.name,
          parent: city.parent?.name || null,
          grandParent: city.parent?.parent?.name || null,
          country: city.parent?.parent?.parent?.name || city.parent?.parent?.name || city.parent?.name || null
        });
        notFoundCount++;
      }
      
      // Mostrar estadísticas cada 100 procesadas
      if ((i + 1) % 100 === 0) {
        console.log(`\n--- Checkpoint: ${i + 1}/${cities.length} procesadas ---`);
        console.log(`    ✅ Encontradas: ${updatedCount} | ❌ No encontradas: ${notFoundCount}`);
        console.log(`    ⏱️ Tiempo transcurrido: ${Math.round(elapsed / 60)} min\n`);
      }
    }
    
    // Resumen final
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN FINAL:');
    console.log('='.repeat(60));
    console.log(`   ✅ Coordenadas agregadas: ${updatedCount}`);
    console.log(`   ❌ No encontradas: ${notFoundCount}`);
    console.log(`   📍 Total procesadas: ${cities.length}`);
    console.log(`   ⏱️ Tiempo total: ${Math.round(totalTime / 60)} minutos`);
    console.log(`   ⚡ Velocidad promedio: ${(cities.length / totalTime * 60).toFixed(1)} ciudades/min`);
    
    if (USE_GOOGLE && updatedCount > 0) {
      const cost = updatedCount * 0.005;
      console.log(`   💰 Costo estimado: $${cost.toFixed(2)} USD`);
    }
    
    // Guardar las no encontradas
    if (notFoundList.length > 0) {
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `./scripts/cities-not-found-${USE_GOOGLE ? 'google' : 'nominatim'}-${timestamp}.json`;
      
      fs.writeFileSync(filename, JSON.stringify({
        service: USE_GOOGLE ? 'Google' : 'Nominatim',
        date: new Date().toISOString(),
        total: notFoundList.length,
        cities: notFoundList
      }, null, 2));
      
      console.log(`\n📄 Ciudades no encontradas guardadas en:\n   ${filename}`);
      
      // Mostrar las primeras 5
      console.log('\nPrimeras ciudades no encontradas:');
      notFoundList.slice(0, 5).forEach(city => {
        const location = [city.name, city.parent, city.country].filter(Boolean).join(' > ');
        console.log(`   - ${location}`);
      });
      
      if (notFoundList.length > 5) {
        console.log(`   ... y ${notFoundList.length - 5} más`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Verificar estado actual
async function checkStatus() {
  console.log('\n📊 ESTADO ACTUAL DE COORDENADAS\n');
  console.log('='.repeat(60));
  
  try {
    const total = await prisma.location.count({
      where: {
        children: {
          none: {}
        }
      }
    });
    
    const withCoords = await prisma.location.count({
      where: {
        children: {
          none: {}
        },
        NOT: {
          OR: [
            { latitude: null },
            { longitude: null }
          ]
        }
      }
    });
    
    const withoutCoords = total - withCoords;
    const percentage = total > 0 ? Math.round(withCoords / total * 100) : 0;
    
    console.log(`\n📍 Total de ciudades (sin hijos): ${total}`);
    console.log(`✅ Con coordenadas: ${withCoords}`);
    console.log(`❌ Sin coordenadas: ${withoutCoords}`);
    console.log(`📊 Porcentaje completado: ${percentage}%`);
    
    // Mostrar un gráfico de barras simple
    const barLength = 40;
    const filled = Math.round(barLength * percentage / 100);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(`\n   [${bar}] ${percentage}%`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Menú principal
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('   📍 GENERADOR DE COORDENADAS GEOGRÁFICAS');
  console.log('='.repeat(60));
  
  console.log(`\n⚙️  CONFIGURACIÓN ACTUAL:`);
  console.log(`   Servicio: ${USE_GOOGLE ? '🌐 Google Geocoding' : '🗺️ OpenStreetMap'}`);
  
  if (USE_GOOGLE) {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'TU_API_KEY_AQUI') {
      console.log(`   API Key: ❌ NO CONFIGURADA`);
      console.log(`\n   ⚠️ Para usar Google:`);
      console.log(`   1. Obtén una key en: https://console.cloud.google.com/`);
      console.log(`   2. Edita este archivo y agrega tu key`);
      console.log(`   3. O cambia USE_GOOGLE a false\n`);
    } else {
      console.log(`   API Key: ✅ Configurada (${GOOGLE_API_KEY.substring(0, 8)}...)`);
      console.log(`   Costo: $0.005 USD por geocoding`);
      console.log(`   Gratis: Primeros $200 USD/mes (~40,000 requests)`);
    }
  } else {
    console.log(`   Costo: Gratis`);
    console.log(`   Límite: 1 request/segundo`);
    console.log(`   Nota: Menos preciso que Google para lugares pequeños`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log('\nOPCIONES:');
  console.log('1. Ver estado actual');
  console.log('2. Actualizar ciudades sin coordenadas');
  console.log('3. Cambiar servicio (actualmente: ' + (USE_GOOGLE ? 'Google' : 'OpenStreetMap') + ')');
  console.log('4. Salir\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Selecciona una opción (1-4): ', async (answer) => {
    readline.close();
    
    switch(answer) {
      case '1':
        await checkStatus();
        break;
      case '2':
        await populateCoordinates();
        break;
      case '3':
        console.log('\n📝 Para cambiar el servicio, edita el archivo y modifica:');
        console.log(`   USE_GOOGLE = ${!USE_GOOGLE}`);
        if (!USE_GOOGLE) {
          console.log('   GOOGLE_API_KEY = "tu-api-key"');
        }
        break;
      case '4':
        console.log('\n👋 ¡Hasta luego!');
        break;
      default:
        console.log('\n❌ Opción inválida');
    }
    
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Ejecutar
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});