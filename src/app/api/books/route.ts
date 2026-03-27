// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createSlug } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { z, ZodError } from 'zod'
import { sanitizeValidationError } from '@/lib/api/api-handler'

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

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: INCLUDE,
      orderBy: { title: 'asc' },
    })

    return NextResponse.json(books.map(b => formatBook(b as unknown as Record<string, unknown>)))
  } catch (error) {
    log.error('Error fetching books', error)
    return NextResponse.json({ error: 'Error al obtener los libros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const data = bookSchema.parse(body)

    // Generate unique slug from title
    const baseSlug = createSlug(data.title)
    let slug = baseSlug
    let counter = 1
    while (await prisma.book.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const book = await prisma.book.create({
      data: {
        title: data.title,
        slug,
        publisher: data.publisher,
        publishYear: data.publishYear,
        authors: {
          create: data.authorIds.map((personId, index) => ({
            personId,
            order: index,
          })),
        },
      },
      include: INCLUDE,
    })

    return NextResponse.json(formatBook(book as unknown as Record<string, unknown>), { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', ...sanitizeValidationError(error) },
        { status: 400 }
      )
    }
    log.error('Error creating book', error)
    return NextResponse.json({ error: 'Error al crear el libro' }, { status: 500 })
  }
}
