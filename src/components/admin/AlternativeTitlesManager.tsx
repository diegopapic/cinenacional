'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Save } from 'lucide-react'

interface AlternativeTitle {
  id?: number
  title: string
  description?: string
}

interface AlternativeTitlesManagerProps {
  onChange: (titles: AlternativeTitle[]) => void
  initialTitles?: AlternativeTitle[]
}

export default function AlternativeTitlesManager({ 
  onChange, 
  initialTitles = [] 
}: AlternativeTitlesManagerProps) {
  const [titles, setTitles] = useState<AlternativeTitle[]>(initialTitles)
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentTitle, setCurrentTitle] = useState<AlternativeTitle>({
    title: '',
    description: ''
  })

  useEffect(() => {
    onChange(titles)
  }, [titles])

  const handleAdd = () => {
    if (!currentTitle.title.trim()) return
    
    if (editingIndex !== null) {
      const updatedTitles = [...titles]
      updatedTitles[editingIndex] = currentTitle
      setTitles(updatedTitles)
      setEditingIndex(null)
    } else {
      setTitles([...titles, currentTitle])
    }
    
    setCurrentTitle({ title: '', description: '' })
    setShowForm(false)
  }

  const handleEdit = (index: number) => {
    setCurrentTitle(titles[index])
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleDelete = (index: number) => {
    setTitles(titles.filter((_, i) => i !== index))
  }

  const handleCancel = () => {
    setCurrentTitle({ title: '', description: '' })
    setEditingIndex(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Títulos Alternativos</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Título
          </button>
        )}
      </div>

      {/* Lista de títulos */}
      {titles.length > 0 && (
        <div className="space-y-2">
          {titles.map((title, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{title.title}</p>
                {title.description && (
                  <p className="text-sm text-gray-600 mt-1">{title.description}</p>
                )}
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
              Título alternativo *
            </label>
            <input
              type="text"
              value={currentTitle.title}
              onChange={(e) => setCurrentTitle({ ...currentTitle, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ej: Wild Tales"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <input
              type="text"
              value={currentTitle.description || ''}
              onChange={(e) => setCurrentTitle({ ...currentTitle, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              placeholder="Ej: Título de rodaje, Título internacional, Título abreviado, etc."
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
              disabled={!currentTitle.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingIndex !== null ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {titles.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 italic">No hay títulos alternativos agregados</p>
      )}
    </div>
  )
}