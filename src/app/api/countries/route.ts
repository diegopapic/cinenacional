// src/app/api/countries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/countries - Listar todos los países con conteo de películas
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    return NextResponse.json(countries)
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json(
      { error: 'Error al obtener los países' },
      { status: 500 }
    )
  }
}

// POST /api/countries - Crear nuevo país
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.code || body.code.trim() === '') {
      return NextResponse.json(
        { error: 'El código del país es requerido' },
        { status: 400 }
      )
    }
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del país es requerido' },
        { status: 400 }
      )
    }
    
    // Validar formato del código
    const code = body.code.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(code)) {
      return NextResponse.json(
        { error: 'El código debe ser de 2 letras mayúsculas (ISO 3166-1 alpha-2)' },
        { status: 400 }
      )
    }
    
    // Verificar si el código ya existe
    const existingCountry = await prisma.country.findUnique({
      where: { code }
    })
    
    if (existingCountry) {
      return NextResponse.json(
        { error: 'Ya existe un país con ese código' },
        { status: 400 }
      )
    }

    // Crear país
    const country = await prisma.country.create({
      data: {
        code,
        name: body.name.trim()
      },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    return NextResponse.json(country, { status: 201 })
  } catch (error) {
    console.error('Error creating country:', error)
    return NextResponse.json(
      { error: 'Error al crear el país' },
      { status: 500 }
    )
  }
}