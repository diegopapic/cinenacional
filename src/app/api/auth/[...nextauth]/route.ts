// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prismaBase } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const handler = NextAuth({
  adapter: PrismaAdapter(prismaBase),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: "/admin/login",  // Página de login dentro de /admin
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
          
          // Verificar password
          const isValid = await bcrypt.compare(password, user.password)
          
          if (!isValid) {
            return null
          }
          
          // Verificar que tenga permisos de admin
          if (user.role !== 'ADMIN' && user.role !== 'EDITOR' && !user.isAdmin) {
            return null
          }
          
          // Actualizar último login
          await prismaBase.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })
          
          // Log de auditoría
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
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }