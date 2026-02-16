// src/app/admin/people/page.tsx

import { Suspense } from 'react';
import { Metadata } from 'next';
import { PeopleTable } from '@/components/admin/people/PeopleTable';
import Link from 'next/link';
import { Plus, Users, Loader2, Merge } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gestión de Personas | Admin',
  description: 'Administración de personas del cine argentino',
};

export default function PeoplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-gray-700" />
                Gestión de Personas
              </h1>
              <p className="mt-2 text-gray-600">
                Administra el registro de actores, directores y personal técnico del cine argentino
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Link
                href="/admin/people/merge"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Merge className="w-5 h-5" />
                Merge
              </Link>
              <Link
                href="/admin/people/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nueva Persona
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards (opcional - comentado por ahora) */}
        {/* 
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Personas</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actores</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Directores</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
        */}
        
        {/* Tabla */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </div>
        }>
          <PeopleTable />
        </Suspense>
      </div>
    </div>
  );
}