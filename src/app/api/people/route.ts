// =====================================================
// src/app/api/people/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

// GET /api/people - Listar personas con búsqueda
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { birthName: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {}

    const people = await prisma.person.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        birthDate: true,
        nationality: true
      }
    })

    return NextResponse.json(people)
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json(
      { error: 'Error al obtener las personas' },
      { status: 500 }
    )
  }
}

// POST /api/people - Crear nueva persona
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generar slug único
    let slug = createSlug(body.name)
    let slugExists = await prisma.person.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.person.findUnique({ where: { slug } })
      counter++
    }

    const person = await prisma.person.create({
      data: {
        ...body,
        slug,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        deathDate: body.deathDate ? new Date(body.deathDate) : null
      }
    })

    return NextResponse.json(person, { status: 201 })
  } catch (error) {
    console.error('Error creating person:', error)
    return NextResponse.json(
      { error: 'Error al crear la persona' },
      { status: 500 }
    )
  }
}
