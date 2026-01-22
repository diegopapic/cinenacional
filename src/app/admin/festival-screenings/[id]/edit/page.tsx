// src/app/admin/festival-screenings/[id]/edit/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import FestivalScreeningForm from '@/components/admin/festivals/FestivalScreeningForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditScreeningPage({ params }: PageProps) {
  const { id } = await params
  const screeningId = parseInt(id)

  if (isNaN(screeningId)) {
    notFound()
  }

  const screening = await prisma.festivalScreening.findUnique({
    where: { id: screeningId },
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
        select: {
          id: true,
          name: true,
          isCompetitive: true
        }
      },
      edition: {
        select: {
          id: true,
          year: true,
          editionNumber: true,
          festival: {
            select: {
              id: true,
              name: true,
              shortName: true
            }
          },
          sections: {
            select: {
              id: true,
              name: true,
              isCompetitive: true
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      venue: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!screening) {
    notFound()
  }

  // Transform screening data for the form
  // Convert Date objects to ISO strings to avoid serialization issues
  const screeningForForm = {
    id: screening.id,
    editionId: screening.editionId,
    sectionId: screening.sectionId,
    movieId: screening.movieId,
    screeningDate: screening.screeningDate instanceof Date
      ? screening.screeningDate.toISOString()
      : screening.screeningDate,
    screeningTime: screening.screeningTime instanceof Date
      ? screening.screeningTime.toISOString()
      : screening.screeningTime,
    venueId: screening.venueId,
    premiereType: screening.premiereType,
    isOfficial: screening.isOfficial,
    notes: screening.notes,
    movie: screening.movie
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/festival-editions/${screening.editionId}`}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Proyeccion</h1>
          <p className="text-sm text-gray-500">
            {screening.edition.festival.shortName || screening.edition.festival.name} - {screening.edition.editionNumber} Edicion ({screening.edition.year})
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FestivalScreeningForm
          editionId={screening.editionId}
          sections={screening.edition.sections}
          screening={screeningForForm}
        />
      </div>
    </div>
  )
}
