import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:metrics')

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_request: NextRequest) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Obtener métricas de Prisma
  const metrics = (prisma as unknown as { getMetrics: () => unknown }).getMetrics()

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
    ` as { active_connections: number; committed_transactions: number; rolled_back_transactions: number; blocks_read: number; blocks_hit: number; rows_returned: number; rows_fetched: number; rows_inserted: number; rows_updated: number; rows_deleted: number }[]

    pgStats = result[0]
  } catch (error) {
    log.error('Failed to fetch PG stats', error)
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
    ` as { active: number; idle: number; idle_in_transaction: number; idle_aborted: number; fastpath: number; disabled: number; total: number }[]

    poolStats = poolResult[0]
  } catch (error) {
    log.error('Failed to fetch pool stats', error)
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
    ` as { calls: number; total_exec_time: number; mean_exec_time: number; max_exec_time: number; min_exec_time: number; query: string }[]

    queryStats = queryResult
  } catch {
    // pg_stat_statements puede no estar habilitado
    log.debug('pg_stat_statements not available')
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
}, 'obtener métricas')
