// /src/app/layout.tsx
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import QueryProvider from '@/components/providers/QueryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'cinenacional.com',
  description: 'Base de datos del cine argentino',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}