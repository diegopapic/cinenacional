// src/app/api/analytics/pageview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Tipos válidos de página
const VALID_PAGE_TYPES = [
  'HOME',
  'MOVIE',
  'PERSON',
  'EPHEMERIS',
  'PERSON_LIST',
  'RELEASES',
  'OBITUARIES'
] as const;

type PageType = typeof VALID_PAGE_TYPES[number];

interface PageViewRequest {
  pageType: PageType;
  movieId?: number;
  personId?: number;
  extraData?: Record<string, any>;
  sessionId?: string;
}

// Función para hashear IP (privacidad)
function hashIP(ip: string): string {
  // Agregar salt para mayor seguridad
  const salt = process.env.IP_HASH_SALT || 'cinenacional-analytics-2024';
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

// Función para extraer IP del request
function getClientIP(request: NextRequest): string {
  // Orden de prioridad para obtener IP real
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for puede tener múltiples IPs, tomar la primera
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return '0.0.0.0';
}

export async function POST(request: NextRequest) {
  try {
    const body: PageViewRequest = await request.json();
    
    // Validar pageType
    if (!body.pageType || !VALID_PAGE_TYPES.includes(body.pageType)) {
      return NextResponse.json(
        { error: 'pageType inválido' },
        { status: 400 }
      );
    }
    
    // Validar que MOVIE tenga movieId
    if (body.pageType === 'MOVIE' && !body.movieId) {
      return NextResponse.json(
        { error: 'movieId requerido para pageType MOVIE' },
        { status: 400 }
      );
    }
    
    // Validar que PERSON tenga personId
    if (body.pageType === 'PERSON' && !body.personId) {
      return NextResponse.json(
        { error: 'personId requerido para pageType PERSON' },
        { status: 400 }
      );
    }
    
    // Obtener datos del request
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || null;
    const referrer = request.headers.get('referer') || null;
    
    // Crear registro de pageview
    const pageView = await prisma.pageView.create({
      data: {
        pageType: body.pageType,
        movieId: body.movieId || null,
        personId: body.personId || null,
        extraData: body.extraData || null,
        sessionId: body.sessionId || null,
        ipHash: hashIP(clientIP),
        userAgent: userAgent?.substring(0, 500), // Truncar si es muy largo
        referrer: referrer?.substring(0, 500),
      },
    });
    
    // Responder inmediatamente (no bloquear al cliente)
    return NextResponse.json({ success: true, id: pageView.id });
    
  } catch (error) {
    console.error('Error registrando pageview:', error);
    
    // No exponer errores internos al cliente
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener estadísticas básicas (opcional, para admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType');
    const days = parseInt(searchParams.get('days') || '30');
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    // Construir where clause
    const where: any = {
      createdAt: { gte: dateFrom }
    };
    
    if (pageType && VALID_PAGE_TYPES.includes(pageType as PageType)) {
      where.pageType = pageType;
    }
    
    // Obtener conteo total
    const totalViews = await prisma.pageView.count({ where });
    
    // Obtener conteo por tipo de página
    const viewsByType = await prisma.pageView.groupBy({
      by: ['pageType'],
      where: { createdAt: { gte: dateFrom } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    // Obtener películas más vistas
    const topMovies = await prisma.pageView.groupBy({
      by: ['movieId'],
      where: {
        pageType: 'MOVIE',
        movieId: { not: null },
        createdAt: { gte: dateFrom }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });
    
    // Obtener nombres de películas
    const movieIds = topMovies.map(m => m.movieId).filter(Boolean) as number[];
    const movies = await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      select: { id: true, title: true, slug: true }
    });
    
    const topMoviesWithNames = topMovies.map(m => {
      const movie = movies.find(mov => mov.id === m.movieId);
      return {
        movieId: m.movieId,
        title: movie?.title || 'Desconocida',
        slug: movie?.slug,
        views: m._count.id
      };
    });
    
    // Obtener personas más vistas
    const topPeople = await prisma.pageView.groupBy({
      by: ['personId'],
      where: {
        pageType: 'PERSON',
        personId: { not: null },
        createdAt: { gte: dateFrom }
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });
    
    // Obtener nombres de personas
    const personIds = topPeople.map(p => p.personId).filter(Boolean) as number[];
    const people = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, firstName: true, lastName: true, slug: true }
    });
    
    const topPeopleWithNames = topPeople.map(p => {
      const person = people.find(per => per.id === p.personId);
      const name = person 
        ? [person.firstName, person.lastName].filter(Boolean).join(' ')
        : 'Desconocido';
      return {
        personId: p.personId,
        name,
        slug: person?.slug,
        views: p._count.id
      };
    });
    
    return NextResponse.json({
      period: `${days} días`,
      totalViews,
      viewsByType: viewsByType.map(v => ({
        pageType: v.pageType,
        views: v._count.id
      })),
      topMovies: topMoviesWithNames,
      topPeople: topPeopleWithNames
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}