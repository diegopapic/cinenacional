// src/types/home.types.ts
export interface MovieWithRelease {
  id: number;
  slug: string;
  title: string;
  releaseYear: number | null;
  releaseMonth: number | null;
  releaseDay: number | null;
  posterUrl: string | null;
  genres: Array<{
    genre?: { id: number; name: string };
    id?: number;
    name?: string;
  }>;
  crew?: Array<{
    person: {
      id: number;
      firstName?: string;
      lastName?: string;
    };
    roleId?: number;
    role?: string;
    department?: string;
  }>;
}

export interface HeroMovie {
  id: number;
  titulo: string;
  año: string;
  genero: string;
  director: string;
  imagen: string;
}

export interface Obituario {
  id: number;
  slug: string;
  firstName?: string | null;
  lastName?: string | null;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  photoUrl?: string | null;
  _count?: {
    links: number;
    castRoles: number;
    crewRoles: number;
  };
}

// Interfaz para un director individual
export interface DirectorInfo {
  name: string;
  slug: string;
}

export interface Efemeride {
  id: string; // Único para cada efeméride
  tipo: 'pelicula' | 'persona';
  hace: string; // "Hace 23 años"
  evento: string; // "se estrenaba Nueve Reinas, de Fabián Bielinsky"
  fecha: Date; // Para ordenamiento
  slug?: string; // Para enlaces
  posterUrl?: string; // Para películas
  photoUrl?: string; // Para personas
  titulo?: string; // Título de película o nombre de persona
  director?: string; // Nombre del director (o directores concatenados) - mantiene compatibilidad
  directorSlug?: string; // Slug del primer director - mantiene compatibilidad
  directors?: DirectorInfo[]; // Array de todos los directores con nombre y slug
  tipoEvento?: 'estreno' | 'inicio_rodaje' | 'fin_rodaje' | 'nacimiento' | 'muerte';
}

export interface SimpleMovie {
  id: number;
  titulo: string;
}

export interface SimplePerson {
  id: number;
  nombre: string;
  rol: string;
}

export interface SimpleMovie {
  id: number;
  slug: string;
  title: string;
  posterUrl?: string | null;
}

export interface SimplePerson {
  id: number;
  slug: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string | null;
  role?: string;
}

export interface HomeDataResponse {
  ultimosEstrenos: MovieWithRelease[];
  proximosEstrenos: MovieWithRelease[];
  ultimasPeliculas: SimpleMovie[];
  ultimasPersonas: SimplePerson[];
}