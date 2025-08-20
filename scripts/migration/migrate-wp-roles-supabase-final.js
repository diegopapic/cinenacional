// scripts/migrate-wp-roles-supabase-final.js

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuración de WordPress MySQL
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  port: 3306
};

// Configuración Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Eliminar guiones múltiples
    .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final
}

function extractDepartment(metaKey) {
  // Extraer el departamento del meta_key y mapear a los valores del ENUM
  const match = metaKey.match(/ficha_tecnica_([^_]+)(?:_import)?_\d+_rol/);
  if (match) {
    const dept = match[1];
    // Mapear a valores EXACTOS del ENUM Department en Prisma
    const deptMap = {
      'direccion': 'DIRECCION',
      'guion': 'GUION',
      'fotografia': 'FOTOGRAFIA',
      'montaje': 'MONTAJE',
      'musica': 'MUSICA',
      'sonido': 'SONIDO',
      'produccion': 'PRODUCCION',
      'direccion_de_arte': 'ARTE',
      'arte': 'ARTE',
      'vestuario': 'VESTUARIO',
      'maquillaje': 'MAQUILLAJE',
      'efectos_especiales': 'EFECTOS',
      'efectos': 'EFECTOS',
      'animacion': 'ANIMACION',
      'postproduccion': 'OTROS',
      'making_off': 'OTROS',
      'otros': 'OTROS'
    };
    return deptMap[dept] || 'OTROS'; // Default a OTROS si no se encuentra
  }
  return 'OTROS'; // Default a OTROS
}

async function extractRolesFromWordPress() {
  const connection = await mysql.createConnection(wpConfig);
  
  try {
    console.log('🔍 Extrayendo roles únicos de WordPress...\n');
    
    // Buscar TODOS los campos de rol en wp_postmeta
    const [rows] = await connection.execute(`
      SELECT DISTINCT 
        meta_key,
        meta_value as role_name,
        COUNT(*) as usage_count
      FROM wp_postmeta
      WHERE meta_key REGEXP 'ficha_tecnica_[^_]+(_import)?_[0-9]+_rol'
        AND meta_value != ''
        AND meta_value IS NOT NULL
      GROUP BY meta_key, meta_value
      ORDER BY meta_value
    `);
    
    // Procesar y agrupar roles únicos con su departamento
    const rolesMap = new Map();
    
    for (const row of rows) {
      const roleName = row.role_name.trim();
      const department = extractDepartment(row.meta_key);
      
      if (roleName) {
        // Crear clave única combinando nombre y departamento
        const key = `${roleName}|${department}`;
        
        if (!rolesMap.has(key)) {
          rolesMap.set(key, {
            name: roleName,
            slug: generateSlug(roleName + '-' + department.toLowerCase()),
            department: department, // SIEMPRE tendrá un valor válido del ENUM
            description: `Rol migrado desde WordPress. Usado ${row.usage_count} veces.`,
            is_main_role: false,
            is_active: true
          });
        } else {
          // Si ya existe, sumar el uso
          const role = rolesMap.get(key);
          const currentUsage = parseInt(role.description.match(/Usado (\d+) veces/)[1]);
          role.description = `Rol migrado desde WordPress. Usado ${currentUsage + parseInt(row.usage_count)} veces.`;
        }
      }
    }
    
    // Convertir a array
    const roles = Array.from(rolesMap.values());
    
    console.log(`✅ Encontrados ${roles.length} roles únicos\n`);
    
    // Mostrar estadísticas por departamento
    const deptStats = {};
    roles.forEach(role => {
      deptStats[role.department] = (deptStats[role.department] || 0) + 1;
    });
    
    console.log('📊 Distribución por departamento:');
    Object.entries(deptStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`  - ${dept}: ${count} roles`);
      });
    
    // Mostrar muestra de roles encontrados
    console.log('\n📋 Muestra de roles encontrados:');
    roles.slice(0, 20).forEach(role => {
      console.log(`  - "${role.name}" (${role.department}) -> slug: "${role.slug}"`);
    });
    
    if (roles.length > 20) {
      console.log(`  ... y ${roles.length - 20} roles más\n`);
    }
    
    return roles;
    
  } finally {
    await connection.end();
  }
}

