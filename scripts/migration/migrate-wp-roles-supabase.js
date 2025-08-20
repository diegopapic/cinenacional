// scripts/migrate-wp-roles-supabase.js

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
  // Extraer el departamento del meta_key y mapear EXACTAMENTE a los valores del ENUM
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
    return deptMap[dept] || 'OTROS';
  }
  return 'OTROS';
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
            department: department,
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
  const errors = [];
  const failedRoles = [];
  
  // Procesar en lotes más pequeños para evitar timeout
  const batchSize = 20;
  
  for (let i = 0; i < roles.length; i += batchSize) {
    const batch = roles.slice(i, i + batchSize);
    
    try {
      // Intentar insertar uno por uno para identificar problemas específicos
      for (const role of batch) {
        try {
          const { data, error } = await supabase
            .from('roles')
            .upsert(role, {
              onConflict: 'slug',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error(`❌ Error con rol "${role.name}" (${role.department}):`, error.message);
            errorCount++;
            failedRoles.push({ role, error: error.message });
          } else {
            successCount++;
          }
        } catch (roleError) {
          console.error(`❌ Error con rol "${role.name}":`, roleError);
          errorCount++;
          failedRoles.push({ role, error: roleError.message });
        }
      }
      
      console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} procesado: ${successCount} éxitos de ${i + batch.length} total`);
      
    } catch (error) {
      console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error);
      errorCount += batch.length;
      errors.push(error);
    }
  }
  
  // Si hay roles fallidos, mostrar detalles
  if (failedRoles.length > 0) {
    console.log('\n⚠️ Roles que fallaron:');
    failedRoles.slice(0, 10).forEach(({ role, error }) => {
      console.log(`  - "${role.name}" (${role.department}): ${error}`);
    });
    if (failedRoles.length > 10) {
      console.log(`  ... y ${failedRoles.length - 10} más`);
    }
  }
  
  return { successCount, errorCount, errors, failedRoles };
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
}

// Función para verificar valores válidos del ENUM
async function checkEnumValues() {
  console.log('\n🔍 Verificando valores válidos del ENUM Department...\n');
  
  // Los valores válidos según el schema.prisma
  const validDepartments = [
    'DIRECCION',
    'PRODUCCION',
    'GUION',
    'FOTOGRAFIA',
    'ARTE',
    'MONTAJE',
    'SONIDO',
    'MUSICA',
    'VESTUARIO',
    'MAQUILLAJE',
    'EFECTOS',
    'ANIMACION',
    'OTROS'
  ];
  
  console.log('Valores válidos del ENUM Department:');
  validDepartments.forEach(dept => {
    console.log(`  - ${dept}`);
  });
  
  return validDepartments;
}

async function main() {
  console.log('🎬 MIGRACIÓN DE ROLES DE WORDPRESS A SUPABASE');
  console.log('=' .repeat(50));
  
  try {
    // Verificar valores del ENUM primero
    await checkEnumValues();
    
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
    console.log(`  ❌ Roles con error: ${result.errorCount}`);
    
    // 4. Verificar migración
    await verifyMigration();
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

// Ejecutar
main().catch(console.error);