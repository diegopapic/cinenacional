// TMDB API Configuration
// Documentación: https://developer.themoviedb.org/docs

import * as path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env en la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // API Read Access Token (Bearer token)
  tmdbAccessToken: process.env.TMDB_ACCESS_TOKEN || '',

  // API Key (v3 auth) - alternativa
  tmdbApiKey: process.env.TMDB_API_KEY || '',

  // API Key de Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Base URLs
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  
  // Database connection (para scripts standalone)
  databaseUrl: process.env.DATABASE_URL || 'postgresql://cinenacional:Paganitzu@localhost:5433/cinenacional',
  
  // Rate limiting
  requestsPerSecond: 35, // TMDB permite ~40, dejamos margen
  delayBetweenRequests: 30, // ms entre requests
  
  // Matching thresholds
  matching: {
    // Para personas
    person: {
      autoAcceptScore: 80,    // Score >= 80: aceptar automáticamente
      reviewScore: 50,         // Score 50-79: marcar para revisión
      rejectScore: 49,         // Score < 50: rechazar
    },
    // Para películas
    movie: {
      exactTitleYearBonus: 50,
      directorMatchBonus: 30,
      argentinaCountryBonus: 20,
      durationToleranceMinutes: 5,
      durationMatchBonus: 10,
    }
  },
  
  // IDs conocidos
  roles: {
    director: 2, // role_id para Director
  },
  
  // Países
  countries: {
    argentina: {
      tmdbCode: 'AR',
      iso: 'AR',
    }
  }
};

export default config;
