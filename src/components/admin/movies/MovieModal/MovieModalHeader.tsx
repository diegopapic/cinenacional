// src/components/admin/movies/MovieModal/MovieModalHeader.tsx
import { X } from 'lucide-react'

interface MovieModalHeaderProps {
  isEditing: boolean
  onClose: () => void
}

export default function MovieModalHeader({ isEditing, onClose }: MovieModalHeaderProps) {
  return (
    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Editar Película' : 'Nueva Película'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}