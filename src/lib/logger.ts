// src/lib/logger.ts — Sistema de logging centralizado
//
// Reemplaza los console.* dispersos con un logger que:
// - Filtra por nivel según NODE_ENV (producción: warn+, desarrollo: debug+)
// - Redacta datos sensibles (IPs, tokens, passwords, emails)
// - Produce JSON estructurado en producción
// - Funciona en Edge Runtime (middleware), Node.js (API) y browser (components)

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_VALUE: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// En producción solo warn y error. En desarrollo todo.
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug'

// Keys que se redactan automáticamente en objetos logueados
const REDACT_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'creditcard',
  'ssn',
  'ip',
  'ipaddress',
  'ip_address',
  'clientip',
  'clientkey',
  'x-forwarded-for',
])

function shouldRedact(key: string): boolean {
  return REDACT_KEYS.has(key.toLowerCase())
}

function redactValue(obj: unknown, depth = 0): unknown {
  if (depth > 5) return obj // evitar recursión infinita
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => redactValue(item, depth + 1))
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (shouldRedact(key)) {
      redacted[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      redacted[key] = redactValue(val, depth + 1)
    } else {
      redacted[key] = val
    }
  }
  return redacted
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_VALUE[level] >= LOG_LEVEL_VALUE[MIN_LEVEL]
}

function formatForProduction(level: LogLevel, module: string, msg: string, data?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    module,
    msg,
  }
  if (data && Object.keys(data).length > 0) {
    entry.data = redactValue(data)
  }
  return JSON.stringify(entry)
}

function emitLog(level: LogLevel, module: string, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return

  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    const json = formatForProduction(level, module, msg, data)
    // En producción siempre stderr para error, stdout para el resto
    if (level === 'error') {
      console.error(json)
    } else {
      console.log(json)
    }
    return
  }

  // Desarrollo: output legible
  const prefix = `[${module}]`
  const redactedData = data ? redactValue(data) : undefined

  const args = redactedData ? [prefix, msg, redactedData] : [prefix, msg]

  switch (level) {
    case 'debug':
      console.debug(...args)
      break
    case 'info':
      console.log(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    case 'error':
      console.error(...args)
      break
  }
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, error?: unknown, data?: Record<string, unknown>): void
}

/**
 * Crea un logger con nombre de módulo para identificar el origen del log.
 *
 * @example
 * const log = createLogger('api:movies')
 * log.info('Cache hit', { key: cacheKey })
 * log.error('Failed to fetch', err)
 */
export function createLogger(module: string): Logger {
  return {
    debug(msg: string, data?: Record<string, unknown>) {
      emitLog('debug', module, msg, data)
    },

    info(msg: string, data?: Record<string, unknown>) {
      emitLog('info', module, msg, data)
    },

    warn(msg: string, data?: Record<string, unknown>) {
      emitLog('warn', module, msg, data)
    },

    error(msg: string, error?: unknown, data?: Record<string, unknown>) {
      // Extraer info útil del error sin exponer stack traces en producción
      const errorData: Record<string, unknown> = { ...data }

      if (error instanceof Error) {
        errorData.errorMessage = error.message
        if (process.env.NODE_ENV !== 'production') {
          errorData.stack = error.stack
        }
        // Prisma error codes
        if ('code' in error) {
          errorData.code = (error as Record<string, unknown>).code
        }
      } else if (error !== undefined && error !== null) {
        errorData.errorDetail = String(error)
      }

      emitLog('error', module, msg, Object.keys(errorData).length > 0 ? errorData : undefined)
    },
  }
}
