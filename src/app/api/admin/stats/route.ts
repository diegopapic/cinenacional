import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Total de visitas
  const totalViews = await prisma.pageView.count()

  // Visitas por tipo
  const viewsByType = await prisma.pageView.groupBy({
    by: ['pageType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  })

  // Películas más vistas (desde movie_stats)
  const movieStats = await prisma.movieStats.findMany({
    orderBy: { viewsMonth: 'desc' },
    take: 50,
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  })

  // Personas más vistas (últimos 30 días desde page_views)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const topPeopleRaw = await prisma.pageView.groupBy({
    by: ['personId'],
    where: {
      pageType: 'PERSON',
      personId: { not: null },
      createdAt: { gte: thirtyDaysAgo }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20
  })

  // Obtener datos de personas
  const personIds = topPeopleRaw
    .map(p => p.personId)
    .filter((id): id is number => id !== null)

  const people = await prisma.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, firstName: true, lastName: true, slug: true }
  })

  const peopleMap = new Map(people.map(p => [p.id, p]))

  const topPeople = topPeopleRaw.map(p => {
    const person = p.personId ? peopleMap.get(p.personId) : null
    return {
      personId: p.personId,
      name: person ? `${person.firstName || ''} ${person.lastName || ''}`.trim() : 'Desconocido',
      slug: person?.slug || '',
      views: p._count.id
    }
  })

  // Última actualización de movie_stats
  const lastUpdate = await prisma.movieStats.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true }
  })

  return NextResponse.json({
    totalViews,
    viewsByType: viewsByType.map(v => ({
      pageType: v.pageType,
      views: v._count.id
    })),
    topMovies: movieStats.map(s => ({
      movieId: s.movieId,
      title: s.movie.title,
      slug: s.movie.slug,
      viewsWeek: s.viewsWeek,
      viewsMonth: s.viewsMonth,
      viewsYear: s.viewsYear,
      viewsTotal: s.viewsTotal
    })),
    topPeople,
    lastUpdated: lastUpdate?.updatedAt || null
  })
}, 'obtener estadísticas')
