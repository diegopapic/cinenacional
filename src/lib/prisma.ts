// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined
}

// Configuración de connection pooling a través de DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || ''

// Agregar parámetros de pooling si no están presentes
function getOptimizedDatabaseUrl(url: string): string {
  // Si ya tiene parámetros de pooling, no modificar
  if (url.includes('connection_limit') || url.includes('pool_timeout')) {
    return url
  }
  
  // Agregar parámetros de pooling optimizados
  const separator = url.includes('?') ? '&' : '?'
  const poolParams = [
    'connection_limit=10',      // Límite de conexiones del pool
    'pool_timeout=10',          // Timeout para obtener conexión del pool (segundos)
    'connect_timeout=10',       // Timeout para conectar a la BD (segundos)
    'statement_timeout=30000',  // Timeout para queries (30 segundos)
  ].join('&')
  
  return `${url}${separator}${poolParams}`
}

// Crear cliente con configuración optimizada
const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(DATABASE_URL)
      }
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
  })

  // Middleware para logging de queries lentas
  client.$use(async (params, next) => {
    const before = Date.now()
    const result = await next(params)
    const after = Date.now()
    const duration = after - before

    // Log queries que toman más de 1 segundo
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`
      })
    }

    return result
  })

  // Middleware para retry en errores de conexión
  client.$use(async (params, next) => {
    let retries = 0
    const maxRetries = 3
    
    while (retries < maxRetries) {
      try {
        return await next(params)
      } catch (error: any) {
        retries++
        
        // Solo reintentar en errores de conexión específicos
        const isRetryable = error?.code === 'P1001' || // Can't reach database
                          error?.code === 'P1002' || // Database timeout
                          error?.code === 'P2024'    // Pool timeout
        
        if (!isRetryable || retries >= maxRetries) {
          throw error
        }
        
        const delay = Math.min(retries * 100, 1000) // Max 1 segundo de espera
        console.log(`🔄 Retrying query (attempt ${retries}/${maxRetries}) after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('Max retries reached')
  })

  return client
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    console.log('📊 Disconnecting Prisma Client...')
    await prisma.$disconnect()
  })
}