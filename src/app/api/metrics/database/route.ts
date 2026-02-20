import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    // Obtener métricas de Prisma
    const metrics = (prisma as any).getMetrics()

    // Intentar obtener métricas de PostgreSQL
    let pgStats = null
    try {
      const result = await prisma.$queryRaw`
        SELECT
          numbackends as active_connections,
          xact_commit as committed_transactions,
          xact_rollback as rolled_back_transactions,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as rows_returned,
          tup_fetched as rows_fetched,
          tup_inserted as rows_inserted,
          tup_updated as rows_updated,
          tup_deleted as rows_deleted
        FROM pg_stat_database
        WHERE datname = current_database()
      ` as any[]

      pgStats = result[0]
    } catch (error) {
      console.error('Error fetching PG stats:', error)
    }

    // Pool stats
    let poolStats = null
    try {
      const poolResult = await prisma.$queryRaw`
        SELECT
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as idle_aborted,
          count(*) FILTER (WHERE state = 'fastpath function call') as fastpath,
          count(*) FILTER (WHERE state = 'disabled') as disabled,
          count(*) as total
        FROM pg_stat_activity
        WHERE datname = current_database()
      ` as any[]

      poolStats = poolResult[0]
    } catch (error) {
      console.error('Error fetching pool stats:', error)
    }

    // Query performance stats
    let queryStats = null
    try {
      const queryResult = await prisma.$queryRaw`
        SELECT
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          min_exec_time,
          query
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat%'
        ORDER BY mean_exec_time DESC
        LIMIT 10
      ` as any[]

      queryStats = queryResult
    } catch (error) {
      // pg_stat_statements puede no estar habilitado
      console.log('pg_stat_statements not available')
    }

    const response = {
      timestamp: new Date().toISOString(),
      prisma: metrics,
      postgresql: pgStats,
      connectionPool: poolStats,
      slowQueries: queryStats,
      health: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    )
  }
}
