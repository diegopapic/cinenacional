// src/components/admin/locations/LocationTree.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LocationTreeNode from './LocationTreeNode'
import { Search, Loader2 } from 'lucide-react'

interface LocationNode {
  id: number
  name: string
  slug: string
  children: LocationNode[]
  _count: {
    children: number
    peopleBornHere: number
    peopleDiedHere: number
  }
}

export default function LocationTree() {
  const router = useRouter()
  const [locations, setLocations] = useState<LocationNode[]>([])
  const [filteredLocations, setFilteredLocations] = useState<LocationNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    loadLocationTree()
  }, [])

  useEffect(() => {
    filterLocations()
  }, [searchTerm, locations])

  const loadLocationTree = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/locations/tree', {
        cache: 'no-store'  // Evitar caché
      })
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error loading location tree:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterLocations = () => {
    if (!searchTerm.trim()) {
      setFilteredLocations(locations)
      return
    }

    const term = searchTerm.toLowerCase()
    
    const filterNode = (node: LocationNode): LocationNode | null => {
      // Verificar si el nodo actual coincide
      const nodeMatches = node.name.toLowerCase().includes(term)
      
      // Filtrar recursivamente los hijos
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is LocationNode => child !== null)
      
      // Incluir el nodo si coincide o si tiene hijos que coinciden
      if (nodeMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        }
      }
      
      return null
    }
    
    const filtered = locations
      .map(node => filterNode(node))
      .filter((node): node is LocationNode => node !== null)
    
    setFilteredLocations(filtered)
  }

  const handleDelete = async (id: number, name: string) => {
    setDeleteModal({ id, name })
  }

  const confirmDelete = async () => {
    if (!deleteModal) return

    try {
      const response = await fetch(`/api/locations/${deleteModal.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al eliminar el lugar')
        return
      }

      // Recargar el árbol
      await loadLocationTree()
      router.refresh()
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Error al eliminar el lugar')
    } finally {
      setDeleteModal(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar lugares..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Árbol de lugares */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No se encontraron lugares que coincidan con la búsqueda' : 'No hay lugares cargados'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredLocations.map((location) => (
            <LocationTreeNode
              key={location.id}
              node={location}
              level={0}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar "{deleteModal.name}"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}