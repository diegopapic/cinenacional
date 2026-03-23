import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prismaBase } from '@/lib/prisma'
import { FilmReviewHero } from '@/components/film/film-review-hero'
import { FilmReviewContent } from '@/components/film/film-review-content'

interface PageProps {
  params: Promise<{
    slug: string
    reviewId: string
  }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  return []
}

function buildCloudinaryUrl(publicId: string, width = 1280): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},q_auto,f_auto/${publicId}`
}

function formatPersonName(person: { firstName?: string | null; lastName?: string | null }): string {
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre'
}

function formatPublishDate(year?: number | null, month?: number | null, day?: number | null): string {
  if (!year) return ''

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  if (day && month) {
    return `${day} de ${months[month - 1]} de ${year}`
  }
  if (month) {
    return `${months[month - 1]} de ${year}`
  }
  return String(year)
}

function contentToHtml(content: string): string {
  // Si ya tiene tags HTML, devolver tal cual
  if (/<[a-z][\s\S]*>/i.test(content)) return content
  // Texto plano: convertir doble salto de línea en párrafos, simple en <br>
  return content
    .split(/\n\s*\n/)
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

async function getReviewData(slug: string, reviewId: number) {
  const review = await prismaBase.movieReview.findFirst({
    where: {
      id: reviewId,
      movie: { slug },
    },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      publishYear: true,
      publishMonth: true,
      publishDay: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          slug: true,
        },
      },
      mediaOutlet: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      movie: {
        select: {
          id: true,
          slug: true,
          title: true,
          year: true,
          posterUrl: true,
          images: {
            select: { cloudinaryPublicId: true },
            take: 1,
          },
          crew: {
            where: {
              role: { department: 'DIRECCION' },
            },
            select: {
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                  slug: true,
                },
              },
            },
            orderBy: { billingOrder: 'asc' },
            take: 1,
          },
        },
      },
    },
  })

  return review
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, reviewId } = await params
  const id = parseInt(reviewId, 10)
  if (isNaN(id)) return { title: 'Crítica no encontrada — cinenacional.com' }

  const review = await getReviewData(slug, id)

  if (!review) {
    return {
      title: 'Crítica no encontrada — cinenacional.com',
      description: 'La crítica que buscás no existe o fue eliminada.',
    }
  }

  const authorName = review.author ? formatPersonName(review.author) : null
  const headline = review.title || `Crítica de ${review.movie.title}`
  const description = review.summary
    || `Crítica de ${review.movie.title} (${review.movie.year})${authorName ? ` por ${authorName}` : ''}${review.mediaOutlet ? ` en ${review.mediaOutlet.name}` : ''}.`

  return {
    title: `${headline} - ${review.movie.title} (${review.movie.year}) — cinenacional.com`,
    description,
    openGraph: {
      title: headline,
      description,
      type: 'article',
    },
  }
}

export default async function FilmReviewPage({ params }: PageProps) {
  const { slug, reviewId } = await params
  const id = parseInt(reviewId, 10)
  if (isNaN(id)) notFound()

  const review = await getReviewData(slug, id)
  if (!review || !review.content) notFound()

  const movie = review.movie
  const director = movie.crew[0]?.person
  const heroImage = movie.images[0]

  const posterSrc = movie.posterUrl || ''
  const heroSrc = heroImage
    ? buildCloudinaryUrl(heroImage.cloudinaryPublicId)
    : posterSrc

  const filmHref = `/pelicula/${movie.slug}`
  const directorName = director ? formatPersonName(director) : 'Director desconocido'
  const directorHref = director ? `/persona/${director.slug}` : filmHref

  const authorName = review.author ? formatPersonName(review.author) : 'Autor desconocido'
  const authorHref = review.author ? `/persona/${review.author.slug}` : undefined
  const publicationName = review.mediaOutlet?.name || ''
  const publicationHref = review.mediaOutlet?.url || undefined
  const date = formatPublishDate(review.publishYear, review.publishMonth, review.publishDay)

  return (
    <main>
      <FilmReviewHero
        title={movie.title}
        year={movie.year ?? 0}
        posterSrc={posterSrc}
        heroSrc={heroSrc}
        director={directorName}
        directorHref={directorHref}
        filmHref={filmHref}
      />
      <FilmReviewContent
        headline={review.title || `Crítica de ${movie.title}`}
        lead={review.summary || undefined}
        author={authorName}
        authorHref={authorHref}
        publication={publicationName}
        publicationHref={publicationHref}
        date={date}
        body={contentToHtml(review.content)}
      />
    </main>
  )
}
