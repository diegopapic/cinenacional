// src/app/api/roles/seed/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Department } from '@/lib/roles/rolesTypes'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'

// Roles iniciales por departamento
const INITIAL_ROLES_BY_DEPARTMENT = {
  [Department.DIRECCION]: [
    'Director',
    'Codirector',
    'Primer Asistente de Dirección',
    'Segundo Asistente de Dirección',
    'Tercer Asistente de Dirección',
    'Ayudante de Dirección',
    'Continuista',
    'Script',
    'Director de Casting',
    'Asistente de Casting',
    'Casting'
  ],

  [Department.PRODUCCION]: [
    'Productor Ejecutivo',
    'Productor',
    'Coproductor',
    'Productor Asociado',
    'Producción Ejecutiva',
    'Jefe de Producción',
    'Dirección de Producción',
    'Coordinación de Producción',
    'Asistente de Producción',
    'Diseño de Producción',
    'Coordinador General',
    'Jefe de Locaciones',
    'Chofer',
    'Transporte',
    'Localización'
  ],

  [Department.GUION]: [
    'Guionista',
    'Coguionista',
    'Adaptación',
    'Argumento',
    'Historia Original',
    'Colaboración en Guión',
    'Guión y Continuidad'
  ],

  [Department.FOTOGRAFIA]: [
    'Director de Fotografía',
    'Operador de Cámara',
    'Primer Asistente de Cámara',
    'Segundo Asistente de Cámara',
    'Gaffer',
    'Electricista',
    'Cámara y Electricidad'
  ],

  [Department.ARTE]: [
    'Director de Arte',
    'Diseñador de Producción',
    'Ambientador',
    'Escenógrafo',
    'Utilero',
    'Props Master',
    'Decoración',
    'Especialistas'
  ],

  [Department.MONTAJE]: [
    'Editor',
    'Montajista',
    'Asistente de Montaje',
    'Edición',
    'Colorista'
  ],

  [Department.SONIDO]: [
    'Director de Sonido',
    'Sonidista',
    'Microfonista',
    'Diseñador de Sonido',
    'Editor de Diálogos',
    'Mezclador'
  ],

  [Department.MUSICA]: [
    'Compositor',
    'Director Musical',
    'Arreglador',
    'Supervisor Musical',
    'Música',
    'Composición'
  ],

  [Department.VESTUARIO]: [
    'Diseñador de Vestuario',
    'Vestuarista',
    'Asistente de Vestuario',
    'Ambientador de Vestuario'
  ],

  [Department.MAQUILLAJE]: [
    'Maquillador Principal',
    'Caracterizador',
    'Efectos Especiales de Maquillaje',
    'Peluquero',
    'Asistente de Maquillaje',
    'Maquillaje'
  ],

  [Department.EFECTOS]: [
    'Supervisor de Efectos Especiales',
    'Efectos Especiales',
    'Pirotecnia',
    'Efectos Mecánicos',
    'Supervisor de VFX',
    'Artista VFX',
    'Coordinador VFX',
    'Editor VFX',
    'Efectos Visuales',
    'Director de Animación',
    'Animador',
    'Asistente de Animación',
    'Animación'
  ]
} as const

// Roles principales (primeros de cada departamento + algunos específicos)
const MAIN_ROLES = [
  'Director',
  'Productor Ejecutivo',
  'Productor',
  'Guionista',
  'Director de Fotografía',
  'Director de Arte',
  'Editor',
  'Director de Sonido',
  'Compositor',
  'Diseñador de Vestuario',
  'Maquillador Principal',
  'Supervisor de Efectos Especiales',
  'Supervisor de VFX'
]

export async function POST() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    let created = 0
    let skipped = 0

    console.log('Iniciando seeding de roles...')

    for (const [department, roleNames] of Object.entries(INITIAL_ROLES_BY_DEPARTMENT)) {
      console.log(`Procesando departamento: ${department}`)

      for (let i = 0; i < roleNames.length; i++) {
        const roleName = roleNames[i]
        const roleSlug = createSlug(roleName)

        // Verificar si el rol ya existe
        const existingRole = await prisma.role.findUnique({
          where: { slug: roleSlug }
        })

        if (existingRole) {
          console.log(`Rol "${roleName}" ya existe`)
          skipped++
          continue
        }

        // Determinar si es rol principal
        const isMainRole = MAIN_ROLES.includes(roleName)

        // Crear rol
        await prisma.role.create({
          data: {
            name: roleName,
            slug: roleSlug,
            department: department as Department,
            isMainRole,
            isActive: true
          }
        })

        console.log(`Creado rol: ${roleName}${isMainRole ? ' (Principal)' : ''}`)
        created++
      }
    }

    console.log(`Seeding completado: ${created} roles creados, ${skipped} omitidos`)

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Se crearon ${created} roles nuevos (${skipped} ya existían)`
    })

  } catch (error) {
    console.error('Error en seeding:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
