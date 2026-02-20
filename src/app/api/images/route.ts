// src/app/api/images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imageFormSchema } from '@/lib/images/imageTypes'
import { requireAuth } from '@/lib/auth'

// GET - Listar imágenes (con filtro opcional por movieId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movieId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (movieId) {
      where.movieId = parseInt(movieId)
    }

    const [images, totalCount] = await Promise.all([
      prisma.image.findMany({
        where,
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              releaseYear: true
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.image.count({ where })
    ])

    return NextResponse.json({
      data: images,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + images.length < totalCount
    })
  } catch (error) {
    console.error('Error fetching images:', error)
    return NextResponse.json(
      { error: 'Error al obtener imágenes' },
      { status: 500 }
    )
  }
}

// POST - Crear imagen
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    
    // Validar datos
    const validatedData = imageFormSchema.parse(body)
    
    const { people, ...imageData } = validatedData

    // Crear imagen con personas en una transacción
    const image = await prisma.$transaction(async (tx) => {
      // Crear la imagen
      const newImage = await tx.image.create({
        data: {
          cloudinaryPublicId: imageData.cloudinaryPublicId,
          type: imageData.type,
          photoDate: imageData.photoDate ? new Date(imageData.photoDate) : null,
          photographerCredit: imageData.photographerCredit,
          eventName: imageData.eventName,
          movieId: imageData.movieId
        }
      })

      // Crear relaciones con personas si hay
      if (people && people.length > 0) {
        await tx.imagePerson.createMany({
          data: people.map(p => ({
            imageId: newImage.id,
            personId: p.personId,
            position: p.position
          }))
        })
      }

      // Retornar imagen con relaciones
      return tx.image.findUnique({
        where: { id: newImage.id },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              releaseYear: true
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
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Error creating image:', error)
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Ya existe una imagen con ese ID de Cloudinary' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error al crear imagen' },
      { status: 500 }
    )
  }
}