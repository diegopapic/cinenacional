// src/app/admin/people/new/page.tsx

import { Metadata } from 'next';
import Link from 'next/link';
import { PersonForm } from '@/components/admin/people/PersonForm';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nueva Persona | Admin',
  description: 'Crear nueva persona en el sistema',
};

export default function NewPersonPage() {
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
            <UserPlus className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nueva Persona</h1>
              <p className="text-gray-600 mt-1">
                Complete los datos para agregar una nueva persona al sistema
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <PersonForm />
      </div>
    </div>
  );
}