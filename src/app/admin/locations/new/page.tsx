// src/app/admin/locations/new/page.tsx

import { Suspense } from 'react'
import LocationForm from '@/components/admin/locations/LocationForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Nuevo Lugar - Admin',
  description: 'Crear nuevo lugar'
}

export default function NewLocationPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/locations"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a lugares
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Lugar</h1>
        <p className="mt-2 text-gray-600">
          Agrega un nuevo país, provincia, estado o ciudad
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Suspense fallback={<div>Cargando formulario...</div>}>
          <LocationForm />
        </Suspense>
      </div>
    </div>
  )
}