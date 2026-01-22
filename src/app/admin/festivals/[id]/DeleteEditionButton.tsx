// src/app/admin/festivals/[id]/DeleteEditionButton.tsx

'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface DeleteEditionButtonProps {
  editionId: number
  editionName: string
}

export default function DeleteEditionButton({ editionId, editionName }: DeleteEditionButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la edición "${editionName}"? Esto eliminará también todas las secciones y proyecciones asociadas.`)) {
      return
    }

    try {
      const response = await fetch(`/api/festival-editions/${editionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Edición eliminada')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-2 text-gray-400 hover:text-red-600"
      title="Eliminar"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  )
}
