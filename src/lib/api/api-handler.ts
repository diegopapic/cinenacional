// src/lib/api/api-handler.ts
// Shared error handling for API routes.

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Sanitizes Zod validation errors for client responses.
 * - Production: returns only field paths (no internal schema details)
 * - Development: returns full Zod error details for debugging
 */
export function sanitizeValidationError(error: ZodError): Record<string, unknown> {
  if (!isProduction) {
    return { details: error.errors }
  }
  // In production, only expose which fields failed
  const fields = [...new Set(error.errors.map(e => e.path.join('.')))]
  return { fields }
}

/**
 * Sanitizes a Zod safeParse flatten() result for client responses.
 * Use this instead of calling validation.error.flatten() directly.
 * - Production: returns only field names that failed
 * - Development: returns full flattened error details
 */
export function sanitizeValidationFlat(error: ZodError): Record<string, unknown> {
  if (!isProduction) {
    return { details: error.flatten() }
  }
  const fields = [...new Set(error.errors.map(e => e.path.join('.')))]
  return { fields }
}

/**
 * Handles an API error with consistent logging and response format.
 * - ZodError → 400 with sanitized validation details
 * - Everything else → console.error + generic 500
 *
 * Use standalone in catch blocks that need custom pre-handling (e.g. stale cache).
 */
export function handleApiError(error: unknown, action: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Datos inválidos', ...sanitizeValidationError(error) },
      { status: 400 }
    )
  }
  console.error(`Error ${action}:`, error)
  return NextResponse.json(
    { error: `Error al ${action}` },
    { status: 500 }
  )
}

/**
 * Wraps an API route handler with consistent error handling.
 * Eliminates try/catch boilerplate in route files.
 *
 * @example
 * // Before:
 * export async function GET(request: NextRequest) {
 *   try {
 *     const data = await prisma.model.findMany()
 *     return NextResponse.json(data)
 *   } catch (error) {
 *     console.error('Error fetching X:', error)
 *     return NextResponse.json({ error: 'Error al obtener X' }, { status: 500 })
 *   }
 * }
 *
 * // After:
 * export const GET = apiHandler(async (request) => {
 *   const data = await prisma.model.findMany()
 *   return NextResponse.json(data)
 * }, 'obtener X')
 */
export function apiHandler<
  T extends (...args: any[]) => Promise<NextResponse | Response>
>(handler: T, action: string): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, action)
    }
  }) as T
}
