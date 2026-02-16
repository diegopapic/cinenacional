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
    { label: 'retratos', value: formatNumber(stats.fotos) },
  ]

  return (
    <div className="overflow-hidden bg-stats">
      {/* Desktop: static centered row (lg+) */}
      <div className="mx-auto hidden max-w-7xl items-center justify-center px-4 py-2 lg:flex lg:px-6">
        {statsDisplay.map((stat, index) => (
          <span key={stat.label} className="flex shrink-0 items-center whitespace-nowrap">
            <span className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium tabular-nums tracking-tight text-stats-foreground/90">
                {stat.value}
              </span>
              <span className="text-[11px] tracking-wide text-stats-foreground/60">
                {stat.label}
              </span>
            </span>
            {index < statsDisplay.length - 1 && (
              <span className="mx-3 text-[10px] text-stats-foreground/30" aria-hidden="true">
                |
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Mobile + tablet: continuous marquee ticker */}
      <div className="relative overflow-hidden py-2 lg:hidden" aria-label="Estadísticas del archivo">
        {/* Fade gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-stats to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-stats to-transparent" />

        <div className="stats-marquee inline-flex w-max">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center"
              {...(copy === 1 ? { 'aria-hidden': 'true' } : {})}
            >
              {statsDisplay.map((stat) => (
                <span key={`${copy}-${stat.label}`} className="flex shrink-0 items-center whitespace-nowrap">
                  <span className="mx-4 text-[10px] text-stats-foreground/30" aria-hidden="true">
                    {'\u00b7'}
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium tabular-nums tracking-tight text-stats-foreground/90">
                      {stat.value}
                    </span>
                    <span className="text-[11px] tracking-wide text-stats-foreground/60">
                      {stat.label}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
