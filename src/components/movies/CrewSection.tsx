// src/components/movies/CrewSection.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CrewMember {
  name: string;
  role: string;
  personSlug?: string;
  creditedAs?: string | null;
  gender?: string | null;
}

interface CrewDepartment {
  [department: string]: CrewMember[];
}

interface CrewSectionProps {
  basicCrew: CrewDepartment;
  fullCrew?: CrewDepartment;
}

function getCreditedLabel(gender?: string | null): string {
  return gender === 'FEMALE' ? 'Acreditada' : 'Acreditado';
}

export function CrewSection({ basicCrew, fullCrew }: CrewSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const hasBasicCrew = Object.keys(basicCrew).length > 0;
  const hasMore = fullCrew && Object.keys(fullCrew).length > 0;

  if (!hasBasicCrew && !hasMore) return null;

  const toggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setExpanded(prev => !prev);
      setTimeout(() => setIsAnimating(false), 20);
    }, 150);
  };

  // Render nombre como Link o span
  const renderName = (member: CrewMember, className: string) => {
    if (member.personSlug) {
      return (
        <Link
          href={`/persona/${member.personSlug}`}
          className={`${className} transition-colors hover:text-accent`}
        >
          {member.name}
        </Link>
      );
    }
    return <span className={className}>{member.name}</span>;
  };

  // Render crédito alternativo
  const renderCredit = (member: CrewMember) => {
    if (!member.creditedAs) return null;
    return (
      <span className="block text-[10px] italic text-muted-foreground/30">
        ({getCreditedLabel(member.gender)} como: {member.creditedAs})
      </span>
    );
  };

  // Vista colapsada: solo jefes de departamento
  const renderCollapsed = () => (
    <div className="columns-1 gap-x-8 md:columns-3 lg:columns-4">
      {Object.entries(basicCrew).map(([dept, members]) => {
        if (members.length === 0) return null;
        return (
          <div key={dept} className="mb-3 break-inside-avoid">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
              {dept}
            </h4>
            {members.map((member, i) => (
              <div key={i}>
                {renderName(member, 'block text-[13px] leading-snug text-foreground/80 md:text-sm')}
                {renderCredit(member)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  // Vista expandida: todos los miembros con roles
  const renderExpanded = () => {
    if (!fullCrew) return null;
    return (
      <div className="columns-1 gap-x-10 md:columns-2 lg:columns-3">
        {Object.entries(fullCrew).map(([dept, members]) => {
          if (members.length === 0) return null;
          return (
            <div key={dept} className="mb-5 break-inside-avoid">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
                {dept}
              </h4>
              <div className="mt-1.5 flex flex-col gap-1">
                {members.map((member, i) => (
                  <div key={i}>
                    <div className="flex items-baseline gap-1.5">
                      {renderName(member, 'text-[13px] text-foreground/80 md:text-sm')}
                      <span className="text-[11px] text-muted-foreground/35">{member.role}</span>
                    </div>
                    {renderCredit(member)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Equipo técnico</h2>
        {hasMore && (
          <button
            onClick={toggle}
            className="shrink-0 text-xs tracking-wide text-muted-foreground/50 transition-colors hover:text-accent"
          >
            {expanded ? 'Ver menos' : 'Ver equipo completo'}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
        <div
          className="transition-opacity duration-150"
          style={{ opacity: isAnimating ? 0 : 1 }}
        >
          {expanded ? renderExpanded() : renderCollapsed()}
        </div>
      </div>
    </div>
  );
}
