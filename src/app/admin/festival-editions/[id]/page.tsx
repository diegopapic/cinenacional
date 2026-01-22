// src/app/admin/festival-editions/[id]/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Film, Calendar, Clock, MapPin, Star } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { PremiereTypeLabels } from '@/lib/festivals/festivalTypes'
import AddScreeningSection from './AddScreeningSection'
import DeleteScreeningButton from './DeleteScreeningButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditionDetailPage({ params }: PageProps) {
  const { id } = await params
  const editionId = parseInt(id)

  if (isNaN(editionId)) {
    notFound()
  }

  const edition = await prisma.festivalEdition.findUnique({
    where: { id: editionId },
    include: {
      festival: {
        select: {
          id: true,
          name: true,
          shortName: true,
          sectionTemplates: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      sections: {
        orderBy: { displayOrder: 'asc' },
        include: {
          _count: {
            select: { screenings: true }
          }
        }
      },
      screenings: {
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              year: true,
              posterUrl: true
            }
          },
          section: {
            select: { id: true, name: true }
          },
          venue: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { screeningDate: 'asc' },
          { screeningTime: 'asc' }
        ]
      }
    }
  })

  if (!edition) {
    notFound()
  }

  // Group screenings by date
  const screeningsByDate = edition.screenings.reduce((acc, screening) => {
    // Use the date string directly to avoid timezone issues
    const dateStr = screening.screeningDate instanceof Date
      ? screening.screeningDate.toISOString().split('T')[0]
      : String(screening.screeningDate).split('T')[0]
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(screening)
    return acc
  }, {} as Record<string, typeof edition.screenings>)

  const sortedDates = Object.keys(screeningsByDate).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/festivals/${edition.festivalId}`}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {edition.festival.shortName || edition.festival.name} - {edition.editionNumber}° Edición
            </h1>
            <p className="text-sm text-gray-500">
              {format(new Date(edition.startDate), "d 'de' MMMM", { locale: es })} -{' '}
              {format(new Date(edition.endDate), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/festival-editions/${edition.id}/edit`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar edición
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Secciones</div>
          <div className="text-2xl font-bold text-gray-900">{edition.sections.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Películas</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(edition.screenings.map(s => s.movieId)).size}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Proyecciones</div>
          <div className="text-2xl font-bold text-gray-900">{edition.screenings.length}</div>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Secciones</h2>
          <Link
            href={`/admin/festival-editions/${edition.id}/sections/new`}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            + Agregar sección
          </Link>
        </div>

        {edition.sections.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-4">
              No hay secciones definidas para esta edición.
            </p>
            {edition.festival.sectionTemplates.length > 0 && (
              <p className="text-sm text-gray-500">
                Puedes crear secciones desde las plantillas del festival.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {edition.sections.map((section) => (
              <div
                key={section.id}
                className={`p-3 rounded-lg border ${
                  section.isCompetitive
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{section.name}</span>
                  {section.isCompetitive && (
                    <Star className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {section._count.screenings} películas
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Screening */}
      {edition.sections.length > 0 && (
        <AddScreeningSection
          editionId={edition.id}
          sections={edition.sections}
        />
      )}

      {/* Screenings by Date */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Programación ({edition.screenings.length} proyecciones)
          </h2>
        </div>

        {edition.screenings.length === 0 ? (
          <div className="p-6 text-center">
            <Film className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay proyecciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              {edition.sections.length === 0
                ? 'Primero debes crear secciones para poder agregar proyecciones.'
                : 'Usa el formulario de arriba para agregar proyecciones.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedDates.map((dateKey) => (
              <div key={dateKey} className="p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es })}
                  <span className="text-sm font-normal text-gray-500">
                    ({screeningsByDate[dateKey].length} proyecciones)
                  </span>
                </h3>
                <div className="space-y-2">
                  {screeningsByDate[dateKey].map((screening) => (
                    <div
                      key={screening.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                    >
                      {/* Poster */}
                      {screening.movie.posterUrl ? (
                        <img
                          src={screening.movie.posterUrl}
                          alt=""
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                          <Film className="h-5 w-5 text-gray-400" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/movies?search=${encodeURIComponent(screening.movie.title)}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 truncate"
                          >
                            {screening.movie.title}
                          </Link>
                          {screening.movie.year && (
                            <span className="text-sm text-gray-500">({screening.movie.year})</span>
                          )}
                          {screening.premiereType !== 'REGULAR' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              {PremiereTypeLabels[screening.premiereType as keyof typeof PremiereTypeLabels]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">{screening.section.name}</span>
                          </span>
                          {screening.screeningTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(() => {
                                const timeStr = String(screening.screeningTime)
                                // Extract HH:mm from the time string (handles both Date and string)
                                const match = timeStr.match(/(\d{2}):(\d{2})/)
                                return match ? `${match[1]}:${match[2]}` : format(new Date(screening.screeningTime), 'HH:mm')
                              })()}
                            </span>
                          )}
                          {screening.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {screening.venue.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/festival-screenings/${screening.id}/edit`}
                          className="p-2 text-gray-400 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DeleteScreeningButton
                          screeningId={screening.id}
                          movieTitle={screening.movie.title}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
