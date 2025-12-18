// src/app/api/images/hero/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/images/hero - Obtener imágenes para el hero (una por película)
export async function GET(request: NextRequest) {
  try {
    // Primero: obtener las últimas 5 películas que tienen imágenes
    const moviesWithImages = await prisma.movie.findMany({
      where: {
        images: {
          some: {} // Películas que tienen al menos una imagen
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        id: true
      }
    })

    if (moviesWithImages.length === 0) {
      return NextResponse.json({ images: [] })
    }

    const movieIds = moviesWithImages.map(m => m.id)

    // Segundo: obtener todas las imágenes de esas películas
    const images = await prisma.image.findMany({
      where: {
        movieId: { in: movieIds }
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            year: true,        // Año de producción (prioridad)
            releaseYear: true, // Año de estreno (fallback)
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

    // Tercero: agrupar por película y elegir una al azar de cada una
    const imagesByMovie = new Map<number, typeof images>()
    
    for (const image of images) {
      if (image.movieId) {
        const existing = imagesByMovie.get(image.movieId) || []
        existing.push(image)
        imagesByMovie.set(image.movieId, existing)
      }
    }

    // Seleccionar una imagen al azar de cada película
    const heroImages: typeof images = []
    
    for (const movieId of movieIds) {
      const movieImages = imagesByMovie.get(movieId)
      if (movieImages && movieImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * movieImages.length)
        heroImages.push(movieImages[randomIndex])
      }
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