// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Crimson_Text } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Toaster } from 'react-hot-toast'

// Configurar las fuentes
const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const crimsonText = Crimson_Text({ 
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
})

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
    <html lang="es" className={`h-full ${inter.variable} ${crimsonText.variable}`}>
      <body className={`${inter.className} min-h-full flex flex-col bg-zinc-950 text-white`}>
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </body>
    </html>
  )
}