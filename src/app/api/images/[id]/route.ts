// src/app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { imageFormSchema } from '@/lib/images/imageTypes'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'
import { deleteCloudinaryImage } from '@/lib/cloudinary'

// GET - Obtener imagen por ID
export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: paramId } = await params
  const id = parseInt(paramId)

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
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: paramId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const id = parseInt(paramId)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  const body = await request.json()

  const validatedData = imageFormSchema.parse(body)
  const { people, ...imageData } = validatedData

  // Obtener el publicId anterior para eliminar de Cloudinary si cambió
  const existingImage = await prisma.image.findUnique({
    where: { id },
    select: { cloudinaryPublicId: true }
  })

  if (!existingImage) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  const oldPublicId = existingImage.cloudinaryPublicId
  const newPublicId = imageData.cloudinaryPublicId

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

  // Si el publicId cambió, eliminar la imagen vieja de Cloudinary
  if (oldPublicId && oldPublicId !== newPublicId) {
    deleteCloudinaryImage(oldPublicId).catch(() => {})
  }

  return NextResponse.json(image)
}, 'actualizar imagen')

// DELETE - Eliminar imagen
export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: paramId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const id = parseInt(paramId)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  // Obtener el publicId antes de borrar el registro
  const image = await prisma.image.findUnique({
    where: { id },
    select: { cloudinaryPublicId: true }
  })

  if (!image) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  await prisma.image.delete({
    where: { id }
  })

  // Eliminar de Cloudinary (fire-and-forget)
  if (image.cloudinaryPublicId) {
    deleteCloudinaryImage(image.cloudinaryPublicId).catch(() => {})
  }

  return new NextResponse(null, { status: 204 })
}, 'eliminar imagen')
