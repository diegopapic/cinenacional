// src/components/admin/shared/NameSplitModal.tsx

import { useState, useEffect } from 'react'
import { X, User, UserCircle, Check } from 'lucide-react'

interface NameSplitModalProps {
  isOpen: boolean
  fullName: string
  onConfirm: (
    firstName: string,
    lastName: string,
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null,
    saveToDatabase: boolean
  ) => void
  onCancel: () => void
}

/**
 * Modal para seleccionar qué palabras forman el nombre y el género.
 * Se muestra cuando no se reconoce ningún nombre en FirstNameGender.
 */
export default function NameSplitModal({
  isOpen,
  fullName,
  onConfirm,
  onCancel
}: NameSplitModalProps) {
  const [words, setWords] = useState<string[]>([])
  const [firstNameWordCount, setFirstNameWordCount] = useState(1)
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null)
  const [step, setStep] = useState<'name' | 'gender'>('name')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Parsear palabras cuando cambia fullName
  useEffect(() => {
    if (fullName) {
      // Tokenizar respetando apodos entre comillas
      const tokens = tokenizeName(fullName.trim())
      setWords(tokens)
      setFirstNameWordCount(1)
      setSelectedGender(null)
      setStep('name')
    }
  }, [fullName])

  if (!isOpen) return null

  // Calcular nombre y apellido basado en selección
  const firstName = words.slice(0, firstNameWordCount).join(' ')
  const lastName = words.slice(firstNameWordCount).join(' ')

  const handleNameConfirm = () => {
    if (firstNameWordCount > 0 && firstNameWordCount < words.length) {
      setStep('gender')
    }
  }

  const handleGenderSelect = async (gender: 'MALE' | 'FEMALE' | 'OTHER' | null) => {
    setIsSubmitting(true)
    setSelectedGender(gender)
    
    // Solo guardar en la base de datos si es MALE o FEMALE
    const shouldSave = gender === 'MALE' || gender === 'FEMALE'
    
    onConfirm(firstName, lastName, gender, shouldSave)
    setIsSubmitting(false)
  }

  const handleBack = () => {
    setStep('name')
    setSelectedGender(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {step === 'name' ? 'Separar nombre y apellido' : 'Seleccionar género'}
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
          {step === 'name' ? (
            <>
              <p className="text-gray-600 mb-4 text-center">
                No se reconoció ningún nombre en{' '}
                <span className="font-semibold text-gray-900">"{fullName}"</span>.
                <br />
                Selecciona cuántas palabras forman el <strong>nombre</strong>:
              </p>

              {/* Selector de palabras */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {words.map((word, index) => {
                  const isSelected = index < firstNameWordCount
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFirstNameWordCount(index + 1)}
                      className={`
                        px-4 py-2 rounded-lg font-medium transition-all border-2
                        ${isSelected 
                          ? 'bg-blue-100 border-blue-500 text-blue-800' 
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-400'
                        }
                      `}
                    >
                      {word}
                      {isSelected && (
                        <Check className="inline-block ml-1 h-4 w-4" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Slider alternativo */}
              <div className="mb-6">
                <input
                  type="range"
                  min={1}
                  max={words.length - 1}
                  value={firstNameWordCount}
                  onChange={(e) => setFirstNameWordCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 palabra</span>
                  <span>{words.length - 1} palabras</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-500 mb-2 text-center">Vista previa:</div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nombre</div>
                    <div className="font-semibold text-blue-700 text-lg">
                      {firstName || <span className="text-gray-400 italic">vacío</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Apellido</div>
                    <div className="font-semibold text-green-700 text-lg">
                      {lastName || <span className="text-gray-400 italic">vacío</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón continuar */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNameConfirm}
                  disabled={!firstName || !lastName}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-2 text-center">
                Nombre: <span className="font-semibold text-blue-700">{firstName}</span>
                <br />
                Apellido: <span className="font-semibold text-green-700">{lastName}</span>
              </p>
              <p className="text-gray-600 mb-6 text-center">
                Selecciona el género para <span className="font-semibold">"{firstName}"</span>:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Masculino */}
                <button
                  type="button"
                  onClick={() => handleGenderSelect('MALE')}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Masculino</span>
                  <span className="text-xs text-gray-500">Se guardará en la base</span>
                </button>

                {/* Femenino */}
                <button
                  type="button"
                  onClick={() => handleGenderSelect('FEMALE')}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-pink-600" />
                  </div>
                  <span className="font-medium text-gray-900">Femenino</span>
                  <span className="text-xs text-gray-500">Se guardará en la base</span>
                </button>

                {/* Otro */}
                <button
                  type="button"
                  onClick={() => handleGenderSelect('OTHER')}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900">Otro</span>
                  <span className="text-xs text-gray-500">No se guardará</span>
                </button>

                {/* Desconocido */}
                <button
                  type="button"
                  onClick={() => handleGenderSelect(null)}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="font-medium text-gray-900">Desconocido</span>
                  <span className="text-xs text-gray-500">No se guardará</span>
                </button>
              </div>

              {/* Botón volver */}
              <div className="flex justify-start mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {step === 'name' 
              ? '💡 Haz clic en las palabras que forman el nombre o usa el slider.'
              : `💡 Si eliges Masculino o Femenino, "${firstName}" se guardará para futuras asignaciones.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Tokeniza un nombre respetando apodos entre comillas
 */
function tokenizeName(fullName: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < fullName.length; i++) {
    const char = fullName[i]
    const prevChar = i > 0 ? fullName[i - 1] : ''
    
    // Detectar inicio de comillas (solo si hay espacio antes o es el inicio)
    if (!inQuotes && (char === '"' || char === "'" || char === '«' || char === '"')) {
      if (prevChar === ' ' || i === 0) {
        inQuotes = true
        quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char)
        current += char
        continue
      }
    }
    
    // Detectar fin de comillas
    if (inQuotes && (char === quoteChar || (quoteChar === '"' && char === '"'))) {
      current += char
      inQuotes = false
      quoteChar = ''
      continue
    }
    
    // Espacios fuera de comillas separan tokens
    if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  
  // Agregar última palabra
  if (current.trim()) {
    tokens.push(current.trim())
  }
  
  return tokens
}