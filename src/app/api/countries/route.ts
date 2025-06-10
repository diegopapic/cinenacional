// =====================================================
// src/app/api/countries/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/countries - Listar todos los países
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' }
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