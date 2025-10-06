// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Configurar serialización de BigInt globalmente
(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

const globalForPrisma = global as unknown as { 
  prisma: ReturnType<typeof createPrismaClient>
  prismaBase: PrismaClient | undefined
}

// Obtener DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || ''

// Extraer el connection_limit de la URL si existe
let connectionLimit = 20 // default
try {
  const url = new URL(DATABASE_URL)
  connectionLimit = parseInt(url.searchParams.get('connection_limit') || '20')
  console.log(`Configurando pool con ${connectionLimit} conexiones`)
} catch (e) {
  console.log('No se pudo parsear DATABASE_URL, usando pool default de 20')
}

// Cliente base para NextAuth (sin extensiones)
export const prismaBase = globalForPrisma.prismaBase || new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
  errorFormat: 'minimal',
})

// Cliente extendido para la app
const createPrismaClient = () => {
  return prismaBase.$extends({
    query: {
      // Middleware para logging de queries lentas y retry
      $allOperations: async ({ operation, model, args, query }) => {
        const before = Date.now()
        
        // Retry logic integrado
        let retries = 0
        const maxRetries = 3
        let lastError: any
        
        while (retries < maxRetries) {
          try {
            const result = await query(args)
            const after = Date.now()
            const duration = after - before
            
            // Log queries que toman más de 1 segundo
            if (duration > 1000) {
              console.warn(`Slow query (${duration}ms):`, {
                model,
                operation,
                duration: `${duration}ms`
              })
            }
            
            return result
          } catch (error: any) {
            lastError = error
            retries++
            
            // Solo reintentar en errores de conexión específicos
            const isRetryable = error?.code === 'P1001' || // Can't reach database
                              error?.code === 'P1002' || // Database timeout
                              error?.code === 'P2024'    // Pool timeout
            
            if (!isRetryable || retries >= maxRetries) {
              throw error
            }
            
            const delay = Math.min(retries * 100, 1000) // Max 1 segundo de espera
            console.log(`Retrying query (attempt ${retries}/${maxRetries}) after ${delay}ms`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
        
        throw lastError || new Error('Max retries reached')
      }
    }
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaBase = prismaBase
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    console.log('Disconnecting Prisma Client...')
    await prisma.$disconnect()
    await prismaBase.$disconnect()
  })
}

// Log inicial en producción
if (process.env.NODE_ENV === 'production') {
  console.log('Prisma Client inicializado en producción')
}