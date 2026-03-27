// src/app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createSlug } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { z, ZodError } from 'zod'
import { sanitizeValidationError } from '@/lib/api/api-handler'
import { parseId } from '@/lib/api/crud-factory'

const log = createLogger('api:books')

const bookSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(500).transform(s => s.trim()),
  publisher: z.string().max(255).optional().transform(s => s?.trim() || null),
  publishYear: z.number().int().min(1800).max(2100).optional().nullable(),
  authorIds: z.array(z.number().int().positive()).min(1, 'Se requiere al menos un autor'),
})

const INCLUDE = {
  authors: {
    include: { person: { select: { id: true, firstName: true, lastName: true, slug: true } } },
    orderBy: { order: 'asc' as const },
  },
}

function formatBook(book: Record<string, unknown>) {
  const authors = book.authors as Array<{
    id: number
    order: number
    person: { id: number; firstName: string | null; lastName: string | null; slug: string }
  }>
  return {
    ...book,
    authors: authors.map(a => ({
      id: a.person.id,
      name: [a.person.firstName, a.person.lastName].filter(Boolean).join(' ') || 'Sin nombre',
      slug: a.person.slug,
      order: a.order,
    })),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseId(idStr)
    if (id === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const book = await prisma.book.findUnique({
      where: { id },
      include: INCLUDE,
    })

    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    return NextResponse.json(formatBook(book as unknown as Record<string, unknown>))
  } catch (error) {
    log.error('Error fetching book', error)
    return NextResponse.json({ error: 'Error al obtener el libro' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id: idStr } = await params
    const id = parseId(idStr)
    if (id === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const existing = await prisma.book.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const data = bookSchema.parse(body)

    // Regenerate slug if title changed
    let slug = existing.slug
    if (data.title !== existing.title) {
      const baseSlug = createSlug(data.title)
      slug = baseSlug
      let counter = 1
      while (true) {
        const conflict = await prisma.book.findFirst({
          where: { slug, NOT: { id } },
        })
        if (!conflict) break
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }

    const book = await prisma.book.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        publisher: data.publisher,
        publishYear: data.publishYear,
        authors: {
          deleteMany: {},
          create: data.authorIds.map((personId, index) => ({
            personId,
            order: index,
          })),
        },
      },
      include: INCLUDE,
    })

    return NextResponse.json(formatBook(book as unknown as Record<string, unknown>))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', ...sanitizeValidationError(error) },
        { status: 400 }
      )
    }
    log.error('Error updating book', error)
    return NextResponse.json({ error: 'Error al actualizar el libro' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id: idStr } = await params
    const id = parseId(idStr)
    if (id === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const book = await prisma.book.findUnique({ where: { id } })
    if (!book) {
      return NextResponse.json({ error: 'Libro no encontrado' }, { status: 404 })
    }

    await prisma.book.delete({ where: { id } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    log.error('Error deleting book', error)
    return NextResponse.json({ error: 'Error al eliminar el libro' }, { status: 500 })
  }
}
