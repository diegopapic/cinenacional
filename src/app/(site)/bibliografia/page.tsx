import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Bibliografía — cinenacional.com',
  description: 'Bibliografía de referencia sobre cine argentino utilizada en cinenacional.com.',
  alternates: { canonical: 'https://cinenacional.com/bibliografia' },
}

interface BookWithAuthors {
  id: number
  title: string
  publisher: string | null
  publishYear: number | null
  authors: {
    order: number
    person: {
      firstName: string | null
      lastName: string | null
    }
  }[]
}

async function getBooks(): Promise<BookWithAuthors[]> {
  const books = await prisma.book.findMany({
    include: {
      authors: {
        include: {
          person: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  // Sort by first author's last name, then by publish year
  return books.sort((a, b) => {
    const lastA = (a.authors[0]?.person.lastName || '').toLowerCase()
    const lastB = (b.authors[0]?.person.lastName || '').toLowerCase()
    const cmp = lastA.localeCompare(lastB, 'es')
    if (cmp !== 0) return cmp
    return (a.publishYear || 0) - (b.publishYear || 0)
  })
}

/**
 * Format authors for bibliographic citation.
 * All authors: "Apellido, Nombre".
 * Joined with " y " for two authors, ", " + " y " for three or more.
 */
function formatAuthors(authors: BookWithAuthors['authors']): string {
  if (authors.length === 0) return ''

  const names = authors.map((a) => {
    const first = a.person.firstName || ''
    const last = a.person.lastName || ''
    return last ? `${last}, ${first}`.trim().replace(/,\s*$/, '') : first
  })

  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

export default async function BibliografiaPage() {
  const books = await getBooks()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-8 md:py-16">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Bibliografía
      </h1>

      <div className="prose prose-invert prose-sm mt-8 max-w-none text-muted-foreground/80 [&_p]:leading-relaxed [&_p]:mb-4">
        {books.length === 0 ? (
          <p>No hay libros cargados todavía.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-3">
            {books.map((book) => (
              <li key={book.id}>
                {formatAuthors(book.authors)}
                {book.publishYear ? `. ${book.publishYear}. ` : '. '}
                <em>{book.title}</em>
                {book.publisher ? `. ${book.publisher}.` : '.'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
