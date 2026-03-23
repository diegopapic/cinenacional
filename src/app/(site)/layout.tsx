// /src/app/(site)/layout.tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Script from 'next/script'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://cinenacional.com'),
  title: 'cinenacional.com — Base de datos del cine argentino',
  description: 'La base de datos más completa del cine argentino. Descubrí películas, directores, actores y toda la historia cinematográfica de Argentina.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  keywords: 'cine argentino, películas argentinas, actores argentinos, directores argentinos, base de datos cine',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'cinenacional.com — Base de datos del cine argentino',
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
  // other: {
  //   'google-adsense-account': 'ca-pub-4540700730503978',
  // },
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce') ?? ''
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-5SGTLPHYYX'

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'cinenacional.com',
    alternateName: 'CineNacional',
    url: 'https://cinenacional.com',
    description: 'La base de datos más completa del cine argentino. Películas, directores, actores y toda la historia cinematográfica de Argentina.',
    inLanguage: 'es',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://cinenacional.com/buscar?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'cinenacional.com',
      url: 'https://cinenacional.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://cinenacional.com/og-image.jpg',
      },
      sameAs: [
        'https://x.com/cinenacional',
        'https://instagram.com/cinenacional',
      ],
    },
  }

  return (
    <div className="font-sans min-h-screen flex flex-col text-[oklch(0.92_0.01_80)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* Google Analytics */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
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

      <Header />
      <main className="grow">
        {children}
      </main>
      <Footer />
    </div>
  )
}