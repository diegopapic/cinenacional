// src/lib/utils/efemerides.ts - ACTUALIZADO CON SOPORTE PARA MÚLTIPLES DIRECTORES

import { Efemeride, DirectorInfo } from '@/types/home.types';

export interface EfemerideData {
  tipo: 'pelicula' | 'persona';
  fecha: Date;
  año: number;
  mes: number;
  dia: number;
  titulo?: string;
  nombre?: string;
  tipoEvento: 'estreno' | 'inicio_rodaje' | 'fin_rodaje' | 'nacimiento' | 'muerte';
  slug?: string;
  posterUrl?: string;
  photoUrl?: string;
  director?: string; // Mantiene compatibilidad - nombre concatenado
  directorSlug?: string; // Mantiene compatibilidad - slug del primero
  directors?: DirectorInfo[]; // Nuevo: array de directores
}

export function calcularAniosDesde(año: number, mes: number, dia: number): number | null {
  const hoy = new Date();
  const añosTranscurridos = hoy.getFullYear() - año;
  
  if (añosTranscurridos < 0) {
    return null;
  }
  
  return añosTranscurridos;
}

/**
 * Formatea los nombres de directores para mostrar en texto
 * Ej: "Fabián Bielinsky" o "Juan Pérez y María García" o "A, B y C"
 */
function formatDirectorNames(directors: DirectorInfo[]): string {
  if (!directors || directors.length === 0) return '';
  
  if (directors.length === 1) {
    return directors[0].name;
  }
  
  if (directors.length === 2) {
    return `${directors[0].name} y ${directors[1].name}`;
  }
  
  // 3 o más: "A, B y C"
  const allButLast = directors.slice(0, -1).map(d => d.name).join(', ');
  const last = directors[directors.length - 1].name;
  return `${allButLast} y ${last}`;
}

export function formatearEfemeride(data: EfemerideData): Efemeride | null {
  const añosDesde = calcularAniosDesde(data.año, data.mes, data.dia);
  
  // ✅ CORRECCIÓN: <= 0 para excluir año actual
  if (añosDesde === null || añosDesde <= 0) return null;
  
  // Determinar el texto de directores
  const directorText = data.directors && data.directors.length > 0
    ? formatDirectorNames(data.directors)
    : data.director || '';
  
  let evento = '';
  
  if (data.tipo === 'pelicula') {
    switch (data.tipoEvento) {
      case 'estreno':
        evento = `se estrenaba "${data.titulo}"${directorText ? `, de ${directorText}` : ''}`;
        break;
      case 'inicio_rodaje':
        evento = `empezaba el rodaje de "${data.titulo}"${directorText ? `, de ${directorText}` : ''}`;
        break;
      case 'fin_rodaje':
        evento = `terminaba el rodaje de "${data.titulo}"${directorText ? `, de ${directorText}` : ''}`;
        break;
    }
  } else if (data.tipo === 'persona') {
    switch (data.tipoEvento) {
      case 'nacimiento':
        evento = `nacía ${data.nombre}`;
        break;
      case 'muerte':
        evento = `moría ${data.nombre}`;
        break;
    }
  }
  
  return {
    id: `${data.tipo}-${data.tipoEvento}-${data.slug || data.año}`,
    tipo: data.tipo,
    hace: `Hace ${añosDesde} ${añosDesde === 1 ? 'año' : 'años'}`,
    evento,
    fecha: new Date(data.año, data.mes - 1, data.dia),
    slug: data.slug,
    posterUrl: data.posterUrl,
    photoUrl: data.photoUrl,
    titulo: data.tipo === 'pelicula' ? data.titulo : data.nombre,
    director: directorText, // Texto concatenado para compatibilidad
    directorSlug: data.directorSlug || (data.directors?.[0]?.slug), // Slug del primero
    directors: data.directors, // Array completo
    tipoEvento: data.tipoEvento
  };
}