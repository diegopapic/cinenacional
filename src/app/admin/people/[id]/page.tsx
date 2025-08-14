// src/app/admin/people/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Edit, 
  ExternalLink, 
  Calendar,
  MapPin,
  Film,
  Award,
  Loader2,
  AlertCircle,
  User
} from 'lucide-react';
import { usePerson } from '@/hooks/usePeople';
import { formatPersonName, formatGender, formatBirthInfo } from '@/lib/people/peopleUtils';
import { PERSON_LINK_TYPES } from '@/lib/people/peopleConstants';

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { person, loading, error } = usePerson(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
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
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
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

  const fullName = formatPersonName(person);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/admin/people"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al listado
          </Link>
          
          <Link 
            href={`/admin/people/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
        </div>

        {/* Info principal */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Columna izquierda - Foto y datos básicos */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {/* Foto */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-100">
                  {person.photoUrl ? (
                    <Image
                      src={person.photoUrl}
                      alt={fullName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Nombre y estado */}
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                  {person.realName && (
                    <p className="text-sm text-gray-500 mt-1">
                      {person.realName}
                    </p>
                  )}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      person.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {person.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Datos básicos */}
                <div className="space-y-3 text-sm">
                  {person.gender && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{formatGender(person.gender)}</span>
                    </div>
                  )}
                  
                  {person.birthDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{formatBirthInfo(person)}</span>
                    </div>
                  )}
                  
                  {person.birthLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">Nacido en {person.birthLocation.name}</span>
                    </div>
                  )}
                  
                  {person.deathDate && (
                    <>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          Fallecido el {new Date(person.deathDate).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                      {person.deathLocation && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">en {person.deathLocation.name}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {(person._count?.castRoles || 0) + (person._count?.crewRoles || 0)}
                    </p>
                    <p className="text-xs text-gray-500">Películas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{person._count?.awards || 0}</p>
                    <p className="text-xs text-gray-500">Premios</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enlaces */}
            {person.links && person.links.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Enlaces</h3>
                <div className="space-y-2">
                  {person.links
                    .filter(link => link.isActive)
                    .map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.title || PERSON_LINK_TYPES[link.type] || link.type}
                        {link.isVerified && (
                          <span className="ml-auto px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            Verificado
                          </span>
                        )}
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Contenido principal */}
          <div className="md:col-span-2 space-y-6">
            {/* Biografía */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Biografía</h3>
              {person.biography ? (
                <div className="prose prose-sm max-w-none">
                  {person.biography.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 text-gray-700">{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  No hay biografía disponible
                </p>
              )}
            </div>

            {/* Filmografía */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Film className="h-5 w-5" />
                Filmografía
              </h3>
              <div className="space-y-4">
                {person._count?.castRoles && person._count.castRoles > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Como Actor/Actriz</h4>
                    <p className="text-gray-600">
                      {person._count.castRoles} películas
                    </p>
                  </div>
                )}
                
                {person._count?.crewRoles && person._count.crewRoles > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Como Equipo Técnico</h4>
                    <p className="text-gray-600">
                      {person._count.crewRoles} películas
                    </p>
                  </div>
                )}
                
                {(!person._count?.castRoles && !person._count?.crewRoles) && (
                  <p className="text-gray-500">
                    No hay películas asociadas
                  </p>
                )}
              </div>
            </div>

            {/* Premios */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Premios y Reconocimientos
              </h3>
              {person._count?.awards && person._count.awards > 0 ? (
                <p className="text-gray-600">
                  {person._count.awards} premios registrados
                </p>
              ) : (
                <p className="text-gray-500">
                  No hay premios registrados
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}