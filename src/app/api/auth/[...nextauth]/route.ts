import { NextRequest } from 'next/server'
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { applyRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export async function GET(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const { nextauth } = await context.params
  return handler(request, { params: { nextauth } })
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const { nextauth } = await context.params

  const ip = getClientIp(request)
  const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.auth)
  if (limited) return limited

  return handler(request, { params: { nextauth } })
}
