// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Configurar serialización de BigInt globalmente
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function() {
  return this.toString()
}

// Logger se importa con require para evitar un bug de inferencia de TypeScript
// con ReturnType<typeof createPrismaClient> más abajo.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createLogger } = require('./logger') as typeof import('./logger')
const logger = createLogger('prisma')

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
  logger.info('Connection pool configured', { connectionLimit })
} catch {
  logger.info('Could not parse DATABASE_URL, using default pool of 20')
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
        let lastError: unknown

        while (retries < maxRetries) {
          try {
            const result = await query(args)
            const after = Date.now()
            const duration = after - before

            // Log queries que toman más de 1 segundo
            if (duration > 1000) {
              logger.warn('Slow query', { model, operation, durationMs: duration })
            }

            return result
          } catch (error) {
            lastError = error
            retries++

            // Solo reintentar en errores de conexión específicos
            const prismaError = error as { code?: string } | undefined
            const isRetryable = prismaError?.code === 'P1001' || // Can't reach database
                              prismaError?.code === 'P1002' || // Database timeout
                              prismaError?.code === 'P2024'    // Pool timeout

            if (!isRetryable || retries >= maxRetries) {
              throw error
            }

            const delay = Math.min(retries * 100, 1000) // Max 1 segundo de espera
            logger.warn('Retrying query', { attempt: retries, maxRetries, delayMs: delay })
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
    logger.info('Disconnecting Prisma Client')
    await prisma.$disconnect()
    await prismaBase.$disconnect()
  })
}

// Log inicial en producción
if (process.env.NODE_ENV === 'production') {
  logger.info('Prisma Client initialized (production)')
}
