// src/app/api/health/db/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test básico de conexión
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const queryTime = Date.now() - startTime

    // Obtener estadísticas básicas de la BD
    const [movieCount, peopleCount, poolStatsRaw] = await Promise.all([
      prisma.movie.count(),
      prisma.person.count(),
      prisma.$queryRaw<Array<{
        total_connections: number
        active_connections: number
        idle_connections: number
      }>>`
        SELECT 
          CAST(count(*) AS INTEGER) as total_connections,
          CAST(count(*) FILTER (WHERE state = 'active') AS INTEGER) as active_connections,
          CAST(count(*) FILTER (WHERE state = 'idle') AS INTEGER) as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `
    ])

    // Convertir BigInt a números normales
    const poolStats = poolStatsRaw[0] ? {
      total_connections: Number(poolStatsRaw[0].total_connections),
      active_connections: Number(poolStatsRaw[0].active_connections),
      idle_connections: Number(poolStatsRaw[0].idle_connections)
    } : {
      total_connections: 0,
      active_connections: 0,
      idle_connections: 0
    }

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        responseTime: `${queryTime}ms`,
        stats: {
          movies: movieCount,
          people: peopleCount
        },
        pool: poolStats
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}