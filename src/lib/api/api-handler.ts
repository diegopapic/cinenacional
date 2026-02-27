// src/lib/api/api-handler.ts
// Shared error handling for API routes.

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Handles an API error with consistent logging and response format.
 * - ZodError → 400 with validation details
 * - Everything else → console.error + 500
 *
 * Use standalone in catch blocks that need custom pre-handling (e.g. stale cache).
 */
export function handleApiError(error: unknown, action: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: error.errors },
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
