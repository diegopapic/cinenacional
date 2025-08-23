// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Configurar serialización de BigInt globalmente
(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined
}

// Crear cliente con configuración optimizada
const createPrismaClient = () => {
  // Obtener DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL || ''
  
  // Extraer el connection_limit de la URL si existe
  let connectionLimit = 20 // default
  try {
    const url = new URL(DATABASE_URL)
    connectionLimit = parseInt(url.searchParams.get('connection_limit') || '20')
    console.log(`🔧 Configurando pool con ${connectionLimit} conexiones`)
  } catch (e) {
    console.log('⚠️ No se pudo parsear DATABASE_URL, usando pool default de 20')
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'minimal',
  })

  // Configurar el pool size en el engine
  if ((client as any)._engineConfig) {
    (client as any)._engineConfig.connectionLimit = connectionLimit
  }

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

// Log inicial en producción
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Prisma Client inicializado en producción')
}