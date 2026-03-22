import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prismaBase } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { createLogger } from "@/lib/logger"

const log = createLogger('auth')

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export const { auth, handlers, signIn, signOut } = NextAuth({
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
    Credentials({
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
            id: String(user.id),
            email: user.email,
            name: user.displayName || user.username || user.email,
            role: user.role,
            image: user.avatarUrl
          }
        } catch (error) {
          log.error('Authentication failed', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
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
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
