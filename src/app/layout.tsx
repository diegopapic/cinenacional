// /src/app/layout.tsx
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Libre_Franklin, Libre_Caslon_Display } from 'next/font/google'
import QueryProvider from '@/components/providers/QueryProvider'
import './globals.css'

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-libre-franklin',
  display: 'swap',
})

const libreCaslonDisplay = Libre_Caslon_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-libre-caslon',
  display: 'swap',
})

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
    <html lang="es" className={`h-full ${libreFranklin.variable} ${libreCaslonDisplay.variable}`}>
      <body className="h-full bg-[oklch(0.16_0.005_250)]">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}