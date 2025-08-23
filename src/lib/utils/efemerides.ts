import { Efemeride } from '@/types/home.types';

export interface EfemerideData {
  tipo: 'pelicula' | 'persona';
  fecha: Date;
  año: number;
  mes: number;
  dia: number;
  titulo?: string; // Para películas
  nombre?: string; // Para personas
  tipoEvento: 'estreno' | 'inicio_rodaje' | 'fin_rodaje' | 'nacimiento' | 'muerte';
  slug?: string;
  posterUrl?: string;
  photoUrl?: string;
  director?: string; // Para películas
  directorSlug?: string;
}

export function calcularAniosDesde(año: number, mes: number, dia: number): number | null {
  const hoy = new Date();
  const fechaEvento = new Date(año, mes - 1, dia);
  
  // Verificar si es el mismo día y mes
  if (hoy.getDate() !== dia || hoy.getMonth() !== mes - 1) {
    return null;
  }
  
  return hoy.getFullYear() - año;
}

export function formatearEfemeride(data: EfemerideData): Efemeride | null {
  const añosDesde = calcularAniosDesde(data.año, data.mes, data.dia);
  
  if (!añosDesde || añosDesde <= 0) return null;
  
  let evento = '';
  
  if (data.tipo === 'pelicula') {
    switch (data.tipoEvento) {
      case 'estreno':
        evento = `se estrenaba "${data.titulo}"${data.director ? `, de ${data.director}` : ''}`;
        break;
      case 'inicio_rodaje':
        evento = `empezaba el rodaje de "${data.titulo}"${data.director ? `, de ${data.director}` : ''}`;
        break;
      case 'fin_rodaje':
        evento = `terminaba el rodaje de "${data.titulo}"${data.director ? `, de ${data.director}` : ''}`;
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
    // Nuevos campos
    titulo: data.tipo === 'pelicula' ? data.titulo : data.nombre,
    director: data.director,
    directorSlug: data.directorSlug,
    tipoEvento: data.tipoEvento
  };
}