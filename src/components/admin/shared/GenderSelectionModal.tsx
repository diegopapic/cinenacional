// src/components/admin/shared/GenderSelectionModal.tsx

import { X, UserCircle } from 'lucide-react'
import GenderSelector from './GenderSelector'

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
  if (!isOpen) return null

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

          <GenderSelector
            onSelect={onSelect}
            firstName={showSaveHint ? firstName : undefined}
            showSaveOption={showSaveHint}
          />
        </div>
      </div>
    </div>
  )
}
