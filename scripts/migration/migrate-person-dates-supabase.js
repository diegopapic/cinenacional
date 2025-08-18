// scripts/migrate-person-dates-simple.js
// Migración simplificada sin JOINs complejos

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

async function createWPConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  });
}

// Configuración Supabase - COPIADA DEL SCRIPT DE PELÍCULAS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migratePersonDatesSimple() {
  console.log('=== MIGRACIÓN SIMPLIFICADA DE FECHAS ===\n');

  let wpConnection;
  
  try {
    wpConnection = await createWPConnection();
    console.log('✅ Conectado a WordPress MySQL');

    const { error: supabaseError } = await supabase.from('people').select('count').limit(1);
    if (supabaseError) {
      throw new Error(`Error conectando a Supabase: ${supabaseError.message}`);
    }
    console.log('✅ Conectado a Supabase\n');

    // PASO 1: Obtener solo personas básicas (sin JOINs)
    console.log('📊 1. OBTENIENDO LISTA DE PERSONAS\n');
    
    const [allPeople] = await wpConnection.execute(`
      SELECT ID, post_name as slug, post_title as nombre
      FROM wp_posts 
      WHERE post_type = 'persona'
      AND post_status = 'publish'
      ORDER BY ID
    `);
    
    console.log(`✅ Encontradas ${allPeople.length} personas para procesar\n`);

    // PASO 2: Procesar en lotes pequeños
    const batchSize = 200; // Lotes más pequeños
    let totalProcessed = 0;
    let totalUpdated = 0;
    let errors = [];

    for (let i = 0; i < allPeople.length; i += batchSize) {
      const batch = allPeople.slice(i, i + batchSize);
      const batchStart = Date.now();
      
      console.log(`\n🔄 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(allPeople.length/batchSize)} (personas ${i + 1}-${Math.min(i + batchSize, allPeople.length)})`);
      
      // Obtener metadatos para este lote específico
      const personIds = batch.map(p => p.ID).join(',');
      
      console.log(`⏳ Obteniendo metadatos de fechas...`);
      const [metadata] = await wpConnection.execute(`
        SELECT 
          post_id,
          meta_key,
          meta_value
        FROM wp_postmeta 
        WHERE post_id IN (${personIds})
        AND meta_key IN (
          'fecha_nacimiento', 'fecha_muerte',
          'fecha_nacimiento_import', 'fecha_muerte_import',
          'ano_nacimiento', 'mes_nacimiento',
          'ano_muerte', 'mes_muerte',
          'ocultar_edad'
        )
        AND meta_value IS NOT NULL
        AND meta_value != ''
      `);
      
      console.log(`✅ Obtenidos ${metadata.length} metadatos`);
      
      // Agrupar metadatos por persona
      const metaByPerson = {};
      metadata.forEach(meta => {
        if (!metaByPerson[meta.post_id]) {
          metaByPerson[meta.post_id] = {};
        }
        metaByPerson[meta.post_id][meta.meta_key] = meta.meta_value;
      });

      // Procesar cada persona del lote
      let batchUpdated = 0;
      for (const person of batch) {
        const personMeta = metaByPerson[person.ID] || {};
        
        try {
          const processedDates = processPersonDates(personMeta);
          
          if (processedDates.hasDateData) {
            const updateData = {
              birth_year: processedDates.birth.year,
              birth_month: processedDates.birth.month,
              birth_day: processedDates.birth.day,
              death_year: processedDates.death.year,
              death_month: processedDates.death.month,
              death_day: processedDates.death.day,
              hide_age: processedDates.hideAge
            };

            const { error } = await supabase
              .from('people')
              .update(updateData)
              .eq('slug', person.slug);

            if (error) {
              errors.push({
                slug: person.slug,
                nombre: person.nombre,
                error: error.message
              });
            } else {
              totalUpdated++;
              batchUpdated++;
              
              // Mostrar ejemplos de las primeras personas
              if (totalUpdated <= 5) {
                console.log(`   ✅ ${person.nombre}: Nac: ${formatPartialDate(processedDates.birth.year, processedDates.birth.month, processedDates.birth.day)}, Muerte: ${formatPartialDate(processedDates.death.year, processedDates.death.month, processedDates.death.day)}`);
              }
            }
          }

          totalProcessed++;
          
        } catch (error) {
          errors.push({
            slug: person.slug,
            nombre: person.nombre,
            error: error.message
          });
        }
      }

      const batchTime = ((Date.now() - batchStart) / 1000).toFixed(1);
      const percentage = ((totalProcessed / allPeople.length) * 100).toFixed(1);
      
      console.log(`✅ Lote completado en ${batchTime}s`);
      console.log(`📊 Progreso: ${totalProcessed}/${allPeople.length} (${percentage}%) - ${totalUpdated} actualizadas (+${batchUpdated} en este lote)`);
      
      // Estimar tiempo restante
      const avgTimePerBatch = (Date.now() - Date.now()) / (Math.floor(i/batchSize) + 1);
      const remainingBatches = Math.ceil((allPeople.length - i - batchSize) / batchSize);
      const estimatedMinutes = (remainingBatches * avgTimePerBatch / 1000 / 60).toFixed(1);
      
      if (remainingBatches > 0) {
        console.log(`⏱️  Tiempo estimado restante: ~${estimatedMinutes} minutos`);
      }
    }

    // Estadísticas finales
    console.log('\n📈 ESTADÍSTICAS FINALES\n');
    
    const { count: finalBirthCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('birth_year', 'is', null);

    const { count: finalDeathCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .not('death_year', 'is', null);

    console.log(`✅ MIGRACIÓN COMPLETADA`);
    console.log(`📊 Total personas procesadas: ${totalProcessed}`);
    console.log(`📊 Total personas actualizadas: ${totalUpdated}`);
    console.log(`📊 Personas con fecha de nacimiento: ${finalBirthCount || 0}`);
    console.log(`📊 Personas con fecha de muerte: ${finalDeathCount || 0}`);
    console.log(`❌ Errores: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ PRIMEROS 10 ERRORES:');
      errors.slice(0, 10).forEach(error => {
        console.log(`   ${error.nombre}: ${error.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error(error.stack);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
    }
  }
}

// Función para procesar fechas de metadatos
function processPersonDates(personMeta) {
  const result = {
    birth: { year: null, month: null, day: null },
    death: { year: null, month: null, day: null },
    hideAge: personMeta.ocultar_edad === '1',
    hasDateData: false
  };

  // Procesar fecha de nacimiento (prioridad: fecha_nacimiento > fecha_nacimiento_import > ano_nacimiento+mes_nacimiento)
  if (personMeta.fecha_nacimiento) {
    const birthDate = parseDateYYYYMMDD(personMeta.fecha_nacimiento);
    if (birthDate) {
      result.birth = birthDate;
      result.hasDateData = true;
    }
  } else if (personMeta.fecha_nacimiento_import && personMeta.fecha_nacimiento_import !== '0000-00-00') {
    const birthDate = parseDateISO(personMeta.fecha_nacimiento_import);
    if (birthDate) {
      result.birth = birthDate;
      result.hasDateData = true;
    }
  } else if (personMeta.ano_nacimiento) {
    result.birth.year = parseInt(personMeta.ano_nacimiento);
    if (personMeta.mes_nacimiento && personMeta.mes_nacimiento !== '00') {
      result.birth.month = parseInt(personMeta.mes_nacimiento);
    }
    result.hasDateData = true;
  }

  // Procesar fecha de muerte (misma lógica)
  if (personMeta.fecha_muerte) {
    const deathDate = parseDateYYYYMMDD(personMeta.fecha_muerte);
    if (deathDate) {
      result.death = deathDate;
      result.hasDateData = true;
    }
  } else if (personMeta.fecha_muerte_import && personMeta.fecha_muerte_import !== '0000-00-00') {
    const deathDate = parseDateISO(personMeta.fecha_muerte_import);
    if (deathDate) {
      result.death = deathDate;
      result.hasDateData = true;
    }
  } else if (personMeta.ano_muerte) {
    result.death.year = parseInt(personMeta.ano_muerte);
    if (personMeta.mes_muerte && personMeta.mes_muerte !== '00') {
      result.death.month = parseInt(personMeta.mes_muerte);
    }
    result.hasDateData = true;
  }

  return result;
}

// Función para parsear fecha YYYYMMDD
function parseDateYYYYMMDD(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  
  const year = parseInt(dateStr.substr(0, 4));
  const month = parseInt(dateStr.substr(4, 2));
  const day = parseInt(dateStr.substr(6, 2));
  
  if (year < 1400 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  return { year, month, day };
}

// Función para parsear fecha ISO
function parseDateISO(dateStr) {
  if (!dateStr) return null;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parts[1] === '00' ? null : parseInt(parts[1]);
  const day = parts[2] === '00' ? null : parseInt(parts[2]);
  
  if (year < 1400 || year > 2100) return null;
  if (month && (month < 1 || month > 12)) return null;
  if (day && (day < 1 || day > 31)) return null;
  
  return { year, month, day };
}

// Función para formatear fecha parcial
function formatPartialDate(year, month, day) {
  if (!year) return 'Sin fecha';
  
  if (day && month) {
    return `${day}/${month}/${year}`;
  } else if (month) {
    return `${month}/${year}`;
  } else {
    return `${year}`;
  }
}

if (require.main === module) {
  migratePersonDatesSimple().catch(console.error);
}

module.exports = { migratePersonDatesSimple };