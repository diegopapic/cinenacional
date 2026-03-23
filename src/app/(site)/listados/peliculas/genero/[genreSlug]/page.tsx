// src/app/(site)/listados/peliculas/genero/[genreSlug]/page.tsx — Server Component
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ServerPagination from '@/components/shared/ServerPagination'

export const revalidate = 3600 // 1h

const PAGE_SIZE = 60

interface PageProps {
  params: Promise<{ genreSlug: string }>
  searchParams: Promise<{ page?: string }>
}

async function getGenre(slug: string) {
  return prisma.genre.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  })
}

async function getMoviesByGenre(genreId: number, page: number) {
  const skip = (page - 1) * PAGE_SIZE

  const [movies, totalCount] = await Promise.all([
    prisma.movie.findMany({
      where: { genres: { some: { genreId } } },
      select: {
        id: true,
        slug: true,
        title: true,
        year: true,
        releaseYear: true,
        posterUrl: true,
        crew: {
          where: { role: { department: 'DIRECTING' } },
          select: {
            person: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { billingOrder: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ releaseYear: 'desc' }, { title: 'asc' }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.movie.count({
      where: { genres: { some: { genreId } } },
    }),
  ])

  return {
    movies: movies.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      year: m.releaseYear || m.year,
      posterUrl: m.posterUrl,
      director: m.crew[0]
        ? [m.crew[0].person.firstName, m.crew[0].person.lastName].filter(Boolean).join(' ')
        : null,
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { genreSlug } = await params
  const genre = await getGenre(genreSlug)
  if (!genre) return {}

  return {
    title: `Películas de ${genre.name} argentinas — cinenacional.com`,
    description: `Listado completo de películas argentinas de ${genre.name.toLowerCase()}. ${genre.description || ''}`.trim(),
    alternates: { canonical: `https://cinenacional.com/listados/peliculas/genero/${genre.slug}` },
  }
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { genreSlug } = await params
  const genre = await getGenre(genreSlug)
  if (!genre) notFound()

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const { movies, totalCount, totalPages } = await getMoviesByGenre(genre.id, page)

  const buildPageHref = (p: number) => {
    const base = `/listados/peliculas/genero/${genre.slug}`
    return p > 1 ? `${base}?page=${p}` : base
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Películas de {genre.name}
      </h1>

      {totalCount > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {totalCount.toLocaleString('es-AR')} película{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {movies.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((movie) => (
            <Link
              key={movie.id}
              href={`/pelicula/${movie.slug}`}
              className="group flex flex-col"
            >
              <div className="relative aspect-2/3 w-full overflow-hidden rounded-xs">
                {movie.posterUrl ? (
                  <Image
                    loader={cloudinaryLoader}
                    fill
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30">
                    <svg className="mb-2 h-10 w-10 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 border border-foreground/4" />
              </div>
              <div className="mt-2">
                <p className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[13px]">
                  {movie.title}
                  {movie.year && (
                    <span className="ml-1 text-[11px] font-normal tabular-nums text-muted-foreground/40">
                      ({movie.year})
                    </span>
                  )}
                </p>
                {movie.director && (
                  <p className="truncate text-[11px] text-muted-foreground/40">
                    Dir: {movie.director}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground/50">No se encontraron películas de {genre.name.toLowerCase()}</p>
        </div>
      )}

      <ServerPagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildPageHref}
      />
    </div>
  )
}
