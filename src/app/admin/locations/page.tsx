// src/app/admin/locations/page.tsx

import Link from 'next/link'
import { Plus } from 'lucide-react'
import LocationTree from '@/components/admin/locations/LocationTree'

export const metadata = {
  title: 'Lugares - Admin',
  description: 'Administración de lugares'
}

// Revalidar cada 0 segundos (sin caché)
export const revalidate = 0

export default function LocationsAdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lugares</h1>
          <p className="mt-2 text-gray-600">
            Gestiona la estructura jerárquica de países, provincias, estados y ciudades
          </p>
        </div>
        
        <Link
          href="/admin/locations/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Lugar
        </Link>
      </div>

      <LocationTree />
    </div>
  )
}