// src/components/movies/CastSection.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CastMember {
  name: string;
  character: string;
  image?: string;
  personId?: number;
  isPrincipal?: boolean;
  billingOrder?: number;
}

interface CastSectionProps {
  mainCast: CastMember[];
  fullCast?: CastMember[];
}

export function CastSection({ mainCast, fullCast = [] }: CastSectionProps) {
  const [showFullCast, setShowFullCast] = useState(false);

  // Si no hay cast, no mostrar nada
  if (mainCast.length === 0 && fullCast.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-cine-accent">Reparto</h3>
        <p className="text-gray-400">No hay información de reparto disponible.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-4 text-cine-accent">
        {mainCast.length > 0 ? 'Reparto Principal' : 'Reparto'}
      </h3>
      
      {/* Main Cast */}
      {mainCast.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mainCast.map((actor, index) => (
            <div key={`main-${index}`} className="text-center">
              <div className="w-20 h-20 rounded-full person-placeholder mx-auto mb-2">
                {actor.image ? (
                  <img 
                    src={actor.image} 
                    alt={actor.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                )}
              </div>
              {actor.personId ? (
                <Link href={`/personas/${actor.personId}`} className="hover:text-cine-accent transition-colors">
                  <p className="font-medium text-white">{actor.name}</p>
                </Link>
              ) : (
                <p className="font-medium text-white">{actor.name}</p>
              )}
              <p className="text-sm text-gray-400">{actor.character}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Full Cast (if provided) */}
      {fullCast.length > 0 && (
        <>
          {showFullCast && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-700 animate-fade-in">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Reparto Completo</h4>
              </div>
              {fullCast.map((actor, index) => (
                <div key={`full-${index}`} className="text-center">
                  <div className="w-16 h-16 rounded-full person-placeholder mx-auto mb-2">
                    {actor.image ? (
                      <img 
                        src={actor.image} 
                        alt={actor.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    )}
                  </div>
                  {actor.personId ? (
                    <Link href={`/personas/${actor.personId}`} className="hover:text-cine-accent transition-colors">
                      <p className="font-medium text-white text-sm">{actor.name}</p>
                    </Link>
                  ) : (
                    <p className="font-medium text-white text-sm">{actor.name}</p>
                  )}
                  <p className="text-xs text-gray-400">{actor.character}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6">
            <button 
              onClick={() => setShowFullCast(!showFullCast)}
              className="text-cine-accent hover:text-blue-300 font-medium transition-colors flex items-center space-x-2"
            >
              <span>{showFullCast ? 'Ocultar reparto completo' : `Ver reparto completo (${fullCast.length} más)`}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showFullCast ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}