async function migrateRolesToSupabase(roles) {
  console.log('\n📤 Migrando roles a Supabase...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const errors = [];
  const failedRoles = [];
  
  // Procesar en lotes pequeños para evitar timeout
  const batchSize = 20;
  
  for (let i = 0; i < roles.length; i += batchSize) {
    const batch = roles.slice(i, i + batchSize);
    
    // Procesar cada rol individualmente para mejor control de errores
    for (const role of batch) {
      try {
        // Asegurarse de que department nunca sea null
        if (!role.department) {
          console.error(`⚠️  Asignando departamento OTROS a rol "${role.name}" sin departamento`);
          role.department = 'OTROS';
        }
        
        const { data, error } = await supabase
          .from('roles')
          .upsert(role, {
            onConflict: 'slug',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          if (error.message.includes('duplicate key value')) {
            // Si es un duplicado, intentar con un slug diferente
            const alternativeRole = {
              ...role,
              slug: `${role.slug}-alt-${Date.now()}`
            };
            
            const { data: altData, error: altError } = await supabase
              .from('roles')
              .insert(alternativeRole)
              .select();
            
            if (altError) {
              console.error(`❌ Error con rol "${role.name}" (${role.department}):`, altError.message);
              errorCount++;
              failedRoles.push({ role, error: altError.message });
            } else {
              successCount++;
              duplicateCount++;
              console.log(`⚠️  Rol "${role.name}" insertado con slug alternativo`);
            }
          } else {
            console.error(`❌ Error con rol "${role.name}" (${role.department}):`, error.message);
            errorCount++;
            failedRoles.push({ role, error: error.message });
          }
        } else {
          successCount++;
          // Mostrar progreso cada 50 roles
          if (successCount % 50 === 0) {
            console.log(`✅ ${successCount} roles migrados...`);
          }
        }
      } catch (roleError) {
        console.error(`❌ Error con rol "${role.name}":`, roleError);
        errorCount++;
        failedRoles.push({ role, error: roleError.message });
      }
    }
  }
  
  // Mostrar detalles de errores si hay pocos
  if (failedRoles.length > 0 && failedRoles.length <= 10) {
    console.log('\n⚠️ Roles que fallaron:');
    failedRoles.forEach(({ role, error }) => {
      console.log(`  - "${role.name}" (${role.department}): ${error}`);
    });
  } else if (failedRoles.length > 10) {
    console.log(`\n⚠️ ${failedRoles.length} roles fallaron. Mostrando los primeros 10:`);
    failedRoles.slice(0, 10).forEach(({ role, error }) => {
      console.log(`  - "${role.name}" (${role.department}): ${error}`);
    });
  }
  
  if (duplicateCount > 0) {
    console.log(`\n📝 ${duplicateCount} roles fueron insertados con slugs alternativos debido a duplicados`);
  }
  
  return { successCount, errorCount, duplicateCount, errors, failedRoles };
}

async function verifyMigration() {
  console.log('\n🔍 Verificando migración...\n');
  
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('❌ Error al verificar:', error);
    return;
  }
  
  console.log(`✅ Total de roles en Supabase: ${data.length}`);
  
  // Mostrar estadísticas por departamento
  const deptStats = {};
  data.forEach(role => {
    const dept = role.department || 'Sin departamento';
    deptStats[dept] = (deptStats[dept] || 0) + 1;
  });
  
  console.log('\n📊 Roles por departamento:');
  Object.entries(deptStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      console.log(`  - ${dept}: ${count} roles`);
    });
  
  // Mostrar algunos ejemplos de roles migrados
  console.log('\n📋 Ejemplos de roles migrados:');
  data.slice(0, 10).forEach(role => {
    console.log(`  - ${role.name} (${role.department}) [${role.slug}]`);
  });
  
  // Buscar roles con slugs alternativos
  const altSlugs = data.filter(r => r.slug.includes('-alt-'));
  if (altSlugs.length > 0) {
    console.log(`\n⚠️ Roles con slugs alternativos (posibles duplicados): ${altSlugs.length}`);
    altSlugs.slice(0, 5).forEach(role => {
      console.log(`  - ${role.name} [${role.slug}]`);
    });
  }
}

async function cleanupTestRoles() {
  console.log('\n🧹 Limpiando roles de prueba...');
  
  const { data, error } = await supabase
    .from('roles')
    .delete()
    .like('slug', 'test-%')
    .select();
  
  if (!error && data) {
    console.log(`✅ Eliminados ${data.length} roles de prueba`);
  }
}

async function main() {
  console.log('🎬 MIGRACIÓN DE ROLES DE WORDPRESS A SUPABASE');
  console.log('=' .repeat(50));
  
  try {
    // 0. Limpiar roles de prueba si existen
    await cleanupTestRoles();
    
    // 1. Extraer roles de WordPress
    const roles = await extractRolesFromWordPress();
    
    if (roles.length === 0) {
      console.log('⚠️ No se encontraron roles para migrar');
      return;
    }
    
    // 2. Confirmar antes de migrar
    console.log(`\n¿Migrar ${roles.length} roles a Supabase? (s/n)`);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 's') {
      console.log('❌ Migración cancelada');
      return;
    }
    
    // 3. Migrar a Supabase
    const result = await migrateRolesToSupabase(roles);
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 RESUMEN DE LA MIGRACIÓN:');
    console.log(`  ✅ Roles migrados exitosamente: ${result.successCount}`);
    if (result.duplicateCount > 0) {
      console.log(`  ⚠️  Roles con slugs alternativos: ${result.duplicateCount}`);
    }
    console.log(`  ❌ Roles con error: ${result.errorCount}`);
    
    // 4. Verificar migración
    await verifyMigration();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ MIGRACIÓN COMPLETADA');
    
    if (result.successCount > 0) {
      console.log('\n💡 SIGUIENTE PASO:');
      console.log('   Los roles han sido migrados exitosamente.');
      console.log('   Ahora puedes proceder a migrar las relaciones movie_crew');
      console.log('   con los roleId correspondientes.');
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

// Ejecutar
main().catch(console.error);