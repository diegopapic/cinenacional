// =====================================================
// src/app/api/languages/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/languages - Listar todos los idiomas
export async function GET() {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(languages)
  } catch (error) {
    console.error('Error fetching languages:', error)
    return NextResponse.json(
      { error: 'Error al obtener los idiomas' },
      { status: 500 }
    )
  }
}