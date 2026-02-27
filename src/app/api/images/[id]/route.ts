// src/app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imageFormSchema } from '@/lib/images/imageTypes'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

// GET - Obtener imagen por ID
export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const id = parseInt(params.id)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

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
}, 'obtener imagen')

// PUT - Actualizar imagen
export const PUT = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const id = parseInt(params.id)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

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
}, 'actualizar imagen')

// DELETE - Eliminar imagen
export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const id = parseInt(params.id)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  await prisma.image.delete({
    where: { id }
  })

  return new NextResponse(null, { status: 204 })
}, 'eliminar imagen')
