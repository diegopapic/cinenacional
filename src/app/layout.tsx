// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CineNacional - Base de Datos del Cine Argentino',
  description: 'La base de datos más completa del cine argentino. Descubre películas, directores, actores y toda la historia cinematográfica de Argentina.',
  keywords: 'cine argentino, películas argentinas, actores argentinos, directores argentinos, base de datos cine',
  openGraph: {
    title: 'CineNacional - Base de Datos del Cine Argentino',
    description: 'La base de datos más completa del cine argentino',
    url: 'https://cinenacional.vercel.app',
    siteName: 'CineNacional',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CineNacional',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-zinc-950 text-white`}>
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}