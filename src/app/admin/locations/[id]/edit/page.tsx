// src/app/admin/locations/[id]/edit/page.tsx

import { notFound } from 'next/navigation'
import LocationForm from '@/components/admin/locations/LocationForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Editar Lugar - Admin',
  description: 'Editar lugar existente'
}

interface EditLocationPageProps {
  params: {
    id: string
  }
}

async function getLocation(id: number) {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      parent: true
    }
  })
  
  return location
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const id = parseInt(params.id)
  
  if (isNaN(id)) {
    notFound()
  }
  
  const location = await getLocation(id)
  
  if (!location) {
    notFound()
  }

  // Convertir Decimal a string y simplificar el objeto para el formulario
  const locationData = {
    id: location.id,
    name: location.name,
    slug: location.slug,
    parentId: location.parentId,
    parent: location.parent ? {
      id: location.parent.id,
      name: location.parent.name
    } : undefined,
    latitude: location.latitude?.toString() || null,
    longitude: location.longitude?.toString() || null
  }

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
        
        <h1 className="text-3xl font-bold text-gray-900">Editar Lugar</h1>
        <p className="mt-2 text-gray-600">
          Modifica la información de {location.name}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <LocationForm location={locationData} />
      </div>
    </div>
  )
}