// src/app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imageFormSchema } from '@/lib/images/imageTypes'
import { requireAuth } from '@/lib/auth'

// GET - Obtener imagen por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const image = await prisma.image.findUnique({
      where: { id },
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

    if (!image) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error fetching image:', error)
    return NextResponse.json(
      { error: 'Error al obtener imagen' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar imagen
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)
    const body = await request.json()
    
    const validatedData = imageFormSchema.parse(body)
    const { people, ...imageData } = validatedData

    const image = await prisma.$transaction(async (tx) => {
      // Actualizar imagen
      await tx.image.update({
        where: { id },
        data: {
          cloudinaryPublicId: imageData.cloudinaryPublicId,
          type: imageData.type,
          photoDate: imageData.photoDate ? new Date(imageData.photoDate) : null,
          photographerCredit: imageData.photographerCredit,
          eventName: imageData.eventName,
          movieId: imageData.movieId
        }
      })

      // Eliminar personas existentes y crear nuevas
      await tx.imagePerson.deleteMany({
        where: { imageId: id }
      })

      if (people && people.length > 0) {
        await tx.imagePerson.createMany({
          data: people.map(p => ({
            imageId: id,
            personId: p.personId,
            position: p.position
          }))
        })
      }

      // Retornar imagen actualizada
      return tx.image.findUnique({
        where: { id },
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

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error updating image:', error)
    return NextResponse.json(
      { error: 'Error al actualizar imagen' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar imagen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)
    
    await prisma.image.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Error al eliminar imagen' },
      { status: 500 }
    )
  }
}