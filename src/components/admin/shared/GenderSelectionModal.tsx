// src/components/admin/shared/GenderSelectionModal.tsx

import { useState } from 'react'
import { X, User, UserCircle } from 'lucide-react'

interface GenderSelectionModalProps {
  isOpen: boolean
  firstName: string
  onSelect: (gender: 'MALE' | 'FEMALE' | 'OTHER' | null, saveToDatabase: boolean) => void
  onCancel: () => void
  showSaveHint?: boolean
}

export default function GenderSelectionModal({
  isOpen,
  firstName,
  onSelect,
  onCancel,
  showSaveHint = true
}: GenderSelectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveName, setSaveName] = useState(true)

  if (!isOpen) return null

  const handleSelect = async (gender: 'MALE' | 'FEMALE' | 'OTHER' | null) => {
    setIsSubmitting(true)

    // Guardar en la base de datos solo si es MALE/FEMALE y el checkbox está activado
    const shouldSave = saveName && (gender === 'MALE' || gender === 'FEMALE')

    onSelect(gender, shouldSave)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Seleccionar género
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">
            {showSaveHint ? (
              <>
                No se pudo determinar el género automáticamente para{' '}
                <span className="font-semibold text-gray-900">&ldquo;{firstName}&rdquo;</span>.
                <br />
                Por favor, selecciona el género correspondiente:
              </>
            ) : (
              <>
                Selecciona el género para{' '}
                <span className="font-semibold text-gray-900">&ldquo;{firstName}&rdquo;</span>:
              </>
            )}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Masculino */}
            <button
              type="button"
              onClick={() => handleSelect('MALE')}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Masculino</span>
            </button>

            {/* Femenino */}
            <button
              type="button"
              onClick={() => handleSelect('FEMALE')}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <User className="h-6 w-6 text-pink-600" />
              </div>
              <span className="font-medium text-gray-900">Femenino</span>
            </button>

            {/* Otro */}
            <button
              type="button"
              onClick={() => handleSelect('OTHER')}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900">Otro</span>
            </button>

            {/* Desconocido */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              disabled={isSubmitting}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <span className="font-medium text-gray-900">Desconocido</span>
            </button>
          </div>
        </div>

        {/* Footer con checkbox para guardar nombre */}
        {showSaveHint && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveName}
                onChange={(e) => setSaveName(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">
                Guardar &ldquo;{firstName}&rdquo; para futuras asignaciones automáticas de género
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}