// =====================================================
// src/app/api/companies/production/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

// GET /api/companies/production - Listar productoras
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where = search ? {
      name: { contains: search, mode: 'insensitive' as const }
    } : {}

    const companies = await prisma.productionCompany.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching production companies:', error)
    return NextResponse.json(
      { error: 'Error al obtener las productoras' },
      { status: 500 }
    )
  }
}

// POST /api/companies/production - Crear nueva productora
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    let slug = createSlug(body.name)
    let slugExists = await prisma.productionCompany.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.productionCompany.findUnique({ where: { slug } })
      counter++
    }

    const company = await prisma.productionCompany.create({
      data: {
        ...body,
        slug
      }
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating production company:', error)
    return NextResponse.json(
      { error: 'Error al crear la productora' },
      { status: 500 }
    )
  }
}
