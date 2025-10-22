// scripts/create-missing-roles.js
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Roles que necesitan crearse (del archivo roles-not-found.json)
const ROLES_TO_CREATE = [
  "Escenografía",
  "Vestuario",
  "Dirección de arte",
  "Asistente de escenografía",
  "Maquillaje",
  "Peinados",
  "Asistente de vestuario",
  "Efectos especiales",
  "Jefe de maquillaje",
  "Jefe de peinados",
  "Asistente de maquillaje",
  "Modista",
  "Asesoría artística",
  "Ambientación",
  "Ayudante de maquillaje",
  "Ayudante de escenografía",
  "VFX",
  "Utilero",
  "Ayudante de vestuario",
  "Realización de decorados",
  "Diseño de vestuario",
  "Realización escenográfica",
  "Asesoría de vestuario",
  "Refuerzo de peinados",
  "FX",
  "Making Of",
  "Realización de escenografía",
  "Refuerzo de maquillaje",
  "Maquillaje 2da unidad",
  "Peinados 2da unidad",
  "Meritorio de vestuario",
  "Diseño de Producción",
  "Asistente de arte",
  "Ayudante de arte",
  "Meritorio de arte",
  "Supervisor de Efectos Visuales",
  "Asistente de Making Off",
  "Utilería de efectos",
  "Carpintero",
  "Muralista",
  "Realización de vestuario",
  "Reemplazo de vestuario",
  "Equipo de vestuario",
  "1er asistente de arte",
  "1er asistente de vestuario",
  "Diseño de maquillaje",
  "Diseño de peinados",
  "Ayudante de peinados",
  "Meritorio de maquillaje",
  "Asistente de peinados",
  "2do asistente de arte",
  "Asistente de utilero",
  "Meritorio de peinados",
  "Ayudante de utilería",
  "Utilero de Avanzada",
  "Coordinación FX",
  "Jefe técnico de FX",
  "Estilista",
  "Constructor",
  "Fotos Making Off",
  "Dirección de Fxs",
  "Maqueta",
  "FX maquillaje",
  "2da unidad de arte",
  "Equipo de realización de arte",
  "Diseño y realización de máscaras y pelo",
  "Realización de cuerpos",
  "Concepto artístico",
  "Coordinación de FX físicos",
  "Maquillaje FX",
  "Supervisión de VFX",
  "Dirección de VFX",
  "Diseños",
  "Diseño de objetos",
  "Supervisor de FX",
  "Asistente de FX",
  "Supervisor de VFX",
  "FX de acción",
  "Arte en set",
  "Diseño de escenografía",
  "Asistente del Utilero de Avanzada",
  "Paisajista",
  "Refuerzo de vestuario",
  "Auxiliar de vestuario",
  "Asistencia de utilería",
  "2do asistente de vestuario",
  "3er asistente de arte",
  "Utilero de refuerzo"
];

