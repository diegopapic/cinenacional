// src/components/home/ObituariosSection.tsx
import Link from 'next/link';
import { Obituario } from '@/types/home.types';

interface ObituariosSectionProps {
  obituarios: Obituario[];
}

export default function ObituariosSection({ obituarios }: ObituariosSectionProps) {
  return (
    <section>
      <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
      <div className="glass-effect rounded-lg p-6">
        <div className="space-y-4">
          {obituarios.map((persona) => (
            <div key={persona.id} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
              <div className="w-24 h-24 rounded-full flex-shrink-0 person-placeholder">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white text-lg">{persona.nombre}</h3>
                <p className="text-sm text-gray-400">{persona.rol} • {persona.edad}</p>
                <p className="text-sm text-gray-500">{persona.fecha}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/obituarios"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más obituarios
        </Link>
      </div>
    </section>
  );
}