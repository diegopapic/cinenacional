// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Crimson_Text } from 'next/font/google'
import Script from 'next/script'
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
  title: 'cinenacional.com - Base de datos del cine argentino',
  description: 'La base de datos más completa del cine argentino. Descubrí películas, directores, actores y toda la historia cinematográfica de Argentina.',
  keywords: 'cine argentino, películas argentinas, actores argentinos, directores argentinos, base de datos cine',
  openGraph: {
    title: 'cinenacional.com - Base de datos del cine argentino',
    description: 'La base de datos más completa del cine argentino',
    url: 'https://cinenacional.com',
    siteName: 'cinenacional.com',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'cinenacional.com',
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
  // Google Analytics Measurement ID
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-5SGTLPHYYX'
  
  // AdSense Publisher ID
  const ADSENSE_PUBLISHER_ID = 'ca-pub-9695271411409237'
  
  return (
    <html lang="es" className={`h-full ${inter.variable} ${crimsonText.variable}`}>
      <head>
        {/* Google AdSense */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        {/* Google Analytics */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
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