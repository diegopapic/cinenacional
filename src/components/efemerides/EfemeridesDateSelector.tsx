// src/components/efemerides/EfemeridesDateSelector.tsx
'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  { label: 'Enero', days: 31 },
  { label: 'Febrero', days: 29 },
  { label: 'Marzo', days: 31 },
  { label: 'Abril', days: 30 },
  { label: 'Mayo', days: 31 },
  { label: 'Junio', days: 30 },
  { label: 'Julio', days: 31 },
  { label: 'Agosto', days: 31 },
  { label: 'Septiembre', days: 30 },
  { label: 'Octubre', days: 31 },
  { label: 'Noviembre', days: 30 },
  { label: 'Diciembre', days: 31 },
]

interface EfemeridesDateSelectorProps {
  month: number
  day: number
}

function buildDateUrl(m: number, d: number): string {
  const monthStr = String(m).padStart(2, '0')
  const dayStr = String(d).padStart(2, '0')
  return `/efemerides/${monthStr}-${dayStr}`
}

export default function EfemeridesDateSelector({ month, day }: EfemeridesDateSelectorProps) {
  const router = useRouter()
  const maxDay = MONTHS[month - 1].days

  const navigateToDate = (m: number, d: number) => {
    router.push(buildDateUrl(m, d))
  }

  const goPrev = () => {
    let newDay = day - 1
    let newMonth = month
    if (newDay < 1) {
      newMonth = month === 1 ? 12 : month - 1
      newDay = MONTHS[newMonth - 1].days
    }
    navigateToDate(newMonth, newDay)
  }

  const goNext = () => {
    let newDay = day + 1
    let newMonth = month
    if (newDay > MONTHS[month - 1].days) {
      newMonth = month === 12 ? 1 : month + 1
      newDay = 1
    }
    navigateToDate(newMonth, newDay)
  }

  const goToday = () => {
    router.push('/efemerides')
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value)
    const clampedDay = Math.min(day, MONTHS[newMonth - 1].days)
    navigateToDate(newMonth, clampedDay)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigateToDate(month, parseInt(e.target.value))
  }

  return (
    <div className="mt-6 flex items-center gap-2 border-b border-border/10 pb-4 md:gap-3">
      {/* Prev day */}
      <button
        onClick={goPrev}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Day select */}
      <select
        value={day}
        onChange={handleDayChange}
        className="h-8 tabular-nums border border-border/30 bg-background px-2 text-[13px] text-muted-foreground/60 outline-hidden transition-colors focus:border-accent/30 [&_option]:bg-background [&_option]:text-foreground"
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Month select */}
      <select
        value={month}
        onChange={handleMonthChange}
        className="h-8 border border-border/30 bg-background px-2 text-[13px] text-muted-foreground/60 outline-hidden transition-colors focus:border-accent/30 [&_option]:bg-background [&_option]:text-foreground"
      >
        {MONTHS.map((m, idx) => (
          <option key={idx + 1} value={idx + 1}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Next day */}
      <button
        onClick={goNext}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground/40 transition-colors hover:text-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Today button */}
      <button
        onClick={goToday}
        className="ml-auto h-8 border border-border/30 px-3 text-[11px] tracking-wide text-muted-foreground/40 transition-colors hover:border-accent/30 hover:text-accent"
      >
        HOY
      </button>
    </div>
  )
}
