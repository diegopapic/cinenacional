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

export interface Efemeride {
  hace: string;
  evento: string;
  tipo: 'pelicula' | 'persona';
  imagen: string;
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