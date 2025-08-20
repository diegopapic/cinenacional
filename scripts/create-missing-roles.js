// scripts/create-missing-roles-enum.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hlelclzxtjipwsikvdpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWxjbHp4dGppcHdzaWt2ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTAyMzUsImV4cCI6MjA2NTE2NjIzNX0.r1YW0JDiIeNWdj2j79tidWqdUxc24a5AIs12nulMIAk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createMissingRoles() {
  try {
    console.log('🎭 Creando roles faltantes...\n');

    // Roles que faltan con los valores CORRECTOS del ENUM Department
    const missingRoles = [
      { name: "Escenografía", department: "ARTE" },
      { name: "Vestuario", department: "VESTUARIO" },
      { name: "Dirección de arte", department: "ARTE" },
      { name: "Asistente de escenografía", department: "ARTE" },
      { name: "Maquillaje", department: "MAQUILLAJE" },
      { name: "Peinados", department: "MAQUILLAJE" },
      { name: "Ambientación", department: "ARTE" },
      { name: "Asistente de vestuario", department: "VESTUARIO" },
      { name: "Efectos especiales", department: "EFECTOS" },
      { name: "Jefe de maquillaje", department: "MAQUILLAJE" },
      { name: "Jefe de peinados", department: "MAQUILLAJE" },
      { name: "Asistente de maquillaje", department: "MAQUILLAJE" },
      { name: "Modista", department: "VESTUARIO" },
      { name: "Asesoría artística", department: "ARTE" },
      { name: "Diseño de vestuario", department: "VESTUARIO" },
      { name: "Ayudante de maquillaje", department: "MAQUILLAJE" }
    ];

    // Verificar cuáles ya existen
    const { data: existingRoles } = await supabase
      .from('roles')
      .select('name');
    
    const existingNames = new Set(existingRoles.map(r => r.name.toLowerCase()));
    
    const rolesToCreate = missingRoles.filter(role => 
      !existingNames.has(role.name.toLowerCase())
    );

    console.log(`📋 Roles a crear: ${rolesToCreate.length}\n`);

    // Crear los roles
    let created = 0;
    let errors = 0;
    
    for (const role of rolesToCreate) {
      const slug = role.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]/g, '-') // Reemplazar caracteres especiales
        .replace(/-+/g, '-') // Eliminar guiones múltiples
        .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final

      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: role.name,
          slug: slug,
          department: role.department, // Ahora con valores correctos del ENUM
          description: `Rol de ${role.department}`,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creando "${role.name}":`, error.message);
        errors++;
      } else {
        console.log(`✅ Creado: ${role.name} (${role.department})`);
        created++;
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`  ✅ Roles creados: ${created}`);
    if (errors > 0) {
      console.log(`  ❌ Errores: ${errors}`);
    }

    // Verificar total de roles
    const { count } = await supabase
      .from('roles')
      .select('*', { count: 'exact', head: true });

    console.log(`  📝 Total de roles en la base de datos: ${count}`);

    if (created > 0) {
      console.log('\n🎉 Roles creados exitosamente!');
      console.log('\n🔄 Ahora puedes re-ejecutar la migración del crew:');
      console.log('   node scripts/migrate-wp-crew-import-priority.js');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createMissingRoles();