// src/app/api/images/hero/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/images/hero - Obtener imágenes para el hero (una por película)
export async function GET(request: NextRequest) {
  try {
    // Obtener las últimas 50 imágenes ordenadas por fecha de creación
    const recentImages = await prisma.image.findMany({
      where: {
        movieId: { not: null }  // Solo imágenes asociadas a películas
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            releaseYear: true,
            slug: true
          }
        },
        people: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    })

    // Agrupar por película y seleccionar una imagen al azar de cada una
    const movieImagesMap = new Map<number, typeof recentImages>()
    
    for (const image of recentImages) {
      if (image.movieId) {
        const existing = movieImagesMap.get(image.movieId) || []
        existing.push(image)
        movieImagesMap.set(image.movieId, existing)
      }
    }

    // Obtener las primeras 5 películas (las más recientes) y elegir una imagen al azar de cada una
    const heroImages: typeof recentImages = []
    const movieIds = Array.from(movieImagesMap.keys()).slice(0, 5)

    for (const movieId of movieIds) {
      const images = movieImagesMap.get(movieId)!
      // Seleccionar una imagen al azar de esta película
      const randomIndex = Math.floor(Math.random() * images.length)
      heroImages.push(images[randomIndex])
    }

    return NextResponse.json({
      images: heroImages
    })
  } catch (error) {
    console.error('Error fetching hero images:', error)
    return NextResponse.json(
      { error: 'Error al obtener imágenes del hero', images: [] },
      { status: 500 }
    )
  }
}