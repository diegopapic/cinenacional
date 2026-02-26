'use client'

interface FilterInputProps {
  label: string
  value: string | number | ''
  onChange: (v: string) => void
  placeholder?: string
  min?: number
  max?: number
}

export default function FilterInput({
  label,
  value,
  onChange,
  placeholder = 'Año',
  min,
  max,
}: FilterInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40">
        {label}
      </label>
      <input
        type="number"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="h-8 w-full border border-border/30 bg-transparent px-2 text-[12px] text-muted-foreground/60 outline-none transition-colors placeholder:text-muted-foreground/25 focus:border-accent/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  )
}
