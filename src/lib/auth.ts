import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prismaBase } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { NextResponse } from "next/server"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaBase),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prismaBase.user.findUnique({
            where: { email }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isValid = await bcrypt.compare(password, user.password)

          if (!isValid) {
            return null
          }

          if (user.role !== 'ADMIN' && user.role !== 'EDITOR' && !user.isAdmin) {
            return null
          }

          await prismaBase.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          await prismaBase.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN',
              entity: 'auth',
              metadata: {
                timestamp: new Date().toISOString()
              }
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.username || user.email,
            role: user.role,
            image: user.avatarUrl
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    }
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',  // Previene CSRF - la cookie NO se envía desde otros sitios
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Verifica que el request venga de un usuario autenticado con rol ADMIN o EDITOR.
 * Retorna la sesión si es válida, o un NextResponse 401 si no.
 */
export async function requireAuth(): Promise<
  | { session: { user: { id: string; role: string; email?: string; name?: string } }; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await getServerSession(authOptions)

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
