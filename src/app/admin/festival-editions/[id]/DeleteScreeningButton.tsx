// src/app/admin/festival-editions/[id]/DeleteScreeningButton.tsx

'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface DeleteScreeningButtonProps {
  screeningId: number
  movieTitle: string
}

export default function DeleteScreeningButton({ screeningId, movieTitle }: DeleteScreeningButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la proyección de "${movieTitle}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/festival-screenings/${screeningId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Proyección eliminada')
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
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
