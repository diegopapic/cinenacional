// src/app/admin/festivals/[id]/editions/new/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import FestivalEditionForm from '@/components/admin/festivals/FestivalEditionForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewEditionPage({ params }: PageProps) {
  const { id } = await params
  const festivalId = parseInt(id)

  if (isNaN(festivalId)) {
    notFound()
  }

  const festival = await prisma.festival.findUnique({
    where: { id: festivalId },
    select: { id: true, name: true }
  })

  if (!festival) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/festivals/${festivalId}`}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Edición</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FestivalEditionForm
          festivalId={festivalId}
          festivalName={festival.name}
        />
      </div>
    </div>
  )
}
