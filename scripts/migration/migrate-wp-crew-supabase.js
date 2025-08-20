// scripts/test-crew-migration-fixed.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const unserialize = require('php-unserialize');

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función CORREGIDA para extraer el ID de persona
function extractPersonId(serializedValue) {
  if (!serializedValue) return null;
  
  try {
    // Si es un array serializado de PHP
    if (serializedValue.startsWith('a:')) {
      const data = unserialize.unserialize(serializedValue);
      if (Array.isArray(data) && data.length > 0) {
        // El valor puede ser string o número, convertir a int
        return parseInt(data[0].toString());
      }
      // A veces puede ser un objeto en lugar de array
      if (data && typeof data === 'object') {
        const values = Object.values(data);
        if (values.length > 0) {
          return parseInt(values[0].toString());
        }
      }
    } 
    // Si es un número directo
    else if (!isNaN(serializedValue)) {
      return parseInt(serializedValue);
    }
  } catch (e) {
    console.error('Error deserializando:', serializedValue, e.message);
  }
  
  return null;
}

async function testSingleMovie() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🧪 Test de migración con UNA película...\n');

    // Cargar roles
    console.log('Cargando roles...');
    const { data: roles } = await supabase
      .from('roles')
      .select('id, name');
    
    const rolesCache = new Map();
    roles.forEach(role => {
      rolesCache.set(role.name.toLowerCase().trim(), role.id);
    });
    console.log(`✅ ${roles.length} roles cargados\n`);

    // Test de la función extractPersonId
    console.log('🔧 Test de extractPersonId:');
    const testValue = 'a:1:{i:0;s:6:"159044";}';
    console.log(`  Input: ${testValue}`);
    console.log(`  Output: ${extractPersonId(testValue)}`);
    console.log('');

    // Obtener una película con crew
    const [movies] = await connection.execute(`
      SELECT pm.post_id, p.post_title
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND p.post_status = 'publish'
      AND pm.meta_key = 'ficha_tecnica_direccion'
      AND pm.meta_value > '0'
      LIMIT 1
    `);

    if (movies.length === 0) {
      console.log('No se encontraron películas con crew');
      return;
    }

    const wpMovieId = movies[0].post_id;
    const movieTitle = movies[0].post_title;
    
    console.log(`📽️ Procesando: ${movieTitle} (ID: ${wpMovieId})\n`);

    // Verificar si existe en Supabase
    console.log('Verificando si la película existe en Supabase...');
    const { data: movieExists, error: movieError } = await supabase
      .from('movies')
      .select('id')
      .eq('id', wpMovieId)
      .single();
    
    if (movieError || !movieExists) {
      console.log('❌ Película no encontrada en Supabase');
      return;
    }
    console.log('✅ Película encontrada en Supabase\n');

    // Obtener datos de crew
    console.log('Obteniendo datos de crew de WordPress...');
    const [crewData] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = ?
      AND meta_key LIKE 'ficha_tecnica_%'
      ORDER BY meta_key
    `, [wpMovieId]);

    // Organizar datos en un mapa
    const crewDataMap = {};
    crewData.forEach(row => {
      crewDataMap[row.meta_key] = row.meta_value;
    });

    // Procesar dirección
    console.log('🎬 Procesando campo de dirección...');
    const numDirectors = parseInt(crewDataMap['ficha_tecnica_direccion'] || 0);
    console.log(`Número de directores: ${numDirectors}\n`);

    const crewToInsert = [];

    for (let i = 0; i < numDirectors; i++) {
      const personaKey = `ficha_tecnica_direccion_${i}_persona`;
      const rolKey = `ficha_tecnica_direccion_${i}_rol`;
      const acreditadoKey = `ficha_tecnica_direccion_${i}_acreditado_con_su`;
      const comentarioKey = `ficha_tecnica_direccion_${i}_comentario`;

      console.log(`Director ${i + 1}:`);
      console.log(`  Persona (raw): ${crewDataMap[personaKey]}`);
      
      const personId = extractPersonId(crewDataMap[personaKey]);
      console.log(`  ID extraído: ${personId}`);
      console.log(`  Rol: ${crewDataMap[rolKey]}`);
      console.log(`  Acreditado: ${crewDataMap[acreditadoKey]}`);

      if (personId) {
        // Verificar si la persona existe
        const { data: personExists } = await supabase
          .from('people')
          .select('id, first_name, last_name')
          .eq('id', personId)
          .single();
        
        if (personExists) {
          console.log(`  ✅ Persona encontrada: ${personExists.first_name} ${personExists.last_name}`);
          
          // Buscar el rol
          const roleName = crewDataMap[rolKey] || 'Director';
          const roleId = rolesCache.get(roleName.toLowerCase().trim());
          
          if (roleId) {
            console.log(`  ✅ Rol encontrado: "${roleName}" -> ID ${roleId}`);
            
            // Preparar nota
            let note = crewDataMap[comentarioKey];
            const creditedAs = crewDataMap[acreditadoKey];
            if (creditedAs && creditedAs !== '2' && creditedAs !== '1') {
              note = note ? `Acreditado como: ${creditedAs}. ${note}` : `Acreditado como: ${creditedAs}`;
            }
            
            crewToInsert.push({
              movie_id: wpMovieId,
              person_id: personId,
              role_id: roleId,
              role: roleName,
              billing_order: i + 1,
              note: note || null,
              is_confirmed: true
            });
          } else {
            console.log(`  ❌ Rol "${roleName}" no encontrado`);
          }
        } else {
          console.log(`  ❌ Persona ID ${personId} no encontrada en Supabase`);
        }
      }
      console.log('');
    }

    if (crewToInsert.length > 0) {
      console.log(`\n📝 Insertando ${crewToInsert.length} registros en movie_crew...`);
      
      // Primero eliminar crew existente
      await supabase
        .from('movie_crew')
        .delete()
        .eq('movie_id', wpMovieId);
      
      // Insertar nuevos
      const { data, error } = await supabase
        .from('movie_crew')
        .insert(crewToInsert)
        .select();
      
      if (error) {
        console.error('❌ Error al insertar:', error);
      } else {
        console.log(`✅ ${data.length} registros insertados correctamente`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar test
testSingleMovie();