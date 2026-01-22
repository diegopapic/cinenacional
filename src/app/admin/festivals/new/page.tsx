// src/app/admin/festivals/new/page.tsx

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FestivalForm from '@/components/admin/festivals/FestivalForm'

export default function NewFestivalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/festivals"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Festival</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <FestivalForm />
      </div>
    </div>
  )
}
