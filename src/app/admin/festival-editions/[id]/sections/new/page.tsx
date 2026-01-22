// src/app/admin/festival-editions/[id]/sections/new/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import FestivalSectionForm from './FestivalSectionForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewSectionPage({ params }: PageProps) {
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
          sectionTemplates: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      sections: {
        select: { slug: true }
      }
    }
  })

  if (!edition) {
    notFound()
  }

  // Filter out templates that already have sections in this edition
  const existingSlugs = new Set(edition.sections.map(s => s.slug))
  const availableTemplates = edition.festival.sectionTemplates.filter(
    t => !existingSlugs.has(t.slug)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/festival-editions/${editionId}`}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Sección</h1>
          <p className="text-sm text-gray-500">
            {edition.festival.name} - {edition.editionNumber}° Edición ({edition.year})
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FestivalSectionForm
          editionId={editionId}
          templates={availableTemplates}
        />
      </div>
    </div>
  )
}
