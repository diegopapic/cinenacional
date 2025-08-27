// src/components/movies/CrewSection.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CrewMember {
  name: string;
  role: string;
  personSlug?: string;
}

interface CrewDepartment {
  [department: string]: CrewMember[];
}

interface CrewSectionProps {
  basicCrew: CrewDepartment;
  fullCrew?: CrewDepartment;
}

export function CrewSection({ basicCrew, fullCrew }: CrewSectionProps) {
  const [showFullCrew, setShowFullCrew] = useState(false);

  const renderCrewMember = (member: CrewMember, index: number, showRole: boolean = false) => {
    // Crear el elemento del nombre con o sin enlace
    const nameElement = member.personSlug ? (
      <Link 
        href={`/persona/${member.personSlug}`} 
        className="text-white hover:text-cine-accent transition-colors"
      >
        {member.name}
      </Link>
    ) : (
      <span className="text-white">{member.name}</span>
    );

    if (showRole) {
      return (
        <div key={index} className="flex justify-between">
          {nameElement}
          <span className="text-gray-400 text-xs">{member.role}</span>
        </div>
      );
    }
    
    // IMPORTANTE: Cambiar aquí para que el enlace funcione sin roles
    return (
      <div key={index}>
        {nameElement}
      </div>
    );
  };

  const renderDepartment = (title: string, members: CrewMember[], showRoles: boolean = false) => (
    <div>
      <h4 className="text-gray-400 font-medium mb-2">{title}</h4>
      <div className="ml-4 space-y-1">
        {members.map((member, index) => renderCrewMember(member, index, showRoles))}
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-medium mb-4 text-cine-accent">Equipo Técnico</h3>
      
      {!showFullCrew ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            {Object.entries(basicCrew).slice(0, Math.ceil(Object.keys(basicCrew).length / 2)).map(([dept, members]) => (
              <div key={dept}>
                {renderDepartment(dept, members, false)} {/* false = no mostrar roles */}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {Object.entries(basicCrew).slice(Math.ceil(Object.keys(basicCrew).length / 2)).map(([dept, members]) => (
              <div key={dept}>
                {renderDepartment(dept, members, false)} {/* false = no mostrar roles */}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm animate-fade-in">
          <div className="space-y-4">
            {fullCrew && Object.entries(fullCrew).slice(0, Math.ceil(Object.keys(fullCrew).length / 2)).map(([dept, members]) => (
              <div key={dept}>
                {renderDepartment(dept, members, true)} {/* true = mostrar roles */}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {fullCrew && Object.entries(fullCrew).slice(Math.ceil(Object.keys(fullCrew).length / 2)).map(([dept, members]) => (
              <div key={dept}>
                {renderDepartment(dept, members, true)} {/* true = mostrar roles */}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {fullCrew && Object.keys(fullCrew).length > 0 && (
        <div className="mt-6">
          <button 
            onClick={() => setShowFullCrew(!showFullCrew)}
            className="text-cine-accent hover:text-blue-300 font-medium transition-colors flex items-center space-x-2"
          >
            <span>{showFullCrew ? 'Ocultar equipo técnico completo' : 'Ver equipo técnico completo'}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showFullCrew ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}