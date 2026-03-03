import { NextRequest } from 'next/server'
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { applyRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export async function GET(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  // DEBUG: verificar si params llega como Promise (Next.js 15)
  console.log(`[NEXTAUTH DEBUG] GET raw params type: ${typeof context.params}, isPromise: ${context.params instanceof Promise}`)
  const { nextauth } = await context.params
  console.log(`[NEXTAUTH DEBUG] GET nextauth=${JSON.stringify(nextauth)} url=${request.nextUrl.pathname}`)
  return handler(request, { params: { nextauth } })
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  // DEBUG
  console.log(`[NEXTAUTH DEBUG] POST raw params type: ${typeof context.params}, isPromise: ${context.params instanceof Promise}`)
  const { nextauth } = await context.params
  console.log(`[NEXTAUTH DEBUG] POST nextauth=${JSON.stringify(nextauth)} url=${request.nextUrl.pathname}`)

  const ip = getClientIp(request)
  const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.auth)
  if (limited) return limited

  return handler(request, { params: { nextauth } })
}
