'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Save, GripVertical } from 'lucide-react'

interface TriviaItem {
  id?: number
  content: string
}

interface TriviaManagerProps {
  onChange: (trivia: TriviaItem[]) => void
  initialTrivia?: TriviaItem[]
}

export default function TriviaManager({
  onChange,
  initialTrivia = []
}: TriviaManagerProps) {
  const [items, setItems] = useState<TriviaItem[]>(initialTrivia)
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentContent, setCurrentContent] = useState('')

  useEffect(() => {
    onChange(items)
  }, [items])

  const handleAdd = () => {
    if (!currentContent.trim()) return

    if (editingIndex !== null) {
      const updated = [...items]
      updated[editingIndex] = { ...updated[editingIndex], content: currentContent.trim() }
      setItems(updated)
      setEditingIndex(null)
    } else {
      setItems([...items, { content: currentContent.trim() }])
    }

    setCurrentContent('')
    setShowForm(false)
  }

  const handleEdit = (index: number) => {
    setCurrentContent(items[index].content)
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleCancel = () => {
    setCurrentContent('')
    setEditingIndex(null)
    setShowForm(false)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...items]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setItems(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return
    const updated = [...items]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setItems(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Trivia</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Trivia
          </button>
        )}
      </div>

      {/* Lista de trivia */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Mover arriba"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 leading-relaxed">{item.content}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Eliminar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Texto de trivia *
            </label>
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ej: Forma parte de un tríptico junto con Luján y Al final la vida sigue igual."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!currentContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingIndex !== null ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 italic">No hay trivia agregada</p>
      )}
    </div>
  )
}
