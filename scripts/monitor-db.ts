// scripts/monitor-db.ts
import fetch from 'node-fetch'

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:3000/api/metrics/database'
const METRICS_SECRET = process.env.METRICS_SECRET || 'your-secret-key'
const INTERVAL = 5000 // 5 segundos

async function fetchMetrics() {
  try {
    const response = await fetch(METRICS_URL, {
      headers: {
        'Authorization': `Bearer ${METRICS_SECRET}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Clear console
    console.clear()
    
    // Display metrics
    console.log('🎯 DATABASE CONNECTION POOL METRICS')
    console.log('=====================================')
    console.log(`📊 Timestamp: ${data.timestamp}`)
    console.log('')
    
    if (data.connectionPool) {
      console.log('📌 Connection Pool:')
      console.log(`  Active: ${data.connectionPool.active}`)
      console.log(`  Idle: ${data.connectionPool.idle}`)
      console.log(`  Total: ${data.connectionPool.total}`)
      console.log('')
    }
    
    if (data.prisma) {
      console.log('⚡ Prisma Metrics:')
      console.log(`  Total Queries: ${data.prisma.totalQueries}`)
      console.log(`  Slow Queries: ${data.prisma.slowQueries}`)
      console.log(`  Errors: ${data.prisma.errors}`)
      console.log(`  Avg Query Time: ${data.prisma.averageQueryTime}ms`)
      console.log('')
    }
    
    if (data.postgresql) {
      console.log('🐘 PostgreSQL Stats:')
      console.log(`  Active Connections: ${data.postgresql.active_connections}`)
      console.log(`  Committed Transactions: ${data.postgresql.committed_transactions}`)
      console.log(`  Cache Hit Ratio: ${(
        (data.postgresql.blocks_hit / (data.postgresql.blocks_hit + data.postgresql.blocks_read)) * 100
      ).toFixed(2)}%`)
      console.log('')
    }
    
    if (data.health) {
      console.log('💚 Health:')
      console.log(`  Status: ${data.health.status}`)
      console.log(`  Uptime: ${Math.floor(data.health.uptime / 60)} minutes`)
      console.log(`  Memory: ${Math.round(data.health.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(data.health.memory.heapTotal / 1024 / 1024)}MB`)
    }
    
  } catch (error) {
    console.error('❌ Error fetching metrics:', error)
  }
}

// Start monitoring
console.log('🚀 Starting database monitoring...')
setInterval(fetchMetrics, INTERVAL)
fetchMetrics() // Initial fetch