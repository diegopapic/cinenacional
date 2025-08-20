// src/constants/homeData.ts
import { HeroMovie, Obituario, Efemeride } from '@/types/home.types';

export const PELICULAS_HERO: HeroMovie[] = [
  { 
    id: 1, 
    titulo: "El Secreto de Sus Ojos", 
    año: "2009", 
    genero: "Drama, Thriller", 
    director: "Juan José Campanella", 
    imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format" 
  },
  { 
    id: 2, 
    titulo: "Relatos Salvajes", 
    año: "2014", 
    genero: "Comedia negra", 
    director: "Damián Szifron", 
    imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format" 
  },
  { 
    id: 3, 
    titulo: "Argentina, 1985", 
    año: "2022", 
    genero: "Drama histórico", 
    director: "Santiago Mitre", 
    imagen: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format" 
  },
  { 
    id: 4, 
    titulo: "La Ciénaga", 
    año: "2001", 
    genero: "Drama", 
    director: "Lucrecia Martel", 
    imagen: "https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format" 
  },
  { 
    id: 5, 
    titulo: "Nueve Reinas", 
    año: "2000", 
    genero: "Thriller", 
    director: "Fabián Bielinsky", 
    imagen: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format" 
  }
];

export const OBITUARIOS: Obituario[] = [
  { 
    id: 1, 
    nombre: "Luis Brandoni", 
    rol: "Actor", 
    edad: "85 años", 
    fecha: "5 de junio", 
    imagen: "/images/persons/luis-brandoni.jpg" 
  },
  { 
    id: 2, 
    nombre: "María Vaner", 
    rol: "Actriz", 
    edad: "90 años", 
    fecha: "28 de mayo", 
    imagen: "/images/persons/maria-vaner.jpg" 
  }
];

export const EFEMERIDES: Efemeride[] = [
  { 
    hace: "Hace 40 años", 
    evento: 'se estrenaba "Camila" de María Luisa Bemberg', 
    tipo: "pelicula", 
    imagen: "/images/movies/camila.jpg" 
  },
  { 
    hace: "Hace 50 años", 
    evento: "nacía el director Juan José Campanella", 
    tipo: "persona", 
    imagen: "/images/persons/juan-jose-campanella.jpg" 
  }
];