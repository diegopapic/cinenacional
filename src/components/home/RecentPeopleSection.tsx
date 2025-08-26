// src/components/home/RecentPeopleSection.tsx
import Link from 'next/link';
import { SimplePerson } from '@/types/home.types';
import SkeletonLoader from './SkeletonLoader';

interface RecentPeopleSectionProps {
  people: SimplePerson[];
  loading: boolean;
}

export default function RecentPeopleSection({ people, loading }: RecentPeopleSectionProps) {
  const formatPersonName = (person: SimplePerson): string => {
    const parts = [];
    if (person.firstName) parts.push(person.firstName);
    if (person.lastName) parts.push(person.lastName);
    return parts.join(' ') || 'Sin nombre';
  };

  const getPersonRole = (person: SimplePerson): string => {
    // Esto podría venir del backend basado en sus roles más frecuentes
    return person.role || 'Profesional del cine';
  };

  return (
    <section className="mb-12">
      <h2 className="serif-heading text-3xl mb-6 text-white">Últimas Personas Ingresadas</h2>
      
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, index) => (
            <SkeletonLoader key={index} type="person" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay personas recientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {people.map((persona) => (
            <Link
              key={persona.id}
              href={`/personas/${persona.slug}`}
              className="text-center cursor-pointer group"
            >
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-2 person-placeholder group-hover:ring-2 group-hover:ring-cine-accent transition-all">
                {persona.photoUrl ? (
                  <img
                    src={persona.photoUrl}
                    alt={formatPersonName(persona)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('person-placeholder');
                    }}
                  />
                ) : (
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <h3 className="text-sm font-medium text-white group-hover:text-cine-accent transition-colors">
                {formatPersonName(persona)}
              </h3>
              <p className="text-xs text-gray-400">{getPersonRole(persona)}</p>
            </Link>
          ))}
        </div>
      )}
{/*
      <div className="mt-6 text-center">
        <Link
          href="/listados/personas?sort=createdAt"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más personas recientes
        </Link>
      </div>
      */}
    </section>
  );
}