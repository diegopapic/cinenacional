// src/app/api/images/hero/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'

// Esta ruta debe ser dinámica
export const dynamic = 'force-dynamic';

// GET /api/images/hero - Obtener imágenes para el hero (una por película)
export const GET = apiHandler(async (request: NextRequest) => {
  // Primero: obtener las 5 películas cuya imagen más reciente es la más nueva
  const moviesWithLatestImage = await prisma.$queryRaw<{ movie_id: number }[]>`
    SELECT movie_id FROM images
    WHERE movie_id IS NOT NULL
    GROUP BY movie_id
    ORDER BY MAX(created_at) DESC
    LIMIT 5
  `

  if (moviesWithLatestImage.length === 0) {
    return NextResponse.json({ images: [] })
  }

  const movieIds = moviesWithLatestImage.map(m => m.movie_id)

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
              lastName: true,
              slug: true
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
}, 'obtener imágenes del hero')
