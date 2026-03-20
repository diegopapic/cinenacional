// src/components/providers/QueryProvider.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,       // 30s antes de considerar stale
        gcTime: 5 * 60 * 1000,      // 5min en cache antes de garbage collect
        retry: 1,                    // 1 reintento en error
        refetchOnWindowFocus: false, // No refetch al volver a la pestaña
      },
    },
  })
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  // useState lazy init: crea el client una sola vez por componente
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
