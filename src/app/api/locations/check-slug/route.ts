// src/app/api/locations/check-slug/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/utils/slugs'

// POST /api/locations/check-slug - Verificar si un slug está disponible
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, excludeId } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { available: false, slug: '', error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 1
    let available = false

    // Buscar un slug disponible
    while (!available) {
      const where: any = { slug }
      if (excludeId) {
        where.NOT = { id: parseInt(excludeId) }
      }

      const exists = await prisma.location.findFirst({ where })
      
      if (!exists) {
        available = true
      } else {
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }

    return NextResponse.json({ available: true, slug })
  } catch (error) {
    console.error('Error checking slug:', error)
    return NextResponse.json(
      { available: false, slug: '', error: 'Error al verificar el slug' },
      { status: 500 }
    )
  }
}