'use client'

import { useEffect, useState } from 'react'

interface Stats {
  peliculas: number
  personas: number
  efemerides: number
  afiches: number
  fotos: number
}

function formatNumber(num: number): string {
  return num.toLocaleString('es-AR')
}

export default function HeaderStats() {
  const [stats, setStats] = useState<Stats>({
    peliculas: 0,
    personas: 0,
    efemerides: 0,
    afiches: 0,
    fotos: 0,
  })

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error loading stats:', err))
  }, [])

  const statsDisplay = [
    { label: 'fichas técnicas', value: formatNumber(stats.peliculas) },
    { label: 'filmografías', value: formatNumber(stats.personas) },
    { label: 'efemérides', value: formatNumber(stats.efemerides) },
    { label: 'afiches', value: formatNumber(stats.afiches) },
    { label: 'fotos', value: formatNumber(stats.fotos) },
  ]

  return (
    <div className="bg-zinc-800/50 border-b border-zinc-700/50 relative z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          {statsDisplay.map((stat, index) => (
            <div key={stat.label} className="flex items-baseline gap-1">
              <span className="font-semibold text-white">{stat.value}</span>
              <span className="text-zinc-400">{stat.label}</span>
              {index < statsDisplay.length - 1 && (
                <span className="hidden sm:inline ml-6 text-zinc-700">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}