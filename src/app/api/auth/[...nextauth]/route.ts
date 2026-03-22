import { NextRequest } from 'next/server'
import { handlers } from "@/auth"
import { applyRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

export const { GET } = handlers

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.auth)
  if (limited) return limited

  return handlers.POST(request)
}
