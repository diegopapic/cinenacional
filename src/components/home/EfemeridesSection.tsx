import Link from 'next/link';
import Image from 'next/image';
import { Efemeride } from '@/types/home.types';

interface EfemeridesSectionProps {
  efemerides: Efemeride[];
}

export default function EfemeridesSection({ efemerides }: EfemeridesSectionProps) {
  if (!efemerides || efemerides.length === 0) {
    return null; // No mostrar la sección si no hay efemérides
  }

  return (
    <section>
      <h2 className="serif-heading text-3xl mb-6 text-white">Efemérides del Día</h2>
      <div className="glass-effect rounded-lg p-6">
        <div className="space-y-4">
          {efemerides.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
              <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
                {item.tipo === "pelicula" ? (
                  <div className="w-16 h-24 rounded movie-placeholder">
                    <svg className="w-8 h-8 text-cine-accent opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full person-placeholder">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-cine-accent text-lg">{item.hace}</h3>
                <p className="text-sm mt-1 text-gray-300">... {item.evento}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/efemerides"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más efemérides
        </Link>
      </div>
    </section>
  );
}