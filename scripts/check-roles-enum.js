// scripts/check-roles-enum.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRolesTable() {
  console.log('🔍 Verificando la tabla roles en Supabase...\n');
  
  // 1. Verificar si podemos leer la tabla
  console.log('1. Intentando leer la tabla roles...');
  const { data: existingRoles, error: readError } = await supabase
    .from('roles')
    .select('*')
    .limit(5);
  
  if (readError) {
    console.error('❌ Error al leer la tabla:', readError);
  } else {
    console.log(`✅ Tabla accesible. Roles existentes: ${existingRoles?.length || 0}`);
    if (existingRoles && existingRoles.length > 0) {
      console.log('Ejemplos de roles existentes:');
      existingRoles.forEach(role => {
        console.log(`  - ${role.name} (department: ${role.department})`);
      });
    }
  }
  
  // 2. Intentar insertar un rol de prueba con cada valor del ENUM
  console.log('\n2. Probando inserción con diferentes valores de department...\n');
  
  const testDepartments = [
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
  
  for (const dept of testDepartments) {
    const testRole = {
      name: `Test ${dept} ${Date.now()}`,
      slug: `test-${dept.toLowerCase()}-${Date.now()}`,
      department: dept,
      description: 'Rol de prueba',
      is_main_role: false,
      is_active: true
    };
    
    const { data, error } = await supabase
      .from('roles')
      .insert(testRole)
      .select();
    
    if (error) {
      console.log(`❌ ${dept}: ${error.message}`);
    } else {
      console.log(`✅ ${dept}: Insertado correctamente`);
      // Eliminar el rol de prueba
      if (data && data[0]) {
        await supabase.from('roles').delete().eq('id', data[0].id);
      }
    }
  }
  
  // 3. Verificar la estructura de la tabla
  console.log('\n3. Intentando insertar un rol sin department...');
  const testRoleNoDept = {
    name: `Test No Dept ${Date.now()}`,
    slug: `test-no-dept-${Date.now()}`,
    description: 'Rol de prueba sin departamento',
    is_main_role: false,
    is_active: true
  };
  
  const { data: noDeptData, error: noDeptError } = await supabase
    .from('roles')
    .insert(testRoleNoDept)
    .select();
  
  if (noDeptError) {
    console.log(`❌ Sin department: ${noDeptError.message}`);
  } else {
    console.log(`✅ Sin department: Insertado correctamente`);
    // Eliminar el rol de prueba
    if (noDeptData && noDeptData[0]) {
      await supabase.from('roles').delete().eq('id', noDeptData[0].id);
    }
  }
  
  // 4. Probar con string en lugar de ENUM
  console.log('\n4. Intentando insertar con department como string simple...');
  const testRoleString = {
    name: `Test String ${Date.now()}`,
    slug: `test-string-${Date.now()}`,
    department: 'Dirección', // String simple
    description: 'Rol de prueba con string',
    is_main_role: false,
    is_active: true
  };
  
  const { data: stringData, error: stringError } = await supabase
    .from('roles')
    .insert(testRoleString)
    .select();
  
  if (stringError) {
    console.log(`❌ String 'Dirección': ${stringError.message}`);
  } else {
    console.log(`✅ String 'Dirección': Insertado correctamente`);
    // Eliminar el rol de prueba
    if (stringData && stringData[0]) {
      await supabase.from('roles').delete().eq('id', stringData[0].id);
    }
  }
}

async function main() {
  console.log('🔍 DIAGNÓSTICO DE LA TABLA ROLES EN SUPABASE');
  console.log('=' .repeat(50));
  
  try {
    await checkRolesTable();
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 CONCLUSIONES:');
    console.log('Si los valores del ENUM fallan pero los strings funcionan,');
    console.log('necesitamos actualizar el schema de la base de datos.');
    console.log('Si ningún valor funciona, puede haber un problema de permisos.');
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

main().catch(console.error);