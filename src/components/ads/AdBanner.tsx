// src/components/ads/AdBanner.tsx
'use client'

import { useEffect, useRef } from 'react'

type AdFormat = 'horizontal' | 'in-article' | 'sidebar' | 'multiplex'

interface AdBannerProps {
  slot: string
  format?: AdFormat
  className?: string
}

const AD_CLIENT = 'ca-pub-4540700730503978'

// Configuración por formato
const FORMAT_CONFIG: Record<AdFormat, {
  dataAdFormat: string
  dataLayout?: string
  style: React.CSSProperties
  containerClass: string
}> = {
  horizontal: {
    dataAdFormat: 'auto',
    style: { display: 'block', minWidth: '300px', minHeight: '50px' },
    containerClass: 'bg-zinc-900/50 border-y border-zinc-800 py-4'
  },
  'in-article': {
    dataAdFormat: 'fluid',
    dataLayout: 'in-article',
    style: { display: 'block', textAlign: 'center' as const },
    containerClass: 'my-8'
  },
  sidebar: {
    dataAdFormat: 'auto',
    style: { display: 'block', minHeight: '250px' },
    containerClass: 'sticky top-4'
  },
  multiplex: {
    dataAdFormat: 'autorelaxed',
    style: { display: 'block' },
    containerClass: 'border-t border-zinc-800 py-8'
  }
}

export default function AdBanner({ 
  slot, 
  format = 'horizontal',
  className = ''
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const isLoaded = useRef(false)

  useEffect(() => {
    // Evitar cargar el mismo anuncio dos veces
    if (isLoaded.current) return
    
    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      try {
        if (adRef.current && adRef.current.offsetWidth > 0) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({})
          isLoaded.current = true
        }
      } catch (err) {
        console.error('AdSense error:', err)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const config = FORMAT_CONFIG[format]

  // Props del anuncio
  const adProps: Record<string, string> = {
    'data-ad-client': AD_CLIENT,
    'data-ad-slot': slot,
    'data-ad-format': config.dataAdFormat,
  }

  // Agregar layout si existe (para in-article)
  if (config.dataLayout) {
    adProps['data-ad-layout'] = config.dataLayout
  }

  // Full width responsive para horizontal
  if (format === 'horizontal') {
    adProps['data-full-width-responsive'] = 'true'
  }

  return (
    <div className={`${config.containerClass} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={config.style}
          {...adProps}
        />
      </div>
    </div>
  )
}

// Componentes pre-configurados para facilitar el uso
export function HeroAd() {
  return <AdBanner slot="1634150481" format="horizontal" />
}

export function InArticleAd({ slot }: { slot: string }) {
  return <AdBanner slot={slot} format="in-article" />
}

export function SidebarAd({ slot }: { slot: string }) {
  return <AdBanner slot={slot} format="sidebar" className="hidden lg:block" />
}

export function MultiplexAd({ slot }: { slot: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <p className="text-sm text-gray-500 mb-4">También te puede interesar</p>
      <AdBanner slot={slot} format="multiplex" />
    </div>
  )
}