// src/app/api/screening-venues/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { z } from 'zod'

// Schema de validación
const screeningVenueSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['CINEMA', 'STREAMING', 'TV_CHANNEL', 'OTHER']),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional()
})

// GET /api/screening-venues - Listar pantallas de estreno
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (type) {
      where.type = type
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    // Obtener total
    const total = await prisma.screeningVenue.count({ where })

    // Obtener venues sin la relación screenings por ahora
    const venues = await prisma.screeningVenue.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    // Agregar un contador falso de screenings por ahora
    const venuesWithCount = venues.map(venue => ({
      ...venue,
      _count: {
        screenings: 0
      }
    }))

    return NextResponse.json({
      venues: venuesWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching screening venues:', error)
    return NextResponse.json(
      { error: 'Error al obtener las pantallas de estreno' },
      { status: 500 }
    )
  }
}

// POST /api/screening-venues - Crear nueva pantalla de estreno
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos
    const validatedData = screeningVenueSchema.parse(body)
    
    // Generar slug único
    let slug = createSlug(validatedData.name)
    let slugExists = await prisma.screeningVenue.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(validatedData.name)}-${counter}`
      slugExists = await prisma.screeningVenue.findUnique({ where: { slug } })
      counter++
    }

    const venue = await prisma.screeningVenue.create({
      data: {
        ...validatedData,
        slug
      }
    })

    return NextResponse.json(venue, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating screening venue:', error)
    return NextResponse.json(
      { error: 'Error al crear la pantalla de estreno' },
      { status: 500 }
    )
  }
}