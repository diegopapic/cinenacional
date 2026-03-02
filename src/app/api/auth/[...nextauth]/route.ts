import { NextRequest } from 'next/server'
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { applyRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export { handler as GET }

export async function POST(request: NextRequest, context: any) {
  const ip = getClientIp(request)
  const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.auth)
  if (limited) return limited

  return handler(request, context)
}
