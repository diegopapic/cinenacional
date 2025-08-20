// src/components/home/ObituariosSection.tsx
import Link from 'next/link';
import { formatPartialDate } from '@/lib/shared/dateUtils';
import { calculateYearsBetween } from '@/lib/shared/dateUtils';

interface ObituariosSectionProps {
  obituarios: any[];
}

export default function ObituariosSection({ obituarios }: ObituariosSectionProps) {
  if (!obituarios || obituarios.length === 0) {
    return null; // No mostrar la sección si no hay obituarios
  }

  // Función para formatear el rol/profesión de la persona
  const formatearRoles = (person: any) => {
    const roles = []
    
    // Contar roles de cast y crew
    if (person._count) {
      if (person._count.castRoles > 0) {
        roles.push('Actor')
      }
      if (person._count.crewRoles > 0) {
        // Aquí podrías ser más específico obteniendo los roles del crew
        roles.push('Director/Técnico')
      }
    }
    
    return roles.length > 0 ? roles.join(', ') : 'Profesional del cine'
  }

  // Función para calcular la edad al fallecer
  const calcularEdad = (person: any) => {
    if (!person.birthYear || !person.deathYear) {
      return null
    }
    
    const birthDate = {
      year: person.birthYear,
      month: person.birthMonth,
      day: person.birthDay
    }
    
    const deathDate = {
      year: person.deathYear,
      month: person.deathMonth,
      day: person.deathDay
    }
    
    return calculateYearsBetween(birthDate, deathDate)
  }

  // Función para formatear el nombre completo
  const formatearNombre = (person: any) => {
    const parts = []
    if (person.firstName) parts.push(person.firstName)
    if (person.lastName) parts.push(person.lastName)
    return parts.join(' ') || 'Sin nombre'
  }

  return (
    <section>
      <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
      <div className="glass-effect rounded-lg p-6">
        <div className="space-y-4">
          {obituarios.map((persona) => {
            const edad = calcularEdad(persona)
            const fechaMuerte = formatPartialDate(
              {
                year: persona.deathYear,
                month: persona.deathMonth,
                day: persona.deathDay
              },
              { monthFormat: 'long', includeDay: true }
            )
            
            return (
              <Link 
                key={persona.id} 
                href={`/personas/${persona.slug}`}
                className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0 hover:bg-gray-800/30 transition-colors rounded-lg p-2 -m-2"
              >
                <div className="w-24 h-24 rounded-full flex-shrink-0 overflow-hidden bg-gray-800">
                  {persona.photoUrl ? (
                    <img 
                      src={persona.photoUrl} 
                      alt={formatearNombre(persona)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white text-lg hover:text-cine-accent transition-colors">
                    {formatearNombre(persona)}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {formatearRoles(persona)} 
                    {edad && ` • ${edad} años`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {persona.birthYear && `${persona.birthYear} - ${persona.deathYear}`}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Murió el {fechaMuerte}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/listados/personas?hasDeathDate=true&sortBy=deathDate&sortOrder=desc"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más obituarios
        </Link>
      </div>
    </section>
  );
}