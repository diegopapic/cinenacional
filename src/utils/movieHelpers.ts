// src/utils/movieHelpers.ts
import { MovieWithRelease } from '@/types/home.types';

export const obtenerDirector = (movie: MovieWithRelease): string => {
  if (movie.crew && movie.crew.length > 0) {
    const director = movie.crew.find((c) => c.roleId === 2);
    if (director?.person) {
      const firstName = director.person.firstName || '';
      const lastName = director.person.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
    }
  }
  return 'Director no especificado';
};

export const obtenerGeneros = (movie: MovieWithRelease): string => {
  if (movie.genres && movie.genres.length > 0) {
    const genreNames = movie.genres
      .map((g) => g.genre?.name || g.name || null)
      .filter(Boolean);

    if (genreNames.length > 0) {
      return genreNames.slice(0, 2).join(', ');
    }
  }
  return '';
};