// src/components/admin/shared/GenderSelector.tsx

import { useState } from 'react'
import { User } from 'lucide-react'

interface GenderSelectorProps {
  onSelect: (gender: 'MALE' | 'FEMALE' | 'OTHER' | null, saveToDatabase: boolean) => void
  disabled?: boolean
  /** Nombre para mostrar en el checkbox de guardado */
  firstName?: string
  /** Mostrar checkbox para guardar nombre (default true) */
  showSaveOption?: boolean
}

const GENDER_OPTIONS = [
  { value: 'MALE' as const, label: 'Masculino', borderColor: 'hover:border-blue-500', bgHover: 'hover:bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { value: 'FEMALE' as const, label: 'Femenino', borderColor: 'hover:border-pink-500', bgHover: 'hover:bg-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-600' },
  { value: 'OTHER' as const, label: 'Otro', borderColor: 'hover:border-purple-500', bgHover: 'hover:bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { value: null, label: 'Desconocido', borderColor: 'hover:border-gray-400', bgHover: 'hover:bg-gray-50', iconBg: 'bg-gray-100', iconColor: 'text-gray-400' },
] as const

export default function GenderSelector({
  onSelect,
  disabled = false,
  firstName,
  showSaveOption = true,
}: GenderSelectorProps) {
  const [saveName, setSaveName] = useState(true)

  const handleSelect = (gender: 'MALE' | 'FEMALE' | 'OTHER' | null) => {
    const shouldSave = saveName && (gender === 'MALE' || gender === 'FEMALE')
    onSelect(gender, shouldSave)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {GENDER_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg ${option.borderColor} ${option.bgHover} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`w-12 h-12 rounded-full ${option.iconBg} flex items-center justify-center`}>
              <User className={`h-6 w-6 ${option.iconColor}`} />
            </div>
            <span className="font-medium text-gray-900">{option.label}</span>
          </button>
        ))}
      </div>

      {showSaveOption && firstName && (
        <div className="mt-4">
          <label className="flex items-center justify-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveName}
              onChange={(e) => setSaveName(e.target.checked)}
              className="h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">
              Guardar &ldquo;{firstName}&rdquo; para futuras asignaciones automáticas de género
            </span>
          </label>
        </div>
      )}
    </>
  )
}
