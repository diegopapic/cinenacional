'use client'

import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  label: string
  value: string | number | ''
  onChange: (v: string) => void
  /** Pre-built options array. Renders "Todos" + options with optional count. */
  options?: Array<{ id: number | string; name: string; count?: number }>
  /** Custom option elements. "Todos" is auto-prepended. */
  children?: React.ReactNode
  /** Label for the "all" default option (default: "Todos") */
  allLabel?: string
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  children,
  allLabel = 'Todos',
}: FilterSelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full cursor-pointer appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
        >
          <option value="">{allLabel}</option>
          {options
            ? options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                  {opt.count !== undefined && ` (${opt.count})`}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
      </div>
    </div>
  )
}
