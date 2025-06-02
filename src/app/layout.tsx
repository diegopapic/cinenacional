import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Relatos Salvajes - cinenacional.com',
  description: 'La base de datos más completa sobre cine argentino. Seis relatos que alternan entre la comedia y el drama.',
  keywords: 'cine argentino, películas, Relatos Salvajes, Damián Szifron, Ricardo Darín',
  authors: [{ name: 'cinenacional.com' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-cine-dark text-white antialiased">
        {children}
      </body>
    </html>
  )
}