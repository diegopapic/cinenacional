// src/components/ads/AdBanner.tsx
'use client'

import { useEffect } from 'react'

export default function AdBanner() {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className="bg-zinc-900/50 border-y border-zinc-800 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cambiado: quité flex, ahora es block directo */}
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ 
              display: 'block',
              minWidth: '300px',  // 👈 Ancho mínimo para móviles
              minHeight: '50px'   // 👈 Altura mínima
            }}
            data-ad-client="ca-pub-9695271411409237"
            data-ad-slot="1634150481"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  )
}