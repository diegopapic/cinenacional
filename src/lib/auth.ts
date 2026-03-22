import { auth } from "@/auth"
import { NextResponse } from "next/server"

/**
 * Verifica que el request venga de un usuario autenticado con rol ADMIN o EDITOR.
 * Retorna la sesión si es válida, o un NextResponse 401 si no.
 */
export async function requireAuth(): Promise<
  | { session: { user: { id: string; role: string; email?: string; name?: string } }; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth()

  if (!session?.user?.role || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return {
      error: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
  }

  return { session: session as any }
}
