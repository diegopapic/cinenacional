import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test 1: Verificar que Prisma funciona
    const movieCount = await prisma.movie.count()
    const personCount = await prisma.person.count()
    
    // Test 2: Obtener una película de muestra
    const sampleMovie = await prisma.movie.findFirst({
      select: {
        id: true,
        title: true,
        slug: true
      }
    })
    
    // Test 3: Obtener una persona de muestra
    const samplePerson = await prisma.person.findFirst({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true
      }
    })
    
    return NextResponse.json({
      status: 'ok',
      counts: {
        movies: movieCount,
        people: personCount
      },
      samples: {
        movie: sampleMovie,
        person: samplePerson
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}