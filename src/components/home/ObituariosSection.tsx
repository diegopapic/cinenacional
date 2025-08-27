// src/components/home/ObituariosSection.tsx
import Link from 'next/link';
import { formatPartialDate, calculateYearsBetween } from '@/lib/shared/dateUtils';

interface ObituariosSectionProps {
  obituarios: any[];
  loading?: boolean; // Agregar prop loading como opcional
}

export default function ObituariosSection({ obituarios, loading = false }: ObituariosSectionProps) {
  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <section>
        <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
        <div className="glass-effect rounded-lg p-6">
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                <div className="w-24 h-24 rounded-full flex-shrink-0 bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-800 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si no hay obituarios, no mostrar la sección
  if (!obituarios || obituarios.length === 0) {
    return null;
  }

  // Función para calcular la edad al fallecer
  const calcularEdad = (person: any) => {
    if (!person.birthYear || !person.deathYear) {
      return null;
    }
    
    const birthDate = {
      year: person.birthYear,
      month: person.birthMonth,
      day: person.birthDay
    };
    
    const deathDate = {
      year: person.deathYear,
      month: person.deathMonth,
      day: person.deathDay
    };
    
    return calculateYearsBetween(birthDate, deathDate);
  };

  // Función para formatear el nombre completo
  const formatearNombre = (person: any) => {
    const parts = [];
    if (person.firstName) parts.push(person.firstName);
    if (person.lastName) parts.push(person.lastName);
    return parts.join(' ') || 'Sin nombre';
  };

  return (
    <section>
      <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
      <div className="glass-effect rounded-lg p-6">
        <div className="space-y-4">
          {obituarios.map((persona) => {
            const edad = calcularEdad(persona);
            
            return (
              <Link 
                key={persona.id} 
                href={`/persona/${persona.slug}`}
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
                    {persona.birthYear && persona.deathYear && (
                      <>
                        {persona.birthYear} - {persona.deathYear}
                        {edad && ` (${edad} años)`}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      {/*
      <div className="mt-6 text-center">
        <Link
          href="/listados/personas?hasDeathDate=true&sortBy=deathDate&sortOrder=desc"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más obituarios
        </Link>
      </div>
      */}
    </section>
  );
}