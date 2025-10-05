import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/color-types - Listar todos los tipos de color
export async function GET() {
  try {
    const colorTypes = await prisma.colorType.findMany({
      orderBy: { displayOrder: 'asc' }
    })

    return NextResponse.json(colorTypes)
  } catch (error) {
    console.error('Error fetching color types:', error)
    return NextResponse.json(
      { error: 'Error al obtener los tipos de color' },
      { status: 500 }
    )
  }
}