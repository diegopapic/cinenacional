// src/app/admin/people/[id]/edit/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PersonForm } from '@/components/admin/people/PersonForm';
import { ArrowLeft, Edit, Loader2, AlertCircle } from 'lucide-react';
import { usePerson } from '@/hooks/usePeople';

export default function EditPersonPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { person, loading, error } = usePerson(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error?.message || 'No se pudo cargar la información de la persona'}
                </h3>
              </div>
            </div>
          </div>
          <Link 
            href="/admin/people"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/admin/people"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al listado
          </Link>
          
          <div className="flex items-center gap-3">
            <Edit className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Editar Persona
              </h1>
              <p className="text-gray-600 mt-1">
                Modificando: {person.firstName} {person.lastName}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <PersonForm 
          personId={parseInt(id)} 
          initialData={person}
          onSuccess={() => router.push('/admin/people')}
        />
      </div>
    </div>
  );
}