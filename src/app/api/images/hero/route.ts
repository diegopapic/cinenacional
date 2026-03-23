// src/app/api/images/hero/route.ts
// Delegates data fetching to lib/queries/home.ts.

import { NextRequest, NextResponse } from 'next/server'
import { getHeroImages } from '@/lib/queries/home'
import { apiHandler } from '@/lib/api/api-handler'

export const dynamic = 'force-dynamic'

 
export const GET = apiHandler(async (_request: NextRequest) => {
  const images = await getHeroImages()
  return NextResponse.json({ images })
}, 'obtener imágenes del hero')
