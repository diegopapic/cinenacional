// src/lib/queries/home.ts
// Server-side data fetching for the home page.
// Extracts Prisma queries from /api/movies/home-feed and /api/images/hero.

import { prisma } from '@/lib/prisma'
import type { Efemeride, DirectorInfo, SimpleMovie, SimplePerson } from '@/types/home.types'
import { formatearEfemeride } from '@/lib/utils/efemerides'

// ─── Types ────────────────────────────────────────────────────────

// HomeMovie type matches MovieWithRelease shape expected by MoviesGrid/MovieCard
export interface HomeMovie {
  id: number
  slug: string
  title: string
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  posterUrl: string | null
  genres: { genre: { name: string } }[]
  crew: {
    roleId: number
    person: { firstName: string | null; lastName: string | null }
  }[]
}

// HeroImage type is inferred from getHeroImages return type (exported below)

export interface HomeObituario {
  id: number
  slug: string
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
}

export interface HomeData {
  ultimosEstrenos: HomeMovie[]
  proximosEstrenos: HomeMovie[]
  ultimasPeliculas: SimpleMovie[]
  ultimasPersonas: SimplePerson[]
  heroImages: Awaited<ReturnType<typeof getHeroImages>>
  obituarios: HomeObituario[]
  efemerides: Efemeride[]
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractDirectors(
  crew: { person: { slug: string; firstName: string | null; lastName: string | null } }[]
): DirectorInfo[] {
  return crew
    .map(c => ({
      name: `${c.person.firstName || ''} ${c.person.lastName || ''}`.trim(),
      slug: c.person.slug,
    }))
    .filter(d => d.name)
}

function calcularFechaEfectivaPersona(
  person: { deathYear: number | null; deathMonth: number | null; deathDay: number | null }
): Date {
  const year = person.deathYear!
  const month = person.deathMonth || 12
  const day = person.deathDay || new Date(year, month, 0).getDate()
  return new Date(year, month - 1, day)
}

function pickRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return arr
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// ─── Queries ──────────────────────────────────────────────────────

const directorCrewSelect = {
  where: { roleId: 2 },
  select: {
    roleId: true,
    person: {
      select: { firstName: true, lastName: true },
    },
  },
  take: 3,
} as const

const movieWithReleasesSelect = {
  id: true,
  slug: true,
  title: true,
  releaseYear: true,
  releaseMonth: true,
  releaseDay: true,
  posterUrl: true,
  genres: {
    select: { genre: { select: { name: true } } },
    take: 3,
  },
  crew: directorCrewSelect,
} as const

export async function getHomeFeed(): Promise<HomeData> {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()

  const [
    ultimosEstrenosRaw,
    proximosEstrenosRaw,
    ultimasPeliculas,
    ultimasPersonasRaw,
    heroImagesRaw,
    obituariosRaw,
    efemeridesRaw,
  ] = await Promise.all([
    // 1. Últimos estrenos (ya estrenados)
    prisma.movie.findMany({
      where: {
        AND: [
          { releaseYear: { not: null } },
          { releaseMonth: { not: null } },
          { releaseDay: { not: null } },
          {
            OR: [
              { releaseYear: { lt: currentYear } },
              {
                AND: [
                  { releaseYear: currentYear },
                  { releaseMonth: { lt: currentMonth } },
                ],
              },
              {
                AND: [
                  { releaseYear: currentYear },
                  { releaseMonth: currentMonth },
                  { releaseDay: { lte: currentDay } },
                ],
              },
            ],
          },
        ],
      },
      select: movieWithReleasesSelect,
      orderBy: [
        { releaseYear: 'desc' },
        { releaseMonth: 'desc' },
        { releaseDay: 'desc' },
      ],
      take: 6,
    }),

    // 2. Próximos estrenos (futuros)
    prisma.movie.findMany({
      where: {
        AND: [
          { releaseYear: { not: null } },
          {
            OR: [
              { releaseYear: { gt: currentYear } },
              {
                AND: [
                  { releaseYear: currentYear },
                  { releaseMonth: { gt: currentMonth } },
                ],
              },
              {
                AND: [
                  { releaseYear: currentYear },
                  { releaseMonth: currentMonth },
                  { releaseDay: { gt: currentDay } },
                ],
              },
            ],
          },
        ],
      },
      select: movieWithReleasesSelect,
      orderBy: [
        { releaseYear: 'asc' },
        { releaseMonth: 'asc' },
        { releaseDay: 'asc' },
      ],
      take: 6,
    }),

    // 3. Últimas películas ingresadas
    prisma.movie.findMany({
      select: { id: true, slug: true, title: true, posterUrl: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),

    // 4. Últimas personas ingresadas
    prisma.person.findMany({
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        gender: true,
        _count: { select: { castRoles: true, crewRoles: true, reviews: true, bookAuthorship: true } },
        crewRoles: {
          select: {
            role: { select: { name: true } },
            movie: { select: { id: true, createdAt: true } },
          },
          orderBy: { movie: { createdAt: 'desc' } },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // 5. Hero images
    getHeroImages(),

    // 6. Obituarios recientes (3 más recientes)
    getHomeObituarios(),

    // 7. Efemérides del día (3 aleatorias)
    getHomeEfemerides(),
  ])

  // Cast Prisma results to HomeMovie (shapes match since we don't flatten genres)
  const formatMovies = (movies: typeof ultimosEstrenosRaw): HomeMovie[] =>
    movies as unknown as HomeMovie[]

  // Format personas con rol
  const ultimasPersonas: SimplePerson[] = ultimasPersonasRaw.map(person => {
    const { _count, crewRoles, ...personData } = person

    let role: string
    if (_count.castRoles > _count.crewRoles) {
      role =
        person.gender === 'MALE'
          ? 'Actor'
          : person.gender === 'FEMALE'
            ? 'Actriz'
            : 'Actor/Actriz'
    } else if (_count.crewRoles > 0 && crewRoles.length > 0) {
      const lastMovieId = crewRoles[0]?.movie?.id
      if (lastMovieId) {
        const rolesInLastMovie = crewRoles
          .filter(cr => cr.movie?.id === lastMovieId)
          .map(cr => cr.role?.name)
          .filter((r): r is string => !!r)
        const uniqueRoles = [...new Set(rolesInLastMovie)]
        role = uniqueRoles.length > 0 ? uniqueRoles.join(', ') : 'Equipo técnico'
      } else {
        role = 'Equipo técnico'
      }
    } else if (_count.bookAuthorship > 0) {
      role = person.gender === 'FEMALE' ? 'Autora de bibliografía' : 'Autor de bibliografía'
    } else if (_count.reviews > 0) {
      role = person.gender === 'FEMALE' ? 'Crítica' : 'Crítico'
    } else {
      role = 'Profesional del cine'
    }

    return { ...personData, role } as SimplePerson
  })

  return {
    ultimosEstrenos: formatMovies(ultimosEstrenosRaw),
    proximosEstrenos: formatMovies(proximosEstrenosRaw),
    ultimasPeliculas: ultimasPeliculas as SimpleMovie[],
    ultimasPersonas,
    heroImages: heroImagesRaw,
    obituarios: obituariosRaw,
    efemerides: efemeridesRaw,
  }
}

// ─── Hero Images ──────────────────────────────────────────────────

export async function getHeroImages() {
  // Step 1: Get 5 movies with most recent images
  const moviesWithLatestImage = await prisma.$queryRaw<{ movie_id: number }[]>`
    SELECT movie_id FROM images
    WHERE movie_id IS NOT NULL
    GROUP BY movie_id
    ORDER BY MAX(created_at) DESC
    LIMIT 5
  `

  if (moviesWithLatestImage.length === 0) return []

  const movieIds = moviesWithLatestImage.map(m => m.movie_id)

  // Step 2: Get all images for those movies
  const images = await prisma.image.findMany({
    where: { movieId: { in: movieIds } },
    include: {
      movie: {
        select: { id: true, title: true, year: true, releaseYear: true, slug: true },
      },
      people: {
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true, slug: true },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  })

  // Step 3: Group by movie, pick one random per movie
  const imagesByMovie = new Map<number, typeof images>()
  for (const image of images) {
    if (image.movieId) {
      const existing = imagesByMovie.get(image.movieId) || []
      existing.push(image)
      imagesByMovie.set(image.movieId, existing)
    }
  }

  const heroImages: typeof images = []
  for (const movieId of movieIds) {
    const movieImages = imagesByMovie.get(movieId)
    if (movieImages && movieImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * movieImages.length)
      heroImages.push(movieImages[randomIndex])
    }
  }

  return heroImages
}

// ─── Home Obituarios ──────────────────────────────────────────────

async function getHomeObituarios(): Promise<HomeObituario[]> {
  const people = await prisma.person.findMany({
    where: { deathYear: { not: null } },
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      deathYear: true,
      deathMonth: true,
      deathDay: true,
      birthYear: true,
      birthMonth: true,
      birthDay: true,
    },
    orderBy: [
      { deathYear: 'desc' },
      { deathMonth: 'desc' },
      { deathDay: 'desc' },
    ],
    take: 50,
  })

  // Sort by effective death date and take 3
  return people
    .filter(p => p.deathYear)
    .sort(
      (a, b) =>
        calcularFechaEfectivaPersona(b).getTime() -
        calcularFechaEfectivaPersona(a).getTime()
    )
    .slice(0, 3)
}

// ─── Home Efemérides ──────────────────────────────────────────────

async function getHomeEfemerides(): Promise<Efemeride[]> {
  const hoy = new Date()
  const dia = hoy.getDate()
  const mes = hoy.getMonth() + 1

  const directorSelect = {
    where: { roleId: 2 },
    select: {
      person: {
        select: { slug: true, firstName: true, lastName: true },
      },
    },
  } as const

  const [peliculasEstreno, personasNacimiento, personasMuerte] =
    await Promise.all([
      prisma.movie.findMany({
        where: { releaseDay: dia, releaseMonth: mes, releaseYear: { not: null } },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseYear: true,
          releaseMonth: true,
          releaseDay: true,
          posterUrl: true,
          crew: directorSelect,
        },
      }),
      prisma.person.findMany({
        where: { birthDay: dia, birthMonth: mes, birthYear: { not: null } },
        select: {
          id: true, slug: true, firstName: true, lastName: true,
          birthYear: true, birthMonth: true, birthDay: true, photoUrl: true,
        },
      }),
      prisma.person.findMany({
        where: { deathDay: dia, deathMonth: mes, deathYear: { not: null } },
        select: {
          id: true, slug: true, firstName: true, lastName: true,
          deathYear: true, deathMonth: true, deathDay: true, photoUrl: true,
        },
      }),
    ])

  const efemerides: (Efemeride | null)[] = []

  // Estrenos
  for (const pelicula of peliculasEstreno) {
    const directors = extractDirectors(pelicula.crew)
    efemerides.push(
      formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'estreno',
        año: pelicula.releaseYear!,
        mes: pelicula.releaseMonth!,
        dia: pelicula.releaseDay!,
        fecha: new Date(pelicula.releaseYear!, pelicula.releaseMonth! - 1, pelicula.releaseDay!),
        titulo: pelicula.title,
        directors,
        directorSlug: directors[0]?.slug,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined,
      })
    )
  }

  // Nacimientos
  for (const persona of personasNacimiento) {
    const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim()
    efemerides.push(
      formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'nacimiento',
        año: persona.birthYear!,
        mes: persona.birthMonth!,
        dia: persona.birthDay!,
        fecha: new Date(persona.birthYear!, persona.birthMonth! - 1, persona.birthDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined,
      })
    )
  }

  // Muertes
  for (const persona of personasMuerte) {
    const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim()
    efemerides.push(
      formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'muerte',
        año: persona.deathYear!,
        mes: persona.deathMonth!,
        dia: persona.deathDay!,
        fecha: new Date(persona.deathYear!, persona.deathMonth! - 1, persona.deathDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined,
      })
    )
  }

  const validas = efemerides
    .filter((e): e is Efemeride => e !== null)
    .sort((a, b) => {
      const añosA = parseInt(a.hace.match(/\d+/)?.[0] || '0')
      const añosB = parseInt(b.hace.match(/\d+/)?.[0] || '0')
      return añosA - añosB
    })

  return pickRandom(validas, 3)
}
