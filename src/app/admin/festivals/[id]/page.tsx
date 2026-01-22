// src/app/admin/festivals/[id]/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import DeleteEditionButton from './DeleteEditionButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FestivalDetailPage({ params }: PageProps) {
  const { id } = await params
  const festivalId = parseInt(id)

  if (isNaN(festivalId)) {
    notFound()
  }

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    include: {
      location: {
        select: { id: true, name: true }
      },
      editions: {
        orderBy: { year: 'desc' },
        include: {
          _count: {
            select: { sections: true, screenings: true }
          }
        }
      },
      sectionTemplates: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
      }
    }
  })

  if (!festival) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/festivals"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{festival.name}</h1>
            <p className="text-sm text-gray-500">
              {festival.location.name}
              {festival.foundedYear && ` • Desde ${festival.foundedYear}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {festival.website && (
            <a
              href={festival.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Sitio web
            </a>
          )}
          <Link
            href={`/admin/festivals/${festival.id}/edit`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </div>
      </div>

      {/* Info Card */}
      {festival.description && (
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm text-gray-600">{festival.description}</p>
        </div>
      )}

      {/* Section Templates */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Plantillas de Secciones</h2>
          <Link
            href={`/admin/festivals/${festival.id}/section-templates/new`}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            + Agregar plantilla
          </Link>
        </div>

        {festival.sectionTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay plantillas de secciones definidas. Las plantillas se copian automáticamente a cada nueva edición.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {festival.sectionTemplates.map((template) => (
              <span
                key={template.id}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  template.isCompetitive
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {template.name}
                {template.isCompetitive && ' (Competencia)'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Editions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Ediciones ({festival.editions.length})
          </h2>
          <Link
            href={`/admin/festivals/${festival.id}/editions/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Edición
          </Link>
        </div>

        {festival.editions.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ediciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              Crea la primera edición del festival.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {festival.editions.map((edition) => (
              <li key={edition.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/admin/festival-editions/${edition.id}`}
                      className="flex items-center gap-3"
                    >
                      <span className="text-lg font-medium text-indigo-600 hover:text-indigo-800">
                        {edition.editionNumber}° Edición
                      </span>
                      <span className="text-gray-500">({edition.year})</span>
                      {edition.isPublished ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Publicada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Borrador
                        </span>
                      )}
                    </Link>
                    <div className="mt-1 text-sm text-gray-500">
                      {format(new Date(edition.startDate), "d 'de' MMMM", { locale: es })} -{' '}
                      {format(new Date(edition.endDate), "d 'de' MMMM, yyyy", { locale: es })}
                      <span className="mx-2">•</span>
                      {edition._count.sections} secciones
                      <span className="mx-2">•</span>
                      {edition._count.screenings} proyecciones
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/festival-editions/${edition.id}`}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Ver detalle"
                    >
                      <Calendar className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/admin/festival-editions/${edition.id}/edit`}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                    <DeleteEditionButton
                      editionId={edition.id}
                      editionName={`${edition.editionNumber}° Edición (${edition.year})`}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
