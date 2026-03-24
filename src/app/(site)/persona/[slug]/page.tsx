// src/app/persona/[slug]/page.tsx - Server component (SSR)
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { formatPartialDate, MONTHS } from '@/lib/shared/dateUtils'
import DOMPurify from 'isomorphic-dompurify'
import { ImageGallery } from '@/components/movies/ImageGallery'
import { ExternalLinks } from '@/components/shared/ExternalLinks'
import { getPersonPhotoUrl } from '@/lib/images/imageUtils'
import { createLogger } from '@/lib/logger'
import { PersonSchema } from '@/components/people/PersonSchema'
import { BreadcrumbSchema } from '@/components/shared/BreadcrumbSchema'
import { PageViewTracker } from '@/components/people/PageViewTracker'
import { PersonFilmography } from '@/components/people/PersonFilmography'
import type { AllRolesItem, RoleSection } from '@/components/people/PersonFilmography'
import { PersonReviews } from '@/components/people/PersonReviews'

const log = createLogger('page:persona')

export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

// ---------- Prisma queries ----------

async function getPersonData(slug: string) {
  try {
    const person = await prisma.person.findFirst({
      where: { slug, isActive: true },
      include: {
        birthLocation: {
          include: {
            parent: {
              include: {
                parent: {
                  include: { parent: true }
                }
              }
            }
          }
        },
        deathLocation: {
          include: {
            parent: {
              include: {
                parent: {
                  include: { parent: true }
                }
              }
            }
          }
        },
        links: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        nationalities: {
          include: { location: true }
        },
        alternativeNames: {
          orderBy: { createdAt: 'asc' }
        },
        trivia: {
          select: { id: true, content: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' }
        },
        imageAppearances: {
          include: {
            image: {
              include: {
                movie: {
                  select: { id: true, title: true, releaseYear: true }
                },
                people: {
                  include: {
                    person: {
                      select: { id: true, firstName: true, lastName: true }
                    }
                  },
                  orderBy: { position: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    return person
  } catch (error) {
    log.error('Failed to fetch person', error)
    return null
  }
}

async function getPersonRoleSummary(personId: number, gender: string | null): Promise<string[]> {
  try {
    const [hasCastActing, hasCastSelf, crewRoleNames] = await Promise.all([
      prisma.movieCast.findFirst({
        where: { personId, isActor: { not: false } },
        select: { id: true },
      }),
      prisma.movieCast.findFirst({
        where: { personId, isActor: false },
        select: { id: true },
      }),
      prisma.movieCrew.findMany({
        where: { personId },
        select: { role: { select: { name: true } } },
        distinct: ['roleId'],
      }),
    ])

    const roles: string[] = []
    if (hasCastActing) roles.push(gender === 'FEMALE' ? 'actriz' : 'actor')
    if (hasCastSelf) roles.push(gender === 'FEMALE' ? 'aparición como sí misma' : 'aparición como sí mismo')
    for (const cr of crewRoleNames) {
      if (cr.role?.name) roles.push(cr.role.name.toLowerCase())
    }
    return roles
  } catch {
    return []
  }
}

async function getFilmographyData(personId: number) {
  try {
    const [castRoles, crewRoles] = await Promise.all([
      prisma.movieCast.findMany({
        where: { personId },
        select: {
          id: true,
          characterName: true,
          billingOrder: true,
          isPrincipal: true,
          isActor: true,
          movie: {
            select: {
              id: true, slug: true, title: true,
              year: true, releaseYear: true, releaseMonth: true, releaseDay: true,
              posterUrl: true, stage: true, tipoDuracion: true
            }
          }
        },
        orderBy: [
          { movie: { year: 'desc' } },
          { movie: { releaseYear: 'desc' } }
        ]
      }),
      prisma.movieCrew.findMany({
        where: { personId },
        include: {
          movie: {
            select: {
              id: true, slug: true, title: true,
              year: true, releaseYear: true, releaseMonth: true, releaseDay: true,
              posterUrl: true, stage: true, tipoDuracion: true
            }
          },
          role: true
        },
        orderBy: [
          { movie: { year: 'desc' } },
          { movie: { releaseYear: 'desc' } }
        ]
      })
    ])

    return { castRoles, crewRoles }
  } catch (error) {
    log.error('Failed to fetch filmography', error)
    return { castRoles: [], crewRoles: [] }
  }
}

async function getPersonReviews(personId: number) {
  try {
    return await prisma.movieReview.findMany({
      where: { authorId: personId },
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        content: true,
        publishYear: true,
        publishMonth: true,
        publishDay: true,
        movie: {
          select: {
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            crew: {
              where: { role: { department: 'DIRECCION' } },
              select: {
                person: { select: { firstName: true, lastName: true } }
              },
              orderBy: { billingOrder: 'asc' },
              take: 1
            }
          }
        },
        mediaOutlet: {
          select: { name: true }
        }
      },
      orderBy: [
        { publishYear: 'desc' },
        { publishMonth: 'desc' },
        { publishDay: 'desc' }
      ]
    })
  } catch (error) {
    log.error('Failed to fetch person reviews', error)
    return []
  }
}

// ---------- Helpers ----------

function getCreditedLabel(gender?: string | null): string {
  return gender === 'FEMALE' ? 'También acreditada como' : 'También acreditado como'
}

function getEffectiveYear(movie: any): number {
  return movie.year || movie.releaseYear || 0
}

function getEffectiveDate(movie: any): Date {
  if (movie.releaseYear && movie.releaseMonth && movie.releaseDay) {
    return new Date(movie.releaseYear, movie.releaseMonth - 1, movie.releaseDay)
  }
  if (movie.releaseYear && movie.releaseMonth) {
    return new Date(movie.releaseYear, movie.releaseMonth - 1, 1)
  }
  if (movie.releaseYear) return new Date(movie.releaseYear, 0, 1)
  if (movie.year) return new Date(movie.year, 0, 1)
  return new Date(1900, 0, 1)
}

function sortMoviesChronologically<T extends { movie?: any }>(movies: T[], descending = true): T[] {
  const stageOrder: Record<string, number> = {
    EN_DESARROLLO: 1, EN_PRODUCCION: 2, EN_PREPRODUCCION: 3, EN_RODAJE: 4, EN_POSTPRODUCCION: 5
  }

  return [...movies].sort((a, b) => {
    const movieA = a.movie || a
    const movieB = b.movie || b
    const stageA = movieA.stage
    const stageB = movieB.stage
    const isStageAPriority = stageA && stageOrder[stageA] !== undefined
    const isStageBPriority = stageB && stageOrder[stageB] !== undefined

    if (isStageAPriority && isStageBPriority) return stageOrder[stageA] - stageOrder[stageB]
    if (isStageAPriority) return -1
    if (isStageBPriority) return 1

    const yearA = getEffectiveYear(movieA)
    const yearB = getEffectiveYear(movieB)
    if (yearA !== yearB) return descending ? yearB - yearA : yearA - yearB

    const dateA = getEffectiveDate(movieA)
    const dateB = getEffectiveDate(movieB)
    if (dateA.getTime() !== dateB.getTime()) {
      return descending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
    }

    return movieA.title.toLowerCase().localeCompare(movieB.title.toLowerCase())
  })
}

// ---------- Filmography processing ----------

function buildAllRolesList(
  castRoles: any[],
  crewRoles: any[],
  personGender?: string | null
): AllRolesItem[] {
  const movieMap: Record<number, { movie: any; crewRoles: string[]; castRoles: { label: string; isActor: boolean }[] }> = {}

  for (const item of crewRoles) {
    const movieId = item.movie.id
    const roleName = item.role?.name || 'Rol desconocido'
    if (!movieMap[movieId]) {
      movieMap[movieId] = { movie: item.movie, crewRoles: [], castRoles: [] }
    }
    if (!movieMap[movieId].crewRoles.includes(roleName)) {
      movieMap[movieId].crewRoles.push(roleName)
    }
  }

  for (const item of castRoles) {
    const movieId = item.movie.id
    if (!movieMap[movieId]) {
      movieMap[movieId] = { movie: item.movie, crewRoles: [], castRoles: [] }
    }

    let label: string
    if (item.isActor === false) {
      label = personGender === 'FEMALE' ? 'Como sí misma' : 'Como sí mismo'
    } else {
      const actorLabel = personGender === 'FEMALE' ? 'Actriz' : 'Actor'
      label = item.characterName ? `${actorLabel} [${item.characterName}]` : actorLabel
    }

    if (!movieMap[movieId].castRoles.some((c: any) => c.label === label)) {
      movieMap[movieId].castRoles.push({ label, isActor: item.isActor !== false })
    }
  }

  const result: AllRolesItem[] = Object.values(movieMap).map(({ movie, crewRoles: cr, castRoles: ca }) => {
    const sortedCrew = [...cr].sort((a, b) => a.localeCompare(b))
    const sortedCast = [...ca].sort((a, b) => {
      if (a.isActor && !b.isActor) return -1
      if (!a.isActor && b.isActor) return 1
      return a.label.localeCompare(b.label)
    })
    return { movie, rolesDisplay: [...sortedCrew, ...sortedCast.map(c => c.label)] }
  })

  return sortMoviesChronologically(result, true)
}

function buildRoleSections(
  castRoles: any[],
  crewRoles: any[],
  personGender?: string | null
): RoleSection[] {
  const sections: Record<string, any[]> = {}

  const movieRolesMap: Record<number, { movie: any; roles: Set<string> }> = {}
  for (const item of crewRoles) {
    const movieId = item.movie.id
    const roleName = item.role?.name || 'Rol desconocido'
    if (!movieRolesMap[movieId]) {
      movieRolesMap[movieId] = { movie: item.movie, roles: new Set() }
    }
    movieRolesMap[movieId].roles.add(roleName)
  }

  for (const item of crewRoles) {
    const roleName = item.role?.name || 'Rol desconocido'
    if (!sections[roleName]) {
      sections[roleName] = []
      const moviesWithThisRole = crewRoles.filter(cr => cr.role?.name === roleName).map(cr => cr.movie.id)
      const uniqueMovieIds = [...new Set(moviesWithThisRole)]
      for (const movieId of uniqueMovieIds) {
        const movieData = movieRolesMap[movieId]
        sections[roleName].push({ movie: movieData.movie, roles: Array.from(movieData.roles) })
      }
    }
  }

  const actingRoles = castRoles.filter(r => r.isActor !== false)
  const selfRoles = castRoles.filter(r => r.isActor === false)

  if (actingRoles.length > 0) {
    sections['Actuación'] = sortMoviesChronologically(
      actingRoles.map(r => ({ movie: r.movie, roles: ['Actuación'], characterName: r.characterName })),
      true
    )
  }

  if (selfRoles.length > 0) {
    const selfLabel = personGender === 'FEMALE' ? 'Como sí misma' : 'Como sí mismo'
    sections[selfLabel] = sortMoviesChronologically(
      selfRoles.map(r => ({ movie: r.movie, roles: [selfLabel] })),
      true
    )
  }

  for (const roleName of Object.keys(sections)) {
    if (roleName !== 'Actuación' && !roleName.startsWith('Como sí')) {
      sections[roleName] = sortMoviesChronologically(sections[roleName], true)
    }
  }

  return Object.entries(sections)
    .map(([roleName, items]) => ({ roleName, items }))
    .sort((a, b) => b.items.length - a.items.length)
}

// ---------- URL helpers ----------

function getEfemeridesUrl(month: number, day: number): string {
  return `/efemerides/${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function getBirthYearUrl(year: number): string {
  return `/listados/personas?birthYearFrom=${year}&birthYearTo=${year}&sortBy=lastName&sortOrder=asc`
}
function getDeathYearUrl(year: number): string {
  return `/listados/personas?deathYearFrom=${year}&deathYearTo=${year}&sortBy=deathDate&sortOrder=asc`
}
function getBirthLocationUrl(locationId: number): string {
  return `/listados/personas?birthLocationId=${locationId}&sortBy=lastName&sortOrder=asc`
}
function getDeathLocationUrl(locationId: number): string {
  return `/listados/personas?deathLocationId=${locationId}&sortBy=lastName&sortOrder=asc`
}
function getNationalityUrl(locationId: number): string {
  return `/listados/personas?nationalityId=${locationId}&sortBy=lastName&sortOrder=asc`
}

// ---------- Location rendering ----------

function LocationWithLinks({ location, type }: { location: any; type: 'birth' | 'death' }) {
  if (!location) return null

  const parts: { id: number; name: string }[] = []
  let current = location
  while (current) {
    parts.push({ id: current.id, name: current.name })
    current = current.parent
  }

  const getUrl = type === 'birth' ? getBirthLocationUrl : getDeathLocationUrl

  return (
    <>
      {parts.map((part, index) => (
        <span key={part.id}>
          {index > 0 && ', '}
          <Link
            href={getUrl(part.id)}
            className="text-foreground/80 hover:text-accent transition-colors"
          >
            {part.name}
          </Link>
        </span>
      ))}
    </>
  )
}

// ---------- Date rendering ----------

function DateDisplay({ year, month, day, getEfUrl, getYearUrl, prefix }: {
  year: number
  month?: number | null
  day?: number | null
  getEfUrl: (m: number, d: number) => string
  getYearUrl: (y: number) => string
  prefix: string
}) {
  const hasDay = !!day && !!month
  const hasMonth = !!month

  return (
    <>
      <span className="text-muted-foreground/40">{prefix}</span>
      {hasDay ? (
        <>
          <Link href={getEfUrl(month!, day!)} className="text-foreground/80 hover:text-accent transition-colors">
            {day} de {MONTHS[month! - 1].label.toLowerCase()}
          </Link>
          <span className="text-muted-foreground/40"> de </span>
          <Link href={getYearUrl(year)} className="text-foreground/80 hover:text-accent transition-colors">
            {year}
          </Link>
        </>
      ) : hasMonth ? (
        <>
          <Link href={getEfUrl(month!, 1)} className="text-foreground/80 hover:text-accent transition-colors">
            {MONTHS[month! - 1].label.toLowerCase()}
          </Link>
          <span className="text-muted-foreground/40"> de </span>
          <Link href={getYearUrl(year)} className="text-foreground/80 hover:text-accent transition-colors">
            {year}
          </Link>
        </>
      ) : (
        <Link href={getYearUrl(year)} className="text-foreground/80 hover:text-accent transition-colors">
          {year}
        </Link>
      )}
    </>
  )
}

// ---------- Metadata ----------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const person = await getPersonData(slug)

  if (!person) {
    return {
      title: 'Persona no encontrada — cinenacional.com',
      description: 'La persona que buscás no existe en la base de datos.'
    }
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ')
  const photoUrl = person.photoUrl ? getPersonPhotoUrl(person.photoUrl, 'lg') : null

  let description: string
  if (person.biography) {
    description = person.biography.replace(/<[^>]*>/g, '').substring(0, 160)
  } else {
    const roles = await getPersonRoleSummary(person.id, person.gender)
    description = roles.length > 0
      ? `${fullName}, ${roles.join(', ')} del cine argentino. Filmografía completa y biografía.`
      : `${fullName}. Persona del cine argentino. Filmografía completa y biografía.`
  }

  return {
    title: `${fullName} — cinenacional.com`,
    description,
    alternates: {
      canonical: `/persona/${slug}`,
    },
    openGraph: {
      title: fullName,
      description,
      images: photoUrl ? [photoUrl] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullName,
      description,
      images: photoUrl ? [photoUrl] : [],
    }
  }
}

// ---------- Page component ----------

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params
  const person = await getPersonData(slug)

  if (!person) {
    notFound()
  }

  // Fetch filmography and reviews
  const [{ castRoles, crewRoles }, personReviews] = await Promise.all([
    getFilmographyData(person.id),
    getPersonReviews(person.id)
  ])

  // Build gallery images
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const galleryImages = person.imageAppearances.map((appearance) => {
    const img = appearance.image
    return {
      id: img.id,
      url: `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${img.cloudinaryPublicId}`,
      cloudinaryPublicId: img.cloudinaryPublicId,
      type: img.type,
      eventName: img.eventName,
      people: img.people.map((p) => ({
        personId: p.personId,
        position: p.position,
        person: { id: p.person.id, firstName: p.person.firstName, lastName: p.person.lastName }
      })),
      movie: img.movie ? { id: img.movie.id, title: img.movie.title, releaseYear: img.movie.releaseYear } : null
    }
  })

  // Computed values
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ')

  const birthDateFormatted = person.birthYear ? formatPartialDate({
    year: person.birthYear,
    month: person.birthMonth,
    day: person.birthDay
  }, { monthFormat: 'long', includeDay: true }) : null

  const deathDateFormatted = person.deathYear ? formatPartialDate({
    year: person.deathYear,
    month: person.deathMonth,
    day: person.deathDay
  }, { monthFormat: 'long', includeDay: true }) : null

  // Stats and badges
  const actingRolesForStats = castRoles.filter(r => r.isActor !== false)
  const selfRolesForStats = castRoles.filter(r => r.isActor === false)
  const uniqueMoviesAsActor = new Set(actingRolesForStats.map(r => r.movie.id))
  const uniqueMoviesAsSelf = new Set(selfRolesForStats.map(r => r.movie.id))

  const roleBadges: string[] = []
  if (uniqueMoviesAsActor.size > 0) {
    roleBadges.push(person.gender === 'FEMALE' ? 'Actriz' : 'Actor')
  }
  if (uniqueMoviesAsSelf.size > 0) {
    roleBadges.push(person.gender === 'FEMALE' ? 'Aparición como sí misma' : 'Aparición como sí mismo')
  }
  const uniqueCrewRoles = [...new Set(crewRoles.map(r => r.role?.name).filter(Boolean))] as string[]
  for (const roleName of uniqueCrewRoles) {
    if (!roleBadges.includes(roleName)) {
      roleBadges.push(roleName)
    }
  }

  // Filmography data for client component
  const allRolesList = buildAllRolesList(castRoles, crewRoles, person.gender)
  const roleSections = buildRoleSections(castRoles, crewRoles, person.gender)

  // Sanitize biography
  const sanitizedBiography = person.biography
    ? DOMPurify.sanitize(person.biography, {
        ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'b', 'i', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        ADD_ATTR: ['target'],
      })
    : null

  // Sanitize trivia
  const sanitizedTrivia = person.trivia.map(item => ({
    id: item.id,
    content: DOMPurify.sanitize(item.content)
  }))

  // Build narrative paragraph for LLM citability
  const narrativePersonParts: string[] = []
  const rolesLower = roleBadges
    .filter(r => !r.startsWith('Aparición'))
    .map(r => r.toLowerCase())

  // Opening: "{nombre} es un/a {roles} del cine argentino"
  if (rolesLower.length > 0) {
    const genderArticle = person.gender === 'FEMALE' ? 'una' : 'un'
    narrativePersonParts.push(`${fullName} es ${genderArticle} ${rolesLower.join(', ')} del cine argentino.`)
  } else {
    narrativePersonParts.push(`${fullName} es una persona del cine argentino.`)
  }

  // Birth info
  if (person.birthYear) {
    const birthPlace = person.birthLocation?.name
    if (birthPlace) {
      narrativePersonParts.push(`Nació en ${birthPlace} en ${person.birthYear}.`)
    } else {
      narrativePersonParts.push(`Nació en ${person.birthYear}.`)
    }
  }

  // Death info
  if (person.deathYear) {
    narrativePersonParts.push(`Falleció en ${person.deathYear}.`)
  }

  // Movie count and top movies
  const allMovieIds = new Set([
    ...castRoles.map(r => r.movie.id),
    ...crewRoles.map(r => r.movie.id),
  ])
  const totalMovies = allMovieIds.size

  if (totalMovies > 0) {
    // Get top 3 movies by year (most recent, completed only)
    const allMovies = [
      ...castRoles.map(r => r.movie),
      ...crewRoles.map(r => r.movie),
    ]
    const uniqueMovies = new Map<number, { id: number; title: string; year: number | null; releaseYear: number | null; stage: string | null }>()
    for (const m of allMovies) {
      if (!uniqueMovies.has(m.id)) uniqueMovies.set(m.id, m)
    }
    const sortedMovies = [...uniqueMovies.values()]
      .filter(m => m.stage === 'COMPLETA')
      .sort((a, b) => (b.releaseYear || b.year || 0) - (a.releaseYear || a.year || 0))
      .slice(0, 3)

    let moviesPart = `Ha participado en ${totalMovies} películas`
    if (sortedMovies.length > 0) {
      const titles = sortedMovies.map(m => {
        const y = m.releaseYear || m.year
        return y ? `${m.title} (${y})` : m.title
      })
      if (titles.length === 1) {
        moviesPart += `, entre ellas ${titles[0]}`
      } else {
        moviesPart += `, entre ellas ${titles.slice(0, -1).join(', ')} y ${titles[titles.length - 1]}`
      }
    }
    moviesPart += '.'
    narrativePersonParts.push(moviesPart)
  }

  const narrativePersonParagraph = narrativePersonParts.join(' ')

  const photoUrlMd = person.photoUrl ? getPersonPhotoUrl(person.photoUrl, 'md') : null
  const photoUrlLg = person.photoUrl ? getPersonPhotoUrl(person.photoUrl, 'lg') : null

  return (
    <>
      <p className="sr-only">{narrativePersonParagraph}</p>
      <BreadcrumbSchema items={[
        { name: 'Personas', href: '/listados/personas' },
        { name: fullName, href: `/persona/${slug}` },
      ]} />
      <PersonSchema
        firstName={person.firstName}
        lastName={person.lastName}
        realName={person.realName}
        slug={slug}
        birthYear={person.birthYear}
        birthMonth={person.birthMonth}
        birthDay={person.birthDay}
        deathYear={person.deathYear}
        deathMonth={person.deathMonth}
        deathDay={person.deathDay}
        birthLocation={person.birthLocation}
        deathLocation={person.deathLocation}
        photoUrl={photoUrlLg}
        gender={person.gender}
        links={person.links}
        roleBadges={roleBadges}
        nationalities={(person.nationalities || []).map((nat: { location?: { name?: string | null } | null }) => ({ name: nat.location?.name || '' })).filter((n: { name: string }) => n.name)}
      />
      <div className="min-h-screen">
      <PageViewTracker personId={person.id} />

      {/* Person Header Section */}
      <section>
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-6 pb-10 md:pt-12 md:pb-16 lg:pt-16 lg:pb-20">

          {/* ===== MOBILE LAYOUT ===== */}
          <div className="md:hidden">
            <div className="flex gap-4">
              {/* Portrait */}
              <div className="w-28 shrink-0">
                <div className="relative aspect-3/4 overflow-hidden rounded-xs shadow-xl shadow-black/40">
                  {photoUrlMd ? (
                    <Image
                      loader={cloudinaryLoader}
                      src={photoUrlMd}
                      alt={fullName}
                      fill
                      priority
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50">
                      <svg className="w-10 h-10 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Text column */}
              <div className="flex min-w-0 flex-col gap-1.5 py-0.5">
                <h1 className="font-serif text-2xl leading-tight text-foreground">{fullName}</h1>

                {person.realName && person.realName !== fullName && (
                  <p className="text-[11px] leading-snug">
                    <span className="text-muted-foreground/40">Nombre real: </span>
                    <span className="text-muted-foreground/50">{person.realName}</span>
                  </p>
                )}

                {person.alternativeNames && person.alternativeNames.length > 0 && (
                  <p className="text-[11px] leading-snug">
                    <span className="text-muted-foreground/40">{getCreditedLabel(person.gender)}: </span>
                    <span className="text-muted-foreground/50">{person.alternativeNames.map(alt => alt.fullName).join(', ')}</span>
                  </p>
                )}

                {roleBadges.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {roleBadges.map((role) => (
                      <span key={role} className="border border-border/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                        {role}
                      </span>
                    ))}
                  </div>
                )}

                {(birthDateFormatted || person.birthLocation) && (
                  <div className="text-[12px] leading-snug">
                    <DateDisplay
                      year={person.birthYear!}
                      month={person.birthMonth}
                      day={person.birthDay}
                      getEfUrl={getEfemeridesUrl}
                      getYearUrl={getBirthYearUrl}
                      prefix={birthDateFormatted ? (person.birthDay ? 'Nació el ' : 'Nació en ') : 'Nació en '}
                    />
                    {person.birthLocation && (
                      <>
                        {birthDateFormatted && <span className="text-muted-foreground/40"> en </span>}
                        <LocationWithLinks location={person.birthLocation} type="birth" />
                      </>
                    )}
                  </div>
                )}

                {(deathDateFormatted || person.deathLocation) && (
                  <div className="text-[12px] leading-snug">
                    <DateDisplay
                      year={person.deathYear!}
                      month={person.deathMonth}
                      day={person.deathDay}
                      getEfUrl={getEfemeridesUrl}
                      getYearUrl={getDeathYearUrl}
                      prefix={deathDateFormatted ? (person.deathDay ? 'Murió el ' : 'Murió en ') : 'Murió en '}
                    />
                    {person.deathLocation && (
                      <>
                        {deathDateFormatted && <span className="text-muted-foreground/40"> en </span>}
                        <LocationWithLinks location={person.deathLocation} type="death" />
                      </>
                    )}
                  </div>
                )}

                {person.nationalities && person.nationalities.length > 0 && (
                  <div className="text-[12px] leading-snug">
                    <span className="text-muted-foreground/40">Nacionalidad: </span>
                    {person.nationalities
                      .map((nat: any, index: number) => {
                        const display = nat.location?.gentilicio || nat.location?.name
                        const locationId = nat.location?.id || nat.locationId
                        if (!display) return null
                        return (
                          <span key={locationId || index}>
                            {index > 0 && ', '}
                            <Link
                              href={getNationalityUrl(locationId)}
                              className="text-foreground/80 hover:text-accent transition-colors"
                            >
                              {display}
                            </Link>
                          </span>
                        )
                      })
                      .filter(Boolean)}
                  </div>
                )}
              </div>
            </div>

            {/* Biography below the row */}
            {sanitizedBiography && (
              <div
                className="prose-links mt-5 text-[13px] leading-relaxed text-muted-foreground/70"
                dangerouslySetInnerHTML={{ __html: sanitizedBiography }}
              />
            )}
          </div>

          {/* ===== DESKTOP LAYOUT ===== */}
          <div className="hidden md:flex md:items-start md:gap-10 lg:gap-14">
            {/* Portrait */}
            <div className="w-48 lg:w-56 shrink-0">
              <div className="relative aspect-3/4 overflow-hidden rounded-xs shadow-2xl shadow-black/50">
                {photoUrlLg ? (
                  <Image
                    loader={cloudinaryLoader}
                    src={photoUrlLg}
                    alt={fullName}
                    fill
                    priority
                    className="object-cover"
                    sizes="(min-width: 1024px) 224px, 192px"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50">
                    <svg className="w-16 h-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm text-muted-foreground/40 mt-2">Foto no disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info column */}
            <div className="flex flex-1 flex-col gap-3 min-w-0">
              <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-foreground">{fullName}</h1>

              {person.realName && person.realName !== fullName && (
                <p className="text-[12px] leading-snug">
                  <span className="text-muted-foreground/40">Nombre real: </span>
                  <span className="text-muted-foreground/50">{person.realName}</span>
                </p>
              )}

              {person.alternativeNames && person.alternativeNames.length > 0 && (
                <p className="text-[12px] leading-snug">
                  <span className="text-muted-foreground/40">{getCreditedLabel(person.gender)}: </span>
                  <span className="text-muted-foreground/50">{person.alternativeNames.map(alt => alt.fullName).join(', ')}</span>
                </p>
              )}

              {roleBadges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {roleBadges.map((role) => (
                    <span key={role} className="border border-border/40 px-2.5 py-1 text-[11px] uppercase tracking-widest text-muted-foreground/60">
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {(birthDateFormatted || person.birthLocation) && (
                <div className="text-sm leading-snug">
                  <DateDisplay
                    year={person.birthYear!}
                    month={person.birthMonth}
                    day={person.birthDay}
                    getEfUrl={getEfemeridesUrl}
                    getYearUrl={getBirthYearUrl}
                    prefix={birthDateFormatted ? (person.birthDay ? 'Nació el ' : 'Nació en ') : 'Nació en '}
                  />
                  {person.birthLocation && (
                    <>
                      {birthDateFormatted && <span className="text-muted-foreground/40"> en </span>}
                      <LocationWithLinks location={person.birthLocation} type="birth" />
                    </>
                  )}
                </div>
              )}

              {(deathDateFormatted || person.deathLocation) && (
                <div className="text-sm leading-snug">
                  <DateDisplay
                    year={person.deathYear!}
                    month={person.deathMonth}
                    day={person.deathDay}
                    getEfUrl={getEfemeridesUrl}
                    getYearUrl={getDeathYearUrl}
                    prefix={deathDateFormatted ? (person.deathDay ? 'Murió el ' : 'Murió en ') : 'Murió en '}
                  />
                  {person.deathLocation && (
                    <>
                      {deathDateFormatted && <span className="text-muted-foreground/40"> en </span>}
                      <LocationWithLinks location={person.deathLocation} type="death" />
                    </>
                  )}
                </div>
              )}

              {person.nationalities && person.nationalities.length > 0 && (
                <div className="text-sm leading-snug">
                  <span className="text-muted-foreground/40">Nacionalidad: </span>
                  {person.nationalities
                    .map((nat: any, index: number) => {
                      const display = nat.location?.gentilicio || nat.location?.name
                      const locationId = nat.location?.id || nat.locationId
                      if (!display) return null
                      return (
                        <span key={locationId || index}>
                          {index > 0 && ', '}
                          <Link
                            href={getNationalityUrl(locationId)}
                            className="text-foreground/80 hover:text-accent transition-colors"
                          >
                            {display}
                          </Link>
                        </span>
                      )
                    })
                    .filter(Boolean)}
                </div>
              )}

              {sanitizedBiography && (
                <div
                  className="prose-links mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground/80"
                  dangerouslySetInnerHTML={{ __html: sanitizedBiography }}
                />
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Filmography Section (client component) */}
      <PersonFilmography
        allRolesList={allRolesList}
        roleSections={roleSections}
      />

      {/* Reviews Section */}
      <PersonReviews reviews={personReviews} />

      {/* External Links */}
      {person.links && person.links.length > 0 && (
        <section className="py-12 border-t border-border/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <ExternalLinks links={person.links} />
          </div>
        </section>
      )}

      {/* Image Gallery */}
      {galleryImages.length > 0 && (
        <section className="py-12 border-t border-border/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <ImageGallery
              images={galleryImages}
              movieTitle={fullName}
            />
          </div>
        </section>
      )}

      {/* Trivia Section */}
      {sanitizedTrivia.length > 0 && (
        <section className="py-12 border-t border-border/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Trivia</h2>
            <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
              <ul className="flex flex-col gap-2">
                {sanitizedTrivia.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
                    <span
                      className="prose-links text-[13px] leading-relaxed text-muted-foreground/80 md:text-sm"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
    </>
  )
}
