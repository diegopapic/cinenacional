// src/components/admin/locations/LocationTreeNode.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown, MapPin, Edit, Trash2, Plus, Users } from 'lucide-react'

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

interface LocationTreeNodeProps {
  node: LocationNode
  level: number
  onDelete: (id: number, name: string) => void
}

export default function LocationTreeNode({ node, level, onDelete }: LocationTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1) // Expandir solo el primer nivel por defecto
  const hasChildren = node.children.length > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(node.id, node.name)
  }

  // Determinar si tiene relaciones que impiden su eliminación
  const hasRelations = 
    node._count.children > 0 ||
    node._count.peopleBornHere > 0 ||
    node._count.peopleDiedHere > 0

  // Construir tooltip con información de relaciones
  const getRelationsTooltip = () => {
    const relations = []
    if (node._count.children > 0) relations.push(`${node._count.children} lugares`)
    if (node._count.peopleBornHere > 0) relations.push(`${node._count.peopleBornHere} nacimientos`)
    if (node._count.peopleDiedHere > 0) relations.push(`${node._count.peopleDiedHere} fallecimientos`)
    return relations.join(', ')
  }

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer group`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        {/* Chevron para expandir/colapsar */}
        <button
          onClick={handleToggle}
          className={`p-0.5 ${!hasChildren ? 'invisible' : ''}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Icono de lugar */}
        <MapPin className="w-4 h-4 text-gray-400" />

        {/* Nombre del lugar */}
        <span className="flex-1 text-sm font-medium text-gray-900">
          {node.name}
        </span>

        {/* Badges de contadores */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {node._count.peopleBornHere + node._count.peopleDiedHere > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500" title="Personas relacionadas">
              <Users className="w-3 h-3" />
              {node._count.peopleBornHere + node._count.peopleDiedHere}
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/admin/locations/new?parentId=${node.id}`}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Agregar lugar hijo"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="w-4 h-4" />
          </Link>
          
          <Link
            href={`/admin/locations/${node.id}/edit`}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Editar"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
          
          <button
            onClick={handleDelete}
            disabled={hasRelations}
            className={`p-1.5 rounded ${
              hasRelations
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title={hasRelations ? `No se puede eliminar: ${getRelationsTooltip()}` : 'Eliminar'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hijos */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <LocationTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}