// Mapeo de roles a departamentos
const ROLE_DEPARTMENT_MAP = {
  // ARTE
  'Escenografía': 'ARTE',
  'Vestuario': 'ARTE',
  'Dirección de arte': 'ARTE',
  'Asistente de escenografía': 'ARTE',
  'Maquillaje': 'ARTE',
  'Peinados': 'ARTE',
  'Asistente de vestuario': 'ARTE',
  'Jefe de maquillaje': 'ARTE',
  'Jefe de peinados': 'ARTE',
  'Asistente de maquillaje': 'ARTE',
  'Modista': 'ARTE',
  'Asesoría artística': 'ARTE',
  'Ambientación': 'ARTE',
  'Ayudante de maquillaje': 'ARTE',
  'Ayudante de escenografía': 'ARTE',
  'Utilero': 'ARTE',
  'Ayudante de vestuario': 'ARTE',
  'Realización de decorados': 'ARTE',
  'Diseño de vestuario': 'ARTE',
  'Realización escenográfica': 'ARTE',
  'Asesoría de vestuario': 'ARTE',
  'Refuerzo de peinados': 'ARTE',
  'Realización de escenografía': 'ARTE',
  'Refuerzo de maquillaje': 'ARTE',
  'Maquillaje 2da unidad': 'ARTE',
  'Peinados 2da unidad': 'ARTE',
  'Meritorio de vestuario': 'ARTE',
  'Diseño de Producción': 'ARTE',
  'Asistente de arte': 'ARTE',
  'Ayudante de arte': 'ARTE',
  'Meritorio de arte': 'ARTE',
  'Asistente de utilero': 'ARTE',
  'Utilería de efectos': 'ARTE',
  'Carpintero': 'ARTE',
  'Muralista': 'ARTE',
  'Realización de vestuario': 'ARTE',
  'Reemplazo de vestuario': 'ARTE',
  'Equipo de vestuario': 'ARTE',
  '1er asistente de arte': 'ARTE',
  '1er asistente de vestuario': 'ARTE',
  'Diseño de maquillaje': 'ARTE',
  'Diseño de peinados': 'ARTE',
  'Ayudante de peinados': 'ARTE',
  'Meritorio de maquillaje': 'ARTE',
  'Asistente de peinados': 'ARTE',
  '2do asistente de arte': 'ARTE',
  'Meritorio de peinados': 'ARTE',
  'Ayudante de utilería': 'ARTE',
  'Utilero de Avanzada': 'ARTE',
  'Estilista': 'ARTE',
  'Constructor': 'ARTE',
  'Maqueta': 'ARTE',
  '2da unidad de arte': 'ARTE',
  'Equipo de realización de arte': 'ARTE',
  'Diseño y realización de máscaras y pelo': 'ARTE',
  'Realización de cuerpos': 'ARTE',
  'Concepto artístico': 'ARTE',
  'Diseños': 'ARTE',
  'Diseño de objetos': 'ARTE',
  'Arte en set': 'ARTE',
  'Diseño de escenografía': 'ARTE',
  'Asistente del Utilero de Avanzada': 'ARTE',
  'Paisajista': 'ARTE',
  'Refuerzo de vestuario': 'ARTE',
  'Auxiliar de vestuario': 'ARTE',
  'Asistencia de utilería': 'ARTE',
  '2do asistente de vestuario': 'ARTE',
  '3er asistente de arte': 'ARTE',
  'Utilero de refuerzo': 'ARTE',
  
  // EFECTOS
  'Efectos especiales': 'EFECTOS',
  'VFX': 'EFECTOS',
  'FX': 'EFECTOS',
  'Supervisor de Efectos Visuales': 'EFECTOS',
  'Coordinación FX': 'EFECTOS',
  'Jefe técnico de FX': 'EFECTOS',
  'Dirección de Fxs': 'EFECTOS',
  'FX maquillaje': 'EFECTOS',
  'Coordinación de FX físicos': 'EFECTOS',
  'Maquillaje FX': 'EFECTOS',
  'Supervisión de VFX': 'EFECTOS',
  'Dirección de VFX': 'EFECTOS',
  'Supervisor de FX': 'EFECTOS',
  'Asistente de FX': 'EFECTOS',
  'Supervisor de VFX': 'EFECTOS',
  'FX de acción': 'EFECTOS',
  
  // OTROS
  'Making Of': 'OTROS',
  'Asistente de Making Off': 'OTROS',
  'Fotos Making Off': 'OTROS'
};

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createMissingRoles() {
  try {
    console.log('🚀 Creando roles faltantes...\n');
    console.log(`📋 ${ROLES_TO_CREATE.length} roles a verificar\n`);

    // Obtener roles existentes
    const existingRoles = await prisma.role.findMany({
      select: { name: true }
    });
    
    const existingNames = new Set(
      existingRoles.map(r => r.name.toLowerCase().trim())
    );

    console.log(`📊 Roles actuales en BD: ${existingRoles.length}\n`);

    // Preparar roles para insertar
    const rolesToInsert = [];
    const skipped = [];

    for (const roleName of ROLES_TO_CREATE) {
      // Verificar si ya existe
      if (existingNames.has(roleName.toLowerCase().trim())) {
        skipped.push(roleName);
        continue;
      }

      const department = ROLE_DEPARTMENT_MAP[roleName] || 'OTROS';
      const slug = generateSlug(roleName);

      rolesToInsert.push({
        name: roleName,
        slug: slug,
        department: department,
        isActive: true,
        isMainRole: false
      });
    }

    console.log(`✅ Roles a insertar: ${rolesToInsert.length}`);
    console.log(`⏭️  Roles ya existentes: ${skipped.length}\n`);

    if (skipped.length > 0) {
      console.log('Ejemplos de roles ya existentes:');
      skipped.slice(0, 5).forEach(r => console.log(`  - ${r}`));
      if (skipped.length > 5) {
        console.log(`  ... y ${skipped.length - 5} más\n`);
      }
    }

    if (rolesToInsert.length > 0) {
      console.log('\n💾 Insertando nuevos roles...');
      
      // Insertar usando createMany
      const result = await prisma.role.createMany({
        data: rolesToInsert,
        skipDuplicates: true
      });

      console.log(`\n🎉 Total insertado: ${result.count} roles`);
    } else {
      console.log('\n✨ Todos los roles ya existen, no hay nada que insertar');
    }

    // Verificar total final
    const totalCount = await prisma.role.count();
    console.log(`\n📊 Total de roles en la tabla: ${totalCount}`);

    // Mostrar distribución por departamento
    const byDepartment = await prisma.role.groupBy({
      by: ['department'],
      _count: true
    });

    console.log('\n📈 Distribución por departamento:');
    byDepartment
      .sort((a, b) => b._count - a._count)
      .forEach(dept => {
        console.log(`  ${dept.department}: ${dept._count}`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingRoles();