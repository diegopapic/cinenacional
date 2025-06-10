// =====================================================
// src/app/api/genres/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/genres - Listar todos los géneros
export async function GET() {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(genres)
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Error al obtener los géneros' },
      { status: 500 }
    )
  }
}
