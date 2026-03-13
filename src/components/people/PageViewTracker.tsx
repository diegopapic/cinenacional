'use client'

import { usePageView } from '@/hooks/usePageView'

export function PageViewTracker({ personId }: { personId: number }) {
  usePageView({ pageType: 'PERSON', personId })
  return null
}
