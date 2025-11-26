// src/components/ads/HomeMiddleBanner.tsx
'use client'

import { useEffect } from 'react'

export default function HomeMiddleBanner() {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className="bg-zinc-900/50 border-y border-zinc-800 py-4 my-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-4540700730503978"
            data-ad-slot="7063278975"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  )
}