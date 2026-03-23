// src/components/listados/obituarios/ObituariosYearSelector.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

interface ObituariosYearSelectorProps {
  selectedYear: number
  availableYears: number[]
}

export default function ObituariosYearSelector({ selectedYear, availableYears }: ObituariosYearSelectorProps) {
  const router = useRouter()

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value)
    router.push(`/listados/obituarios/${year}`, { scroll: false })
  }

  if (availableYears.length === 0) return null

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border/20 pb-4">
      <div className="relative">
        <select
          value={selectedYear}
          onChange={handleYearChange}
          className="h-8 appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-hidden transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
      </div>
    </div>
  )
}
