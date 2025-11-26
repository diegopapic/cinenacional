import { Loader2 } from 'lucide-react'

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mr-3" />
        <span className="text-gray-600">Cargando resultados...</span>
      </div>
    </div>
  )
}