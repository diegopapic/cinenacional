// src/app/admin/festival-editions/[id]/AddScreeningSection.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import FestivalScreeningForm from '@/components/admin/festivals/FestivalScreeningForm'
// Simple section type for the form - only needs id, name, isCompetitive
interface SimpleFestivalSection {
  id: number
  name: string
  isCompetitive: boolean
}

interface AddScreeningSectionProps {
  editionId: number
  sections: SimpleFestivalSection[]
}

export default function AddScreeningSection({ editionId, sections }: AddScreeningSectionProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSuccess = () => {
    setIsExpanded(false)
    router.refresh()
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-gray-900">Agregar proyección</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 pt-4">
          <FestivalScreeningForm
            editionId={editionId}
            sections={sections}
            onSuccess={handleSuccess}
            onCancel={() => setIsExpanded(false)}
            compact
          />
        </div>
      )}
    </div>
  )
